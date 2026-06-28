'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, ScanBarcode, Zap, ZapOff, Loader2, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';

// Función helper para reproducir el pitido (beep) de escaneo exitoso usando Web Audio API
const playScanBeep = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(900, audioCtx.currentTime); // Frecuencia de 900Hz (agudo)
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime); // Volumen moderado

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.08); // Duración corta de 80ms
  } catch (err) {
    console.warn('No se pudo reproducir el bip de audio:', err);
  }
};

export default function SearchModal() {
  const router = useRouter();
  const { isSearchOpen, setIsSearchOpen } = useCart();
  const [localQuery, setLocalQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [isScannerLoading, setIsScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);

  const inputRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const searchDebounceRef = useRef(null);

  // Auto-enfocar el input cuando se abre el modal y no está el escáner activo
  useEffect(() => {
    if (isSearchOpen && !isScannerActive && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, [isSearchOpen, isScannerActive]);

  // Manejar el debounce de búsqueda manual
  useEffect(() => {
    if (!localQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(localQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.products || []);
        }
      } catch (err) {
        console.error('Error buscando productos:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [localQuery]);

  // Limpiar y detener escáner al desmontar o cerrar
  useEffect(() => {
    if (!isSearchOpen && isScannerActive) {
      stopScanner();
    }
  }, [isSearchOpen]);

  // Encender/apagar cámara escáner
  const handleToggleScanner = async () => {
    if (isScannerActive) {
      await stopScanner();
    } else {
      await startScanner();
    }
  };

  const startScanner = async () => {
    setIsScannerLoading(true);
    setScannerError(null);
    setScanMessage(null);
    setIsFlashOn(false);

    try {
      // 1. Validar primero si el navegador tiene soporte básico para APIs de media
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Su navegador no soporta el acceso a la cámara.');
      }

      // 2. FORZAR LA SOLICITUD DE PERMISOS NATIVA AL USUARIO
      // Esto gatilla el popup estándar "gloss.pe quiere acceder a tu cámara" en iOS y Android.
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        // Detener inmediatamente el stream temporal para liberar el dispositivo y apagar el lente
        stream.getTracks().forEach(track => track.stop());
      } catch (permissionErr) {
        console.error('El usuario denegó los permisos de cámara:', permissionErr);
        throw new Error('PERMISO_DENEGADO');
      }

      // Pequeño timeout para asegurar que el elemento DOM para renderizar la cámara ya esté montado
      await new Promise((resolve) => setTimeout(resolve, 250));

      const html5QrCode = new Html5Qrcode('scanner-viewport');
      html5QrCodeRef.current = html5QrCode;

      // 3. Una vez que ya tenemos permisos otorgados por getUserMedia,
      // podemos listar con getCameras() de forma 100% segura para identificar la cámara trasera
      let cameraSelection = { facingMode: 'environment' };
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          // Elegir la trasera buscando palabras clave en su etiqueta
          const backCamera = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('trasera')
          );
          if (backCamera) {
            cameraSelection = backCamera.id;
          } else if (devices.length > 1) {
            cameraSelection = devices[devices.length - 1].id;
          } else {
            cameraSelection = devices[0].id;
          }
        }
      } catch (camListErr) {
        console.warn('No se pudo enumerar las cámaras con getCameras(), usando facingMode por defecto:', camListErr);
      }

      const config = {
        fps: 15,
        qrbox: (width, height) => {
          const boxWidth = Math.min(width * 0.8, 300);
          const boxHeight = Math.min(height * 0.4, 160);
          return { width: boxWidth, height: boxHeight };
        },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        cameraSelection,
        config,
        async (decodedText, decodedResult) => {
          // Escaneo exitoso!
          playScanBeep();
          
          // Detener el escáner inmediatamente para evitar procesamientos duplicados
          await stopScanner();

          setScanMessage({ type: 'success', text: `Código detectado: ${decodedText}. Buscando...` });
          
          // Procesar el código escaneado
          await handleProcessScannedCode(decodedText);
        },
        (errorMessage) => {
          // Callback de error por cada frame analizado
        }
      );

      setIsScannerActive(true);
    } catch (err) {
      console.error('Error al iniciar el escáner de cámara:', err);
      
      // Validar si el sitio se está sirviendo por HTTP inseguro
      if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setScannerError('El acceso a la cámara requiere una conexión segura HTTPS. Por favor, ingresa usando la URL HTTPS.');
      } else if (err.message === 'PERMISO_DENEGADO') {
        setScannerError('Permiso de cámara denegado. Por favor, ve a la configuración de tu navegador y concede permisos de cámara para este sitio web.');
      } else {
        setScannerError('No pudimos acceder a tu cámara. Por favor, asegúrate de conceder permisos de cámara en tu navegador e intenta de nuevo.');
      }
      setIsScannerActive(false);
    } finally {
      setIsScannerLoading(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.error('Error deteniendo html5QrCode:', err);
      } finally {
        html5QrCodeRef.current = null;
      }
    }
    setIsScannerActive(false);
    setIsFlashOn(false);
  };

  // Encender / Apagar Linterna (Torch)
  const handleToggleFlash = async () => {
    if (!html5QrCodeRef.current || !html5QrCodeRef.current.isScanning) return;
    
    try {
      const nextFlashState = !isFlashOn;
      // html5-qrcode aplica video constraints para activar el flash
      const track = html5QrCodeRef.current.getVideoTrack();
      if (track && typeof track.getCapabilities === 'function') {
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: nextFlashState }]
          });
          setIsFlashOn(nextFlashState);
        } else {
          alert('Tu dispositivo no soporta linterna a través del navegador.');
        }
      } else {
        alert('Linterna no disponible.');
      }
    } catch (err) {
      console.error('Error controlando la linterna:', err);
    }
  };

  // Procesar código leído (QR o Código de barras)
  const handleProcessScannedCode = async (code) => {
    setIsSearching(true);
    try {
      // 1. Si es un código QR con formato de URL de nuestra tienda
      if (code.includes('gloss.pe/product/') || code.includes('/product/')) {
        const parts = code.split('/product/');
        if (parts.length > 1) {
          const productId = parts[1].split(/[#?]/)[0]; // Limpiar hashes o parámetros de query
          router.push(`/product/${productId}`);
          setIsSearchOpen(false);
          return;
        }
      }

      // 2. Buscar en el catálogo
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        const foundProducts = data.products || [];

        // Buscar coincidencia exacta por el código de barras (codart/código de barras)
        const exactMatch = foundProducts.find(
          (p) => 
            String(p.id).toLowerCase() === code.toLowerCase() ||
            String(p.codart).toLowerCase() === code.toLowerCase() ||
            (p.barcode && String(p.barcode).toLowerCase() === code.toLowerCase())
        );

        if (exactMatch) {
          // Si encontramos el producto exacto, redirigimos de inmediato
          router.push(`/product/${exactMatch.id}`);
          setIsSearchOpen(false);
        } else if (foundProducts.length === 1) {
          // Si solo hay un resultado aproximado, redirigimos directamente también
          router.push(`/product/${foundProducts[0].id}`);
          setIsSearchOpen(false);
        } else if (foundProducts.length > 1) {
          // Si hay múltiples referencias asociadas al código, las mostramos en la lista
          setResults(foundProducts);
          setLocalQuery(code); // Rellenar input con el código escaneado
          setScanMessage({ type: 'info', text: `Encontradas ${foundProducts.length} referencias para el código escaneado.` });
        } else {
          // Si no encontramos nada
          setScanMessage({ type: 'error', text: 'El producto escaneado no está registrado en el catálogo. Reanudando escáner...' });
          
          // Esperamos 3.5 segundos para que el usuario lea el mensaje y reiniciamos el escáner de forma cómoda
          setTimeout(async () => {
            setScanMessage(null);
            await startScanner();
          }, 3500);
        }
      } else {
        throw new Error('Respuesta no satisfactoria de la API');
      }
    } catch (err) {
      console.error('Error procesando código:', err);
      setScanMessage({ type: 'error', text: 'Error de conexión al consultar el código. Reanudando escáner...' });
      setTimeout(async () => {
        setScanMessage(null);
        await startScanner();
      }, 3500);
    } finally {
      setIsSearching(false);
    }
  };

  // Al hacer clic en un producto del listado
  const handleSelectProduct = (productId) => {
    router.push(`/product/${productId}`);
    setIsSearchOpen(false);
  };

  if (!isSearchOpen) return null;

  return (
    <div className="search-fullscreen-overlay">
      <div className="search-fullscreen-container">
        
        {/* Cabecera del Buscador */}
        <div className="search-fullscreen-header">
          <span className="search-header-title">Buscador Inteligente</span>
          <button 
            className="search-close-btn" 
            onClick={() => {
              stopScanner();
              setIsSearchOpen(false);
            }}
            title="Cerrar buscador"
          >
            <X size={22} />
          </button>
        </div>

        {/* Cuerpo del Buscador */}
        <div className="search-fullscreen-body">
          
          {/* Controles de Entrada */}
          <div className="search-controls-wrapper">
            
            {/* Input de Texto Manual */}
            {!isScannerActive && (
              <div className="search-input-wrapper">
                <Search className="search-input-icon" size={20} />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Buscar cosméticos, marcas, colecciones..."
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  className="search-large-input"
                />
                {localQuery && (
                  <button className="search-clear-input-btn" onClick={() => setLocalQuery('')}>
                    <X size={16} />
                  </button>
                )}
              </div>
            )}

            {/* Mensajes de escaneo / Errores de escáner */}
            {scanMessage && (
              <div className={`scan-message-banner ${scanMessage.type}`}>
                <span>{scanMessage.text}</span>
              </div>
            )}

            {scannerError && (
              <div className="scan-message-banner error">
                <span>{scannerError}</span>
              </div>
            )}

            {/* Zona de Cámara del Escáner (Montado condicionalmente) */}
            {isScannerActive && (
              <div className="scanner-container">
                <div className="scanner-camera-wrapper">
                  <div id="scanner-viewport"></div>
                  
                  {/* Láser de escaneo animado y marco visual */}
                  <div className="scanner-laser-line" />
                  <div className="scanner-overlay-guidelin">
                    <div className="corner top-left" />
                    <div className="corner top-right" />
                    <div className="corner bottom-left" />
                    <div className="corner bottom-right" />
                  </div>
                </div>

                <div className="scanner-instructions">
                  <span>Coloca el código de barras o código QR dentro del recuadro</span>
                </div>

                {/* Botón de control de flash */}
                <button 
                  className={`scanner-flash-btn ${isFlashOn ? 'active' : ''}`}
                  onClick={handleToggleFlash}
                  title="Encender Linterna"
                >
                  {isFlashOn ? <ZapOff size={18} /> : <Zap size={18} />}
                  <span>{isFlashOn ? 'Apagar Luz' : 'Encender Luz'}</span>
                </button>
              </div>
            )}

            {/* Botón Escáner / Cámara Toggle */}
            <button 
              className={`search-scanner-toggle-btn ${isScannerActive ? 'active' : ''}`}
              onClick={handleToggleScanner}
              disabled={isScannerLoading}
            >
              {isScannerLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <ScanBarcode size={18} />
              )}
              <span>{isScannerActive ? 'Volver al buscador manual' : 'Escanear código de barras / QR'}</span>
            </button>
          </div>

          {/* Área de Resultados / Sugerencias */}
          <div className="search-results-area">
            {isSearching && (
              <div className="search-loading-wrapper">
                <Loader2 size={24} className="animate-spin text-accent" />
                <span>Buscando en el catálogo...</span>
              </div>
            )}

            {!isSearching && results.length > 0 && (
              <div className="search-results-list">
                <span className="results-count-label">{results.length} coincidencias encontradas</span>
                {results.map((product) => (
                  <div 
                    key={product.id} 
                    className="search-result-item-card"
                    onClick={() => handleSelectProduct(product.id)}
                  >
                    <div className="result-img-wrapper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={product.image || 'https://via.placeholder.com/80?text=Gloss'} 
                        alt={product.name} 
                      />
                    </div>
                    <div className="result-details">
                      <span className="result-brand">{product.brand || 'Gloss Beauty'}</span>
                      <span className="result-name">{product.name}</span>
                      {product.codart && (
                        <span className="result-code">Cod: {product.codart}</span>
                      )}
                    </div>
                    <div className="result-price-details">
                      <span className="result-price-value">S/ {parseFloat(product.price || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isSearching && localQuery && results.length === 0 && (
              <div className="search-empty-results">
                <Sparkles size={36} color="#CBD5E1" />
                <p>No encontramos ningún producto para "{localQuery}"</p>
                <span>Intenta buscando por otra palabra clave o marca</span>
              </div>
            )}

            {!isSearching && !localQuery && !isScannerActive && (
              <div className="search-placeholder-tip">
                <ScanBarcode size={40} color="#E2E8F0" />
                <h3>Consulta de precios en tienda</h3>
                <p>Usa la cámara de tu celular para escanear el código de barra de los cosméticos y ver su precio exacto e información de manera instantánea.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
