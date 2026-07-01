'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, ArrowLeft, Loader2, CheckCircle2, User, Phone, 
  MapPin, FileText, Store, Truck, Bike, ChevronDown 
} from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart, selectedWarehouse } = useCart();
  const router = useRouter();

  // Estados del Formulario
  const [phone, setPhone] = useState('');
  const [docType, setDocType] = useState('DNI');
  const [docNumber, setDocNumber] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Opciones de Despacho (Nuevas)
  const [deliveryMethod, setDeliveryMethod] = useState('recojo'); // 'recojo' | 'delivery' | 'envio'
  const [warehouses, setWarehouses] = useState([]);
  const [selectedSede, setSelectedSede] = useState('');

  // Estados de UI
  const [isValidatingDoc, setIsValidatingDoc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Control de Dropdowns Personalizados
  const [isDocDropdownOpen, setIsDocDropdownOpen] = useState(false);
  const [isSedeDropdownOpen, setIsSedeDropdownOpen] = useState(false);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => {
      setIsDocDropdownOpen(false);
      setIsSedeDropdownOpen(false);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('click', handleClickOutside);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('click', handleClickOutside);
      }
    };
  }, []);

  // Cargar sedes activas dinámicamente
  useEffect(() => {
    async function loadWarehouses() {
      try {
        const res = await fetch('/api/admin/warehouses');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            // Filtrar solo sedes visibles
            const active = data.warehouses.filter(w => w.visible);
            setWarehouses(active);
            if (active.length > 0) {
              setSelectedSede(active[0].codigo);
            }
          }
        }
      } catch (err) {
        console.error('[Checkout] Error al cargar sedes:', err);
      }
    }
    loadWarehouses();
  }, []);

  // Redireccionar si el carrito está vacío y no estamos en envío exitoso
  useEffect(() => {
    if (cart.length === 0 && !isSubmitting) {
      // router.push('/');
    }
  }, [cart, router, isSubmitting]);

  // Cargar perfil guardado localmente en el dispositivo
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('gloss_profile');
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        if (profile.phone) setPhone(profile.phone);
        if (profile.docType) setDocType(profile.docType);
        if (profile.docNumber) setDocNumber(profile.docNumber);
        if (profile.name) setName(profile.name);
        if (profile.address) setAddress(profile.address);
      }
    } catch (e) {
      console.warn('Error al cargar perfil desde localStorage:', e);
    }
  }, []);

  // Validar DNI/RUC automáticamente al cambiar longitud
  useEffect(() => {
    const num = docNumber.trim();
    if ((docType === 'DNI' && num.length === 8) || (docType === 'RUC' && num.length === 11)) {
      validateDocument(docType, num);
    }
  }, [docNumber, docType]);

  const validateDocument = async (type, number) => {
    setIsValidatingDoc(true);
    setErrorMessage('');
    try {
      const res = await fetch(`/api/validate/document?type=${type}&number=${number}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setName(data.name);
          if (data.address && !address) {
            setAddress(data.address);
          }
        } else {
          setErrorMessage('No se encontraron datos para este documento.');
        }
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || 'Error al validar el documento.');
      }
    } catch (err) {
      console.error('Error validando documento:', err);
      setErrorMessage('Error de conexión al validar.');
    } finally {
      setIsValidatingDoc(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMessage('Tu carrito está vacío.');
      return;
    }
    
    // Si el método es recojo en tienda, no es obligatorio el campo de dirección
    const finalAddress = deliveryMethod === 'recojo'
      ? (() => {
          const w = warehouses.find(wh => wh.codigo === selectedSede);
          return w ? `RECOJO EN TIENDA: ${w.nombre} (Dirección: ${w.direccion})` : `RECOJO EN TIENDA: Sede ${selectedSede}`;
        })()
      : address;

    if (!phone || !docNumber || !name || (deliveryMethod !== 'recojo' && !address)) {
      setErrorMessage('Por favor, completa todos los campos obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const targetWarehouseCode = deliveryMethod === 'recojo' ? selectedSede : selectedWarehouse;

    try {
      // 1. Enviar el pedido a la API de integración
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          docType,
          docNumber,
          name,
          address: finalAddress,
          notes,
          warehouse: targetWarehouseCode,
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            brand: item.brand,
            price: item.price,
            quantity: item.quantity
          })),
          total: cartTotal
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al procesar tu pedido en el servidor.');
      }

      const data = await response.json();

      // 2. Construir el mensaje de WhatsApp estructurado
      const formattedItems = cart.map(item => 
        `• ${item.quantity}x ${item.name} (${item.brand}) - S/ ${(item.price * item.quantity).toFixed(2)}`
      ).join('\n');

      const methodLabel = deliveryMethod === 'recojo'
        ? `Recojo en Tienda (Sede: ${warehouses.find(w => w.codigo === selectedSede)?.nombre || 'Seleccionada'})`
        : deliveryMethod === 'delivery'
          ? 'Delivery Local'
          : 'Envío Nacional / Interprovincial';

      const whatsappMessage = `¡Hola Tienda Gloss! 👋 Acabo de realizar un pedido desde la web.

🛍️ *Pedido Nro:* #${data.nroPedido}
👤 *Cliente:* ${name} (${docType}: ${docNumber})
📱 *WhatsApp:* ${phone}
🚚 *Tipo de Entrega:* ${methodLabel}
📍 *Dirección:* ${finalAddress}
${notes ? `📝 *Nota:* ${notes}\n` : ''}
🛒 *Productos:*
${formattedItems}

💵 *Total a Pagar:* S/ ${cartTotal.toFixed(2)}

*Deseo coordinar el pago y envío por aquí.*`;

      // 3. Obtener el número de WhatsApp corporativo de la respuesta o del .env
      const targetPhone = data.whatsappNumber || '51900000000';
      const encodedText = encodeURIComponent(whatsappMessage);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;

      // 4. Guardar datos de perfil e historial de pedidos localmente
      try {
        const profile = { phone, docType, docNumber, name, address: deliveryMethod === 'recojo' ? '' : address };
        localStorage.setItem('gloss_profile', JSON.stringify(profile));

        const newOrder = {
          nroPedido: data.nroPedido,
          date: new Date().toISOString(),
          name,
          address,
          phone,
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            brand: item.brand,
            price: item.price,
            quantity: item.quantity
          })),
          total: cartTotal,
          whatsappUrl // Guardamos el enlace directo por si necesita reabrirlo
        };
        const existingOrders = JSON.parse(localStorage.getItem('gloss_orders') || '[]');
        localStorage.setItem('gloss_orders', JSON.stringify([newOrder, ...existingOrders]));
      } catch (storageErr) {
        console.warn('Error al guardar historial de compra:', storageErr);
      }

      // 5. Limpiar el carrito
      clearCart();

      // 5. Redireccionar al cliente a WhatsApp
      window.location.href = whatsappUrl;

    } catch (err) {
      console.error('Error al procesar compra:', err);
      setErrorMessage(err.message || 'Ocurrió un error inesperado. Por favor, intenta de nuevo.');
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0 && !isSubmitting) {
    return (
      <div style={styles.container}>
        <div style={styles.topNav}>
          <Link href="/" style={styles.backLink}>
            <ArrowLeft size={20} color="var(--text-primary)" />
            <span style={styles.backText}>Volver al Catálogo</span>
          </Link>
          <h2 style={styles.logo}>Tienda Gloss</h2>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '80px 20px',
          gap: '16px'
        }}>
          <ShoppingBag size={48} color="var(--accent-start)" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.3rem', fontWeight: '500', color: 'var(--text-primary)', margin: 0 }}>Tu carrito de compras está vacío</h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '320px', lineHeight: '1.45', margin: 0 }}>Agrega algunos productos de nuestro catálogo para realizar tu pedido.</p>
          <Link href="/" className="soft-button" style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
            Explorar Catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Barra superior de navegación */}
      <div style={styles.topNav}>
        <Link href="/" style={styles.backLink}>
          <ArrowLeft size={20} color="var(--text-primary)" />
          <span style={styles.backText}>Seguir comprando</span>
        </Link>
        <h2 style={styles.logo}>Tienda Gloss</h2>
      </div>

      <div className="checkout-layout">
        {/* Columna Izquierda: Formulario (Soft UI) */}
        <div style={styles.formColumn}>
          <div style={styles.card} className="soft-card">
            <h3 style={styles.cardTitle}>Datos de Despacho y Facturación</h3>
            <p style={styles.cardSubtitle}>Los campos marcados con * son obligatorios. Validamos tu documento al instante.</p>

            {errorMessage && (
              <div style={styles.errorAlert}>
                <span style={styles.errorText}>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Tipo de Despacho / Entrega */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Método de Entrega *</label>
                <div style={styles.methodSelectorGrid}>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('recojo')}
                    style={{
                      ...styles.methodBtn,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      backgroundColor: deliveryMethod === 'recojo' ? '#F9FAFB' : '#FFFFFF',
                      color: deliveryMethod === 'recojo' ? '#111827' : '#6B7280',
                      border: deliveryMethod === 'recojo' ? '1.5px solid #111827' : '1px solid rgba(142, 154, 167, 0.15)',
                      boxShadow: deliveryMethod === 'recojo' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                      fontWeight: deliveryMethod === 'recojo' ? 700 : 500
                    }}
                  >
                    <Store size={16} color={deliveryMethod === 'recojo' ? '#111827' : '#9CA3AF'} />
                    <span>Recojo en Tienda</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('delivery')}
                    style={{
                      ...styles.methodBtn,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      backgroundColor: deliveryMethod === 'delivery' ? '#F9FAFB' : '#FFFFFF',
                      color: deliveryMethod === 'delivery' ? '#111827' : '#6B7280',
                      border: deliveryMethod === 'delivery' ? '1.5px solid #111827' : '1px solid rgba(142, 154, 167, 0.15)',
                      boxShadow: deliveryMethod === 'delivery' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                      fontWeight: deliveryMethod === 'delivery' ? 700 : 500
                    }}
                  >
                    <Bike size={16} color={deliveryMethod === 'delivery' ? '#111827' : '#9CA3AF'} />
                    <span>Delivery Local</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('envio')}
                    style={{
                      ...styles.methodBtn,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      backgroundColor: deliveryMethod === 'envio' ? '#F9FAFB' : '#FFFFFF',
                      color: deliveryMethod === 'envio' ? '#111827' : '#6B7280',
                      border: deliveryMethod === 'envio' ? '1.5px solid #111827' : '1px solid rgba(142, 154, 167, 0.15)',
                      boxShadow: deliveryMethod === 'envio' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                      fontWeight: deliveryMethod === 'envio' ? 700 : 500
                    }}
                  >
                    <Truck size={16} color={deliveryMethod === 'envio' ? '#111827' : '#9CA3AF'} />
                    <span>Envío Nacional</span>
                  </button>
                </div>
              </div>

              {/* Selector de Sede si elige Recojo */}
              {deliveryMethod === 'recojo' && (
                <div style={styles.inputGroup} className="fade-in">
                  <label style={styles.label}>Selecciona la Sede de Recojo *</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSedeDropdownOpen(!isSedeDropdownOpen);
                        setIsDocDropdownOpen(false);
                      }}
                      style={styles.customSelectTrigger}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <MapPin size={16} color="#4B5563" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
                          {warehouses.find(w => w.codigo === selectedSede)?.nombre || 'Selecciona una sede'}
                        </span>
                      </div>
                      <ChevronDown 
                        size={16} 
                        color="#6B7280" 
                        style={{ 
                          transform: isSedeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 200ms ease'
                        }} 
                      />
                    </button>

                    {/* Popover flotante personalizado */}
                    {isSedeDropdownOpen && (
                      <div style={styles.customSelectDropdown} className="fade-in">
                        {warehouses.map(w => (
                          <div
                            key={w.codigo}
                            onClick={() => {
                              setSelectedSede(w.codigo);
                              setIsSedeDropdownOpen(false);
                            }}
                            style={{
                              ...styles.customSelectOption,
                              backgroundColor: selectedSede === w.codigo ? '#F3F4F6' : '#FFFFFF',
                              color: selectedSede === w.codigo ? '#111827' : 'var(--text-primary)',
                              fontWeight: selectedSede === w.codigo ? 700 : 500
                            }}
                            className="custom-select-option-hover"
                          >
                            <div style={{ fontWeight: 600 }}>{w.nombre}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>{w.direccion}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Celular / WhatsApp */}
              <div style={styles.inputGroup}>
                <label style={styles.label} htmlFor="phone">WhatsApp / Celular *</label>
                <div style={styles.inputIconWrapper}>
                  <Phone size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                  <input
                    type="tel"
                    id="phone"
                    placeholder="Ej. 987654321"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    style={styles.inputWithIcon}
                  />
                </div>
              </div>

              {/* Fila de Tipo y Nro de Documento */}
              <div style={styles.row}>
                <div style={{ ...styles.inputGroup, flex: 0.35, position: 'relative' }}>
                  <label style={styles.label}>Documento *</label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsDocDropdownOpen(!isDocDropdownOpen);
                      setIsSedeDropdownOpen(false);
                    }}
                    style={styles.customSelectTrigger}
                  >
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#374151' }}>{docType}</span>
                    <ChevronDown 
                      size={14} 
                      color="#6B7280" 
                      style={{ 
                        transform: isDocDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 200ms ease'
                      }} 
                    />
                  </button>

                  {/* Popover flotante personalizado */}
                  {isDocDropdownOpen && (
                    <div style={{ ...styles.customSelectDropdown, minWidth: '100px', right: 0 }} className="fade-in">
                      {['DNI', 'RUC'].map(type => (
                        <div
                          key={type}
                          onClick={() => {
                            setDocType(type);
                            setDocNumber('');
                            setName('');
                            setIsDocDropdownOpen(false);
                          }}
                          style={{
                            ...styles.customSelectOption,
                            backgroundColor: docType === type ? 'var(--accent-soft)' : '#FFFFFF',
                            color: docType === type ? 'var(--accent-start)' : 'var(--text-primary)',
                            fontWeight: docType === type ? 700 : 500,
                            padding: '10px 14px'
                          }}
                          className="custom-select-option-hover"
                        >
                          {type}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ ...styles.inputGroup, flex: 0.65 }}>
                  <label style={styles.label} htmlFor="docNumber">Nro de Documento *</label>
                  <div style={styles.inputIconWrapper}>
                    <FileText size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                    <input
                      type="text"
                      id="docNumber"
                      placeholder={docType === 'DNI' ? '8 dígitos' : '11 dígitos'}
                      required
                      maxLength={docType === 'DNI' ? 8 : 11}
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      style={styles.inputWithIcon}
                    />
                    {isValidatingDoc && (
                      <Loader2 size={16} className="spinner" style={styles.inputSpinner} />
                    )}
                  </div>
                </div>
              </div>

              {/* Nombre / Razón Social */}
              <div style={styles.inputGroup}>
                <label style={styles.label} htmlFor="name">
                  {docType === 'DNI' ? 'Nombres y Apellidos *' : 'Razón Social *'}
                </label>
                <div style={styles.inputIconWrapper}>
                  <User size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                  <input
                    type="text"
                    id="name"
                    placeholder="Se autocompleta con DNI/RUC"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={styles.inputWithIcon}
                  />
                </div>
              </div>

              {/* Dirección de Entrega (solo si no es Recojo) */}
              {deliveryMethod !== 'recojo' ? (
                <div style={styles.inputGroup} className="fade-in">
                  <label style={styles.label} htmlFor="address">
                    {deliveryMethod === 'delivery' ? 'Dirección de Entrega *' : 'Dirección de Envío y Courier *'}
                  </label>
                  <div style={styles.inputIconWrapper}>
                    <MapPin size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                    <input
                      type="text"
                      id="address"
                      placeholder={
                        deliveryMethod === 'delivery'
                          ? 'Ej. Calle Los Pinos 123, Urb. Santa Victoria - Chiclayo'
                          : 'Ej. Calle Lima 450 - Shalom Jaén (Indicar Agencia o Domicilio, Departamento, Provincia)'
                      }
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      style={styles.inputWithIcon}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ ...styles.infoAlert, display: 'flex', alignItems: 'center', gap: '8px' }} className="fade-in">
                  <Store size={15} color="#4B5563" />
                  <span style={{ fontSize: '0.78rem', color: '#4B5563', fontWeight: 600 }}>
                    Recogerás tu pedido en la sede seleccionada. No es necesario ingresar una dirección de entrega.
                  </span>
                </div>
              )}

              {/* Notas del pedido */}
              <div style={styles.inputGroup}>
                <label style={styles.label} htmlFor="notes">Notas o Referencias (Opcional)</label>
                <textarea
                  id="notes"
                  placeholder="Ej. Tocar timbre de madera, dejar en recepción, llamar antes de llegar..."
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={styles.textarea}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || cart.length === 0}
                style={styles.submitButton}
                className="soft-button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="spinner" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Confirmar Pedido por WhatsApp
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Columna Derecha: Resumen de Compra */}
        <div style={styles.summaryColumn}>
          <div style={styles.card} className="soft-card">
            <h3 style={styles.cardTitle}>Resumen de la Compra</h3>
            
            <div style={styles.cartItemsContainer}>
              {cart.length === 0 ? (
                <p style={styles.emptyCartText}>No hay productos seleccionados.</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} style={styles.summaryItem}>
                    <div style={styles.summaryItemImageContainer}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt={item.name} style={styles.summaryItemImage} />
                    </div>
                    <div style={styles.summaryItemInfo}>
                      <h4 style={styles.summaryItemName}>{item.name}</h4>
                      <div style={styles.summaryItemPriceRow}>
                        <span style={styles.summaryItemQty}>{item.quantity} und.</span>
                        <span style={styles.summaryItemPrice}>S/ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div style={styles.totalsContainer}>
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>Subtotal</span>
                  <span style={styles.totalValue}>S/ {cartTotal.toFixed(2)}</span>
                </div>
                <div style={styles.totalRow}>
                  <span style={styles.totalLabel}>Envío</span>
                  <span style={{ ...styles.totalValue, color: 'var(--accent-start)', fontWeight: '500' }}>Coordinar en chat</span>
                </div>
                <div style={{ ...styles.totalRow, ...styles.grandTotalRow }}>
                  <span style={styles.grandTotalLabel}>Total</span>
                  <span style={styles.grandTotalValue}>S/ {cartTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 20px',
  },
  topNav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    borderBottom: '1px solid rgba(142, 154, 167, 0.08)',
    paddingBottom: '16px',
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  backText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  logo: {
    fontFamily: 'var(--font-logo)',
    fontWeight: '500',
    fontSize: '1.4rem',
    color: 'var(--text-primary)',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  layout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    // Usaremos media queries en globals para pantallas anchas (2 columnas)
  },
  formColumn: {
    flex: 1.2,
  },
  summaryColumn: {
    flex: 0.8,
  },
  card: {
    padding: '28px',
    backgroundColor: 'var(--bg-card)',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '500',
    marginBottom: '8px',
  },
  cardSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  inputIconWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
  },
  inputWithIcon: {
    width: '100%',
    height: '50px',
    paddingLeft: '48px',
    paddingRight: '16px',
    border: '1px solid rgba(142, 154, 167, 0.15)',
    borderRadius: '16px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
    outline: 'none',
    boxShadow: 'inset 1px 1px 4px rgba(142, 154, 167, 0.02)',
  },
  inputSpinner: {
    position: 'absolute',
    right: '16px',
    color: 'var(--accent-start)',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  select: {
    height: '50px',
    padding: '0 40px 0 16px',
    border: '1px solid rgba(142, 154, 167, 0.15)',
    borderRadius: '16px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '18px',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid rgba(142, 154, 167, 0.15)',
    borderRadius: '16px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
    outline: 'none',
    resize: 'none',
  },
  submitButton: {
    width: '100%',
    height: '54px',
    marginTop: '12px',
  },
  errorAlert: {
    backgroundColor: 'rgba(235, 94, 85, 0.08)',
    border: '1px solid rgba(235, 94, 85, 0.2)',
    padding: '12px 16px',
    borderRadius: '16px',
    marginBottom: '20px',
  },
  errorText: {
    fontSize: '0.85rem',
    color: '#EB5E55',
    fontWeight: '500',
  },
  cartItemsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxHeight: '350px',
    overflowY: 'auto',
    paddingRight: '4px',
    marginBottom: '20px',
    borderBottom: '1px solid rgba(142, 154, 167, 0.08)',
    paddingBottom: '20px',
  },
  emptyCartText: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
  },
  summaryItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  summaryItemImageContainer: {
    width: '56px',
    height: '56px',
    backgroundColor: '#FAF9F8',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  summaryItemImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  summaryItemInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  summaryItemName: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    lineHeight: '1.2',
    display: '-webkit-box',
    WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  summaryItemPriceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '4px',
  },
  summaryItemQty: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  summaryItemPrice: {
    fontSize: '0.85rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  totalsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  totalValue: {
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  grandTotalRow: {
    borderTop: '1px solid rgba(142, 154, 167, 0.08)',
    paddingTop: '16px',
    marginTop: '4px',
  },
  grandTotalLabel: {
    fontSize: '1rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  grandTotalValue: {
    fontSize: '1.3rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
  },
  methodSelectorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '10px',
    marginTop: '6px',
    width: '100%',
  },
  methodBtn: {
    padding: '12px 8px',
    borderRadius: '10px',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 200ms ease',
    outline: 'none',
  },
  infoAlert: {
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: '#F9FAFB',
    border: '1px solid rgba(142, 154, 167, 0.15)',
    marginTop: '6px',
  },
  selectWithIcon: {
    width: '100%',
    padding: '12px 14px 12px 42px',
    borderRadius: '12px',
    border: '1px solid rgba(142, 154, 167, 0.15)',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    color: 'var(--text-primary)',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
  },
  customSelectTrigger: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1.5px solid rgba(142, 154, 167, 0.15)',
    fontSize: '0.88rem',
    fontFamily: 'inherit',
    color: 'var(--text-primary)',
    outline: 'none',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  },
  customSelectDropdown: {
    position: 'absolute',
    top: 'calc(100% + 6px)',
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid rgba(142, 154, 167, 0.12)',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
    maxHeight: '220px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    overflowX: 'hidden',
  },
  customSelectOption: {
    padding: '12px 16px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'background-color 150ms ease, color 150ms ease',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
  },
};
