'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { ArrowLeft, ShoppingBag, Menu, User, Phone, MapPin, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { cartCount, setIsCartOpen, setIsMenuOpen } = useCart();

  // Estados de datos de perfil
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [docType, setDocType] = useState('DNI');
  const [docNumber, setDocNumber] = useState('');
  const [address, setAddress] = useState('');

  // Historial de pedidos
  const [orders, setOrders] = useState([]);

  // Estados de UI
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('datos'); // 'datos' o 'pedidos'

  // Cargar datos al montar el componente
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('gloss_profile');
      if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        setName(profile.name || '');
        setPhone(profile.phone || '');
        setDocType(profile.docType || 'DNI');
        setDocNumber(profile.docNumber || '');
        setAddress(profile.address || '');
      }

      const savedOrders = localStorage.getItem('gloss_orders');
      if (savedOrders) {
        setOrders(JSON.parse(savedOrders));
      }
    } catch (e) {
      console.warn('Error al leer datos locales:', e);
    }
  }, []);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    try {
      const profile = { name, phone, docType, docNumber, address };
      localStorage.setItem('gloss_profile', JSON.stringify(profile));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error('Error al guardar perfil:', err);
    }
  };

  // Limpiar todos los datos locales (Reiniciar cuenta)
  const handleResetAccount = () => {
    if (window.confirm('¿Estás seguro de que deseas restablecer tu cuenta? Se eliminarán tus datos guardados y el historial de pedidos.')) {
      try {
        localStorage.removeItem('gloss_profile');
        localStorage.removeItem('gloss_orders');
        setName('');
        setPhone('');
        setDocType('DNI');
        setDocNumber('');
        setAddress('');
        setOrders([]);
      } catch (err) {
        console.error('Error al limpiar datos:', err);
      }
    }
  };

  // Formatear fecha
  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Fecha desconocida';
    }
  };

  return (
    <div style={styles.container}>
      {/* Barra de Navegación Superior */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/" style={styles.backButton}>
            <ArrowLeft size={22} color="var(--text-primary)" />
            <span style={styles.backText}>Inicio</span>
          </Link>
          
          <h2 style={styles.title}>Mi Cuenta</h2>
          
          <div style={styles.actions}>
            {/* Carrito */}
            <button style={styles.iconButton} onClick={() => setIsCartOpen(true)}>
              <ShoppingBag size={22} color="var(--accent-start)" />
              {cartCount > 0 && (
                <span style={styles.badge}>{cartCount}</span>
              )}
            </button>
            
            {/* Menú */}
            <button style={styles.iconButton} onClick={() => setIsMenuOpen(true)}>
              <Menu size={22} color="var(--accent-start)" />
            </button>
          </div>
        </div>
      </header>

      {/* Cuerpo Principal */}
      <main style={styles.main}>
        {/* Selector de Pestañas */}
        <div style={styles.tabBar}>
          <button 
            style={{ ...styles.tabButton, ...(activeTab === 'datos' ? styles.tabButtonActive : {}) }}
            onClick={() => setActiveTab('datos')}
          >
            Mis Datos
          </button>
          <button 
            style={{ ...styles.tabButton, ...(activeTab === 'pedidos' ? styles.tabButtonActive : {}) }}
            onClick={() => setActiveTab('pedidos')}
          >
            Mis Pedidos {orders.length > 0 && <span style={styles.tabCount}>{orders.length}</span>}
          </button>
        </div>

        {activeTab === 'datos' ? (
          /* PESTAÑA: MIS DATOS */
          <div style={styles.contentWrapper}>
            <form onSubmit={handleSaveProfile} style={styles.formCard} className="soft-card">
              <h3 style={styles.sectionTitle}>Información de Envío y Facturación</h3>
              <p style={styles.sectionSubtitle}>Estos datos se autocompletarán en tus compras para un checkout instantáneo.</p>

              {isSaved && (
                <div style={styles.successAlert}>
                  <CheckCircle2 size={18} color="#059669" />
                  <span style={styles.successText}>¡Tus datos se guardaron con éxito!</span>
                </div>
              )}

              {/* Nombre */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nombre y Apellidos</label>
                <div style={styles.inputIconWrapper}>
                  <User size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Ej. María García"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              {/* WhatsApp */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>WhatsApp / Celular</label>
                <div style={styles.inputIconWrapper}>
                  <Phone size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                  <input
                    type="tel"
                    placeholder="Ej. 987654321"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    style={styles.input}
                  />
                </div>
              </div>

              {/* Tipo y Nro Documento */}
              <div style={styles.row}>
                <div style={{ ...styles.inputGroup, flex: 0.35 }}>
                  <label style={styles.label}>Doc.</label>
                  <select
                    value={docType}
                    onChange={(e) => { setDocType(e.target.value); setDocNumber(''); }}
                    style={styles.select}
                  >
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                  </select>
                </div>

                <div style={{ ...styles.inputGroup, flex: 0.65 }}>
                  <label style={styles.label}>Número de Documento</label>
                  <div style={styles.inputIconWrapper}>
                    <FileText size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                    <input
                      type="text"
                      placeholder={docType === 'DNI' ? '8 dígitos' : '11 dígitos'}
                      required
                      maxLength={docType === 'DNI' ? 8 : 11}
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>

              {/* Dirección de Envío */}
              <div style={styles.inputGroup}>
                <label style={styles.label}>Dirección de Entrega</label>
                <div style={styles.inputIconWrapper}>
                  <MapPin size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Calle, Número, Dpto, Distrito, Provincia"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              {/* Botón de Enviar */}
              <button type="submit" className="soft-button" style={styles.submitBtn}>
                Guardar Datos de Facturación
              </button>
            </form>

            {/* Restablecer cuenta */}
            {(name || phone || address || orders.length > 0) && (
              <button onClick={handleResetAccount} style={styles.resetButton}>
                <RotateCcw size={14} />
                <span>Restablecer Cuenta local</span>
              </button>
            )}
          </div>
        ) : (
          /* PESTAÑA: MIS PEDIDOS */
          <div style={styles.contentWrapper}>
            {orders.length === 0 ? (
              <div style={styles.emptyContainer}>
                <div style={styles.bagWrapper} className="soft-card">
                  <ShoppingBag size={40} color="var(--text-secondary)" />
                </div>
                <h3 style={styles.emptyTitle}>Aún no tienes pedidos</h3>
                <p style={styles.emptySubtitle}>
                  Los pedidos que envíes por WhatsApp quedarán registrados aquí para que puedas hacerles seguimiento.
                </p>
                <Link href="/" className="soft-button">
                  Ver Productos
                </Link>
              </div>
            ) : (
              <div style={styles.ordersList}>
                <p style={styles.countText}>Tienes {orders.length} pedidos registrados en este dispositivo</p>
                {orders.map((order, idx) => (
                  <div key={idx} style={styles.orderCard} className="soft-card">
                    <div style={styles.orderHeader}>
                      <div>
                        <span style={styles.orderNumber}>Pedido #{order.nroPedido || `WEB-${idx + 1}`}</span>
                        <span style={styles.orderDate}>{formatDate(order.date)}</span>
                      </div>
                      <div style={styles.statusBadge}>Enviado</div>
                    </div>

                    <div style={styles.orderBody}>
                      <span style={styles.bodyLabel}>Productos:</span>
                      <div style={styles.itemsWrapper}>
                        {order.items.map((item, i) => (
                          <div key={i} style={styles.itemRow}>
                            <span style={styles.itemName}>• {item.quantity}x {item.name} ({item.brand})</span>
                            <span style={styles.itemPrice}>S/ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div style={styles.deliveryDetails}>
                        <span style={styles.deliveryLabel}>Dirección de entrega:</span>
                        <span style={styles.deliveryText}>{order.address}</span>
                      </div>
                    </div>

                    <div style={styles.orderFooter}>
                      <div style={styles.totalBlock}>
                        <span style={styles.totalLabel}>Total pagado</span>
                        <span style={styles.totalValue}>S/ {parseFloat(order.total || 0).toFixed(2)}</span>
                      </div>

                      {order.whatsappUrl && (
                        <a 
                          href={order.whatsappUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="soft-button"
                          style={styles.reopenBtn}
                        >
                          Reabrir en WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
    paddingTop: '68px',
    paddingBottom: '80px',
  },
  header: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    width: '100%',
    maxWidth: '800px',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(142, 154, 167, 0.05)',
    padding: '12px 20px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  backText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.05rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
    margin: 0,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    transition: 'transform 0.2s ease',
    outline: 'none',
    padding: 0,
  },
  badge: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    backgroundColor: 'var(--accent-start)',
    color: '#FFFFFF',
    fontSize: '0.65rem',
    fontWeight: '700',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--bg-primary)',
  },
  main: {
    flex: 1,
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  tabBar: {
    display: 'flex',
    borderRadius: '16px',
    backgroundColor: '#FAF9F8',
    padding: '4px',
    border: '1px solid rgba(142, 154, 167, 0.08)',
  },
  tabButton: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    padding: '12px 16px',
    fontSize: '0.88rem',
    fontWeight: '600',
    fontFamily: 'var(--font-body)',
    color: 'var(--text-secondary)',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    color: 'var(--text-primary)',
    boxShadow: '0 4px 12px rgba(142, 154, 167, 0.06)',
  },
  tabCount: {
    fontSize: '0.7rem',
    fontWeight: '700',
    backgroundColor: 'var(--accent-start)',
    color: '#FFFFFF',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%',
  },
  formCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.05rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  sectionSubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    margin: '-8px 0 4px 0',
  },
  successAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#ECFDF5',
    border: '1px solid #10B981',
    borderRadius: '16px',
  },
  successText: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#065F46',
    fontFamily: 'var(--font-body)',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
  },
  label: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  inputIconWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    backgroundColor: '#FAF9F8',
    border: '1px solid rgba(142, 154, 167, 0.08)',
    borderRadius: '16px',
    padding: '12px 16px 12px 46px',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  select: {
    width: '100%',
    backgroundColor: '#FAF9F8',
    border: '1px solid rgba(142, 154, 167, 0.08)',
    borderRadius: '16px',
    padding: '12px 16px',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  row: {
    display: 'flex',
    gap: '12px',
    width: '100%',
  },
  submitBtn: {
    marginTop: '8px',
    width: '100%',
  },
  resetButton: {
    alignSelf: 'center',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: '#EF4444',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    padding: '8px 16px',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '80px 20px',
    gap: '16px',
  },
  bagWrapper: {
    width: '84px',
    height: '84px',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    boxShadow: 'var(--soft-shadow-outer)',
    marginBottom: '8px',
  },
  emptyTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.25rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: 0,
  },
  emptySubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    maxWidth: '320px',
    lineHeight: '1.45',
    margin: '0 0 12px 0',
  },
  ordersList: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    gap: '14px',
  },
  countText: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    margin: '0 0 4px 8px',
  },
  orderCard: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  orderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(142, 154, 167, 0.08)',
    paddingBottom: '12px',
  },
  orderNumber: {
    display: 'block',
    fontFamily: 'var(--font-title)',
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  orderDate: {
    display: 'block',
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  statusBadge: {
    fontSize: '0.72rem',
    fontWeight: '700',
    backgroundColor: '#ECFDF5',
    color: '#047857',
    padding: '4px 10px',
    borderRadius: '20px',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
  orderBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  bodyLabel: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  itemsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    backgroundColor: '#FAF9F8',
    padding: '10px 14px',
    borderRadius: '12px',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-body)',
  },
  itemName: {
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  itemPrice: {
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  deliveryDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    marginTop: '4px',
  },
  deliveryLabel: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  deliveryText: {
    fontSize: '0.82rem',
    color: 'var(--text-primary)',
    lineHeight: '1.4',
  },
  orderFooter: {
    borderTop: '1px solid rgba(142, 154, 167, 0.08)',
    paddingTop: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
  },
  totalBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  totalLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  totalValue: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.15rem',
    fontWeight: '800',
    color: 'var(--accent-start)',
  },
  reopenBtn: {
    padding: '10px 16px',
    fontSize: '0.78rem',
    borderRadius: '14px',
  },
};
