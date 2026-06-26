'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useRouter } from 'next/navigation';
import { ShoppingBag, ArrowLeft, Loader2, CheckCircle2, User, Phone, MapPin, FileText } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useCart();
  const router = useRouter();

  // Estados del Formulario
  const [phone, setPhone] = useState('');
  const [docType, setDocType] = useState('DNI');
  const [docNumber, setDocNumber] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Estados de UI
  const [isValidatingDoc, setIsValidatingDoc] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Redireccionar si el carrito está vacío y no estamos en envío exitoso
  useEffect(() => {
    if (cart.length === 0 && !isSubmitting) {
      // router.push('/');
    }
  }, [cart, router, isSubmitting]);

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
    if (!phone || !docNumber || !name || !address) {
      setErrorMessage('Por favor, completa todos los campos obligatorios.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

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
          address,
          notes,
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

      const whatsappMessage = `¡Hola Tienda Gloss! 👋 Acabo de realizar un pedido desde la web.

🛍️ *Pedido Nro:* #${data.nroPedido}
👤 *Cliente:* ${name} (${docType}: ${docNumber})
📱 *WhatsApp:* ${phone}
📍 *Dirección:* ${address}
${notes ? `📝 *Nota:* ${notes}\n` : ''}
🛒 *Productos:*
${formattedItems}

💵 *Total a Pagar:* S/ ${cartTotal.toFixed(2)}

*Deseo coordinar el pago y envío por aquí.*`;

      // 3. Obtener el número de WhatsApp corporativo de la respuesta o del .env
      const targetPhone = data.whatsappNumber || '51900000000';
      const encodedText = encodeURIComponent(whatsappMessage);
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;

      // 4. Limpiar el carrito
      clearCart();

      // 5. Redireccionar al cliente a WhatsApp
      window.location.href = whatsappUrl;

    } catch (err) {
      console.error('Error al procesar compra:', err);
      setErrorMessage(err.message || 'Ocurrió un error inesperado. Por favor, intenta de nuevo.');
      setIsSubmitting(false);
    }
  };

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
                <div style={{ ...styles.inputGroup, flex: 0.35 }}>
                  <label style={styles.label} htmlFor="docType">Documento *</label>
                  <select
                    id="docType"
                    value={docType}
                    onChange={(e) => {
                      setDocType(e.target.value);
                      setDocNumber('');
                      setName('');
                    }}
                    style={styles.select}
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                  </select>
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

              {/* Dirección de Entrega */}
              <div style={styles.inputGroup}>
                <label style={styles.label} htmlFor="address">Dirección de Entrega *</label>
                <div style={styles.inputIconWrapper}>
                  <MapPin size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                  <input
                    type="text"
                    id="address"
                    placeholder="Ej. Calle Los Pinos 123, Dpto 402 - Miraflores"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={styles.inputWithIcon}
                  />
                </div>
              </div>

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
                  <span style={{ ...styles.totalValue, color: '#FF8C69', fontWeight: '600' }}>Coordinar en chat</span>
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
    fontFamily: 'var(--font-title)',
    fontWeight: '700',
    fontSize: '1.4rem',
    color: 'var(--text-primary)',
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
    fontWeight: '700',
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
    fontWeight: '600',
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
    color: '#FF8C69',
  },
  row: {
    display: 'flex',
    gap: '16px',
  },
  select: {
    height: '50px',
    padding: '0 16px',
    border: '1px solid rgba(142, 154, 167, 0.15)',
    borderRadius: '16px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    color: 'var(--text-primary)',
    outline: 'none',
    backgroundColor: '#FFFFFF',
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
    fontWeight: '600',
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
    fontWeight: '600',
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
    fontWeight: '700',
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
    fontWeight: '600',
  },
  grandTotalRow: {
    borderTop: '1px solid rgba(142, 154, 167, 0.08)',
    paddingTop: '16px',
    marginTop: '4px',
  },
  grandTotalLabel: {
    fontSize: '1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  grandTotalValue: {
    fontSize: '1.3rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
  },
};
