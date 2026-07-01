'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingBag, Search, Eye, CheckCircle2, XCircle, 
  RefreshCw, Loader2, ArrowRight, Calendar, User, Phone, 
  MapPin, DollarSign, FileText, ChevronLeft, ChevronRight, MessageCircle 
} from 'lucide-react';

export default function AdminOrdersTab() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Estados de modales
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [kpis, setKpis] = useState({
    total: 0,
    montoTotal: 0,
    pagados: 0,
    pendientes: 0
  });

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/admin/orders?search=${encodeURIComponent(search)}&estado=${estado}&page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPedidos(data.pedidos);
          setTotalPages(data.pagination.totalPages);
          setTotalItems(data.pagination.total);
          
          // Calcular KPIs acumulados de la página cargada o total aproximado
          const sumMonto = data.pedidos.reduce((acc, p) => acc + parseFloat(p.total), 0);
          const pag = data.pedidos.filter(p => p.estado === 'PAGADO').length;
          const pend = data.pedidos.filter(p => p.estado === 'PENDIENTE').length;
          
          setKpis({
            total: data.pagination.total,
            montoTotal: sumMonto, // Suma local de la página
            pagados: pag,
            pendientes: pend
          });
        }
      } else {
        setErrorMsg('Error al conectar con la API de pedidos.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al cargar pedidos.');
    } finally {
      setLoading(false);
    }
  }, [search, estado, page]);

  useEffect(() => {
    fetchPedidos();
  }, [fetchPedidos]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleEstadoFilterChange = (e) => {
    setEstado(e.target.value);
    setPage(1);
  };

  const handleUpdateStatus = async (pedidoId, nuevoEstado) => {
    setActionProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId, action: 'update_status', nuevoEstado })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg(`Estado del pedido actualizado a ${nuevoEstado} con éxito.`);
          // Actualizar lista local
          setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, estado: nuevoEstado } : p));
          if (selectedPedido && selectedPedido.id === pedidoId) {
            setSelectedPedido(prev => ({ ...prev, estado: nuevoEstado }));
          }
        } else {
          setErrorMsg(data.error || 'Error al cambiar estado.');
        }
      } else {
        setErrorMsg('Error de servidor al actualizar estado.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Fallo en la conexión.');
    } finally {
      setActionProcessing(false);
    }
  };

  const handleResyncErp = async (pedidoId) => {
    setActionProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId, action: 'resync_erp' })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const cot = data.pedido.nroCotizacionErp;
          setSuccessMsg(`¡Cotización ${cot} inyectada exitosamente en Navasoft ERP!`);
          // Actualizar lista
          setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, nroCotizacionErp: cot } : p));
          if (selectedPedido && selectedPedido.id === pedidoId) {
            setSelectedPedido(prev => ({ ...prev, nroCotizacionErp: cot }));
          }
        } else {
          setErrorMsg(data.error || 'La sincronización con el ERP falló.');
        }
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Error de comunicación con Navasoft ERP.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al sincronizar con el ERP.');
    } finally {
      setActionProcessing(false);
    }
  };

  const openPedidoModal = (pedido) => {
    setSelectedPedido(pedido);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const closePedidoModal = () => {
    setSelectedPedido(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitleSec}>
          <ShoppingBag size={24} color="var(--accent-start)" />
          <h2 style={styles.title}>Gestión de Pedidos & Ventas</h2>
        </div>
        <p style={styles.subtitle}>Supervisa los pedidos de la web, valida pagos de transferencias y sincroniza cotizaciones con Navasoft.</p>
      </div>

      {/* Tarjetas KPI */}
      <div style={styles.kpiGrid}>
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrapper, background: 'rgba(59, 130, 246, 0.1)' }}>
            <ShoppingBag size={20} color="#3B82F6" />
          </div>
          <div>
            <div style={styles.kpiNum}>{kpis.total}</div>
            <div style={styles.kpiLabel}>Pedidos Totales</div>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrapper, background: 'rgba(34, 197, 94, 0.1)' }}>
            <CheckCircle2 size={20} color="#22C55E" />
          </div>
          <div>
            <div style={styles.kpiNum}>{kpis.pagados}</div>
            <div style={styles.kpiLabel}>Pagados (Mes)</div>
          </div>
        </div>
        <div style={styles.kpiCard}>
          <div style={{ ...styles.kpiIconWrapper, background: 'rgba(245, 158, 11, 0.1)' }}>
            <Loader2 size={20} color="#F59E0B" className="spinner" />
          </div>
          <div>
            <div style={styles.kpiNum}>{kpis.pendientes}</div>
            <div style={styles.kpiLabel}>Pendientes (Mes)</div>
          </div>
        </div>
      </div>

      {/* Mensajes de feedback */}
      {errorMsg && <div style={styles.alertError}>{errorMsg}</div>}
      {successMsg && <div style={styles.alertSuccess}>{successMsg}</div>}

      {/* Barra de Filtros */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={18} color="var(--text-secondary)" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por cliente, DNI, pedido o cotización..."
            value={search}
            onChange={handleSearchChange}
            style={styles.searchInput}
          />
        </div>
        <div style={styles.selectWrapper}>
          <select value={estado} onChange={handleEstadoFilterChange} style={styles.select}>
            <option value="">Todos los Estados</option>
            <option value="PENDIENTE">Pendientes de Pago</option>
            <option value="PAGADO">Pagados / Listos</option>
            <option value="CANCELADO">Cancelados</option>
          </select>
        </div>
        <button onClick={fetchPedidos} style={styles.refreshBtn} className="soft-button">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabla de Pedidos */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loadingWrapper}>
            <Loader2 size={36} className="spinner" color="var(--accent-start)" />
            <span style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Cargando transacciones...</span>
          </div>
        ) : pedidos.length === 0 ? (
          <div style={styles.emptyWrapper}>
            <ShoppingBag size={48} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
            <h3 style={{ margin: '16px 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>No hay pedidos</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No se encontraron pedidos que coincidan con los filtros.</p>
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Nro Pedido</th>
                  <th style={styles.th}>Cliente</th>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Monto</th>
                  <th style={styles.th}>Estado</th>
                  <th style={styles.th}>Cotización ERP</th>
                  <th style={styles.th}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => {
                  const isPendingErp = !p.nroCotizacionErp || p.nroCotizacionErp === 'PENDIENTE_ERP';
                  return (
                    <tr key={p.id} style={styles.tr}>
                      <td style={{ ...styles.td, fontWeight: 700, color: 'var(--accent-start)' }}>
                        {p.nroPedido}
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 600 }}>{p.clienteNombre}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Doc: {p.clienteDocumento}</div>
                      </td>
                      <td style={styles.td}>
                        {new Date(p.fechaCreacion).toLocaleDateString('es-PE', {
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>
                      <td style={{ ...styles.td, fontWeight: 700 }}>
                        S/. {parseFloat(p.total).toFixed(2)}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          ...(p.estado === 'PAGADO' ? styles.badgeSuccess : p.estado === 'CANCELADO' ? styles.badgeDanger : styles.badgeWarning)
                        }}>
                          {p.estado}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.badge,
                          ...(isPendingErp ? styles.badgeErpPending : styles.badgeErpSuccess)
                        }}>
                          {isPendingErp ? '⚠️ PENDIENTE' : `⚙️ ${p.nroCotizacionErp}`}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button onClick={() => openPedidoModal(p)} style={styles.actionBtn} className="soft-button">
                          <Eye size={15} />
                          <span>Ver Detalles</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div style={styles.paginationBar}>
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)} 
              style={styles.pageBtn}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={styles.pageLabel}>Página {page} de {totalPages}</span>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)} 
              style={styles.pageBtn}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE DEL PEDIDO */}
      {selectedPedido && (
        <div style={styles.modalOverlay} onClick={closePedidoModal}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitleSec}>
                <ShoppingBag size={20} color="var(--accent-start)" />
                <h3 style={styles.modalTitle}>Detalles del Pedido {selectedPedido.nroPedido}</h3>
              </div>
              <button onClick={closePedidoModal} style={styles.modalCloseBtn}>×</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid2Col}>
                
                {/* Datos del Cliente y Envío */}
                <div style={styles.detailBlock}>
                  <h4 style={styles.sectionSub}>Información del Cliente</h4>
                  <div style={styles.infoItem}>
                    <User size={16} color="var(--text-secondary)" />
                    <div>
                      <div style={styles.infoLabel}>Nombre Completo</div>
                      <div style={styles.infoVal}>{selectedPedido.clienteNombre}</div>
                    </div>
                  </div>
                  <div style={styles.infoItem}>
                    <FileText size={16} color="var(--text-secondary)" />
                    <div>
                      <div style={styles.infoLabel}>DNI / RUC</div>
                      <div style={styles.infoVal}>{selectedPedido.clienteDocumento}</div>
                    </div>
                  </div>
                  <div style={styles.infoItem}>
                    <Phone size={16} color="var(--text-secondary)" />
                    <div>
                      <div style={styles.infoLabel}>Celular / WhatsApp</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={styles.infoVal}>{selectedPedido.clienteTelefono}</span>
                        <a 
                          href={`https://wa.me/${selectedPedido.clienteTelefono.replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={styles.waLink}
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                  <div style={styles.infoItem}>
                    <MapPin size={16} color="var(--text-secondary)" />
                    <div>
                      <div style={styles.infoLabel}>Dirección de Entrega</div>
                      <div style={styles.infoVal}>{selectedPedido.direccion}</div>
                    </div>
                  </div>
                </div>

                {/* Comprobante de Pago y Sincronización ERP */}
                <div style={styles.detailBlock}>
                  <h4 style={styles.sectionSub}>Comprobante de Pago & ERP</h4>
                  
                  {/* Sincronización ERP */}
                  <div style={styles.erpSyncBox}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Estado Navasoft ERP:</span>
                      <span style={{
                        ...styles.badge,
                        ...((!selectedPedido.nroCotizacionErp || selectedPedido.nroCotizacionErp === 'PENDIENTE_ERP') ? styles.badgeErpPending : styles.badgeErpSuccess)
                      }}>
                        {(!selectedPedido.nroCotizacionErp || selectedPedido.nroCotizacionErp === 'PENDIENTE_ERP') ? 'PENDIENTE' : `COTIZACIÓN: ${selectedPedido.nroCotizacionErp}`}
                      </span>
                    </div>
                    {(!selectedPedido.nroCotizacionErp || selectedPedido.nroCotizacionErp === 'PENDIENTE_ERP') && (
                      <button 
                        onClick={() => handleResyncErp(selectedPedido.id)}
                        disabled={actionProcessing}
                        style={styles.resyncBtn}
                        className="soft-button"
                      >
                        {actionProcessing ? (
                          <Loader2 size={14} className="spinner" />
                        ) : (
                          <RefreshCw size={14} />
                        )}
                        <span>Sincronizar con Navasoft ERP ahora</span>
                      </button>
                    )}
                  </div>

                  {/* Voucher de Pago */}
                  <div style={styles.voucherBox}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: 8 }}>Voucher / Comprobante:</span>
                    {selectedPedido.voucherUrl ? (
                      <a href={selectedPedido.voucherUrl} target="_blank" rel="noreferrer" style={styles.voucherLink}>
                        <img 
                          src={selectedPedido.voucherUrl} 
                          alt="Voucher de transferencia" 
                          style={styles.voucherPreview} 
                        />
                        <span style={styles.voucherHint}>Hacer clic para ampliar</span>
                      </a>
                    ) : (
                      <div style={styles.noVoucher}>
                        <XCircle size={20} color="var(--text-secondary)" />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No se cargó voucher digital.</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Detalle de Productos del Carrito */}
              <div style={styles.productsBlock}>
                <h4 style={styles.sectionSub}>Productos en el Carrito</h4>
                <div style={styles.prodList}>
                  {JSON.parse(selectedPedido.productos).map((item, idx) => (
                    <div key={idx} style={styles.prodItem}>
                      <div style={styles.prodInfo}>
                        <span style={styles.prodName}>{item.name}</span>
                        {item.brand && <span style={styles.prodBrand}>{item.brand}</span>}
                      </div>
                      <div style={styles.prodPricing}>
                        <span style={styles.prodQty}>{item.quantity} x S/. {item.price.toFixed(2)}</span>
                        <span style={styles.prodSub}>S/. {(item.quantity * item.price).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={styles.totalRow}>
                  <span>Total a Pagar:</span>
                  <span style={styles.totalVal}>S/. {parseFloat(selectedPedido.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Acciones de Gestión de Estado */}
            <div style={styles.modalFooter}>
              <div style={styles.statusActions}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Cambiar Estado del Pedido:</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    onClick={() => handleUpdateStatus(selectedPedido.id, 'PAGADO')}
                    disabled={actionProcessing || selectedPedido.estado === 'PAGADO'}
                    style={styles.btnSuccess}
                    className="soft-button"
                  >
                    <CheckCircle2 size={14} /> Registrar como PAGADO
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(selectedPedido.id, 'CANCELADO')}
                    disabled={actionProcessing || selectedPedido.estado === 'CANCELADO'}
                    style={styles.btnDanger}
                    className="soft-button"
                  >
                    <XCircle size={14} /> Cancelar Pedido
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    background: '#FAFBFD',
    minHeight: '100%'
  },
  header: {
    marginBottom: '24px'
  },
  headerTitleSec: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '4px'
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#1A1D23',
    margin: 0
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    margin: 0
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  kpiCard: {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
    border: '1px solid #ECEFF5'
  },
  kpiIconWrapper: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiNum: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: '#1A1D23'
  },
  kpiLabel: {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginTop: '2px'
  },
  alertError: {
    background: '#FEF2F2',
    border: '1px solid #FEE2E2',
    color: '#EF4444',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '16px'
  },
  alertSuccess: {
    background: '#F0FDF4',
    border: '1px solid #DCFCE7',
    color: '#15803D',
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '16px'
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  searchBox: {
    position: 'relative',
    flex: 1,
    minWidth: '280px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)'
  },
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 38px',
    borderRadius: '12px',
    border: '1px solid #D1D5DB',
    fontSize: '0.85rem',
    outline: 'none',
    background: '#FFFFFF'
  },
  selectWrapper: {
    minWidth: '180px'
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid #D1D5DB',
    fontSize: '0.85rem',
    outline: 'none',
    background: '#FFFFFF',
    cursor: 'pointer'
  },
  refreshBtn: {
    padding: '10px 12px',
    borderRadius: '12px',
    background: '#FFFFFF',
    border: '1px solid #D1D5DB',
    cursor: 'pointer',
    color: 'var(--text-secondary)'
  },
  tableCard: {
    background: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #ECEFF5',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
    overflow: 'hidden'
  },
  loadingWrapper: {
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyWrapper: {
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-secondary)'
  },
  tableResponsive: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  thRow: {
    background: '#F8FAFC',
    borderBottom: '1px solid #ECEFF5'
  },
  th: {
    padding: '14px 18px',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  tr: {
    borderBottom: '1px solid #ECEFF5',
    transition: 'background 150ms ease',
    ':hover': {
      background: '#F8FAFC'
    }
  },
  td: {
    padding: '14px 18px',
    fontSize: '0.83rem',
    color: '#374151'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '8px',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase'
  },
  badgeSuccess: {
    background: '#DCFCE7',
    color: '#166534'
  },
  badgeWarning: {
    background: '#FEF3C7',
    color: '#92400E'
  },
  badgeDanger: {
    background: '#FEE2E2',
    color: '#991B1B'
  },
  badgeErpSuccess: {
    background: '#E0F2FE',
    color: '#0369A1'
  },
  badgeErpPending: {
    background: '#FFF7ED',
    color: '#C2410C'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: '#F3F4F6',
    border: '1px solid #E5E7EB',
    cursor: 'pointer',
    color: '#374151'
  },
  paginationBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    borderTop: '1px solid #ECEFF5',
    gap: '12px'
  },
  pageBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    background: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#374151',
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  pageLabel: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-secondary)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(26, 29, 35, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 1000
  },
  modalCard: {
    background: '#FFFFFF',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '780px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh'
  },
  modalHeader: {
    padding: '18px 24px',
    borderBottom: '1px solid #ECEFF5',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitleSec: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  modalTitle: {
    fontSize: '1.05rem',
    fontWeight: 800,
    color: '#1A1D23',
    margin: 0
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.6rem',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    lineHeight: 1
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  grid2Col: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '20px',
    marginBottom: '20px'
  },
  detailBlock: {
    background: '#F8FAFC',
    border: '1px solid #ECEFF5',
    borderRadius: '14px',
    padding: '18px'
  },
  sectionSub: {
    fontSize: '0.85rem',
    fontWeight: 800,
    color: '#1A1D23',
    margin: '0 0 14px 0',
    textTransform: 'uppercase',
    letterSpacing: '0.02em'
  },
  infoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '12px',
    ':last-child': {
      marginBottom: 0
    }
  },
  infoLabel: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase'
  },
  infoVal: {
    fontSize: '0.83rem',
    fontWeight: 600,
    color: '#374151',
    marginTop: '2px'
  },
  waLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#16A34A',
    textDecoration: 'none',
    background: '#DCFCE7',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  erpSyncBox: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '12px',
    marginBottom: '16px'
  },
  resyncBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '8px',
    background: '#3B82F6',
    border: 'none',
    borderRadius: '8px',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '0.78rem',
    marginTop: '10px',
    cursor: 'pointer'
  },
  voucherBox: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '12px'
  },
  voucherLink: {
    display: 'block',
    textDecoration: 'none',
    textAlign: 'center'
  },
  voucherPreview: {
    maxWidth: '100%',
    maxHeight: '120px',
    borderRadius: '8px',
    objectFit: 'contain',
    border: '1px solid #ECEFF5'
  },
  voucherHint: {
    display: 'block',
    fontSize: '0.7rem',
    color: '#3B82F6',
    marginTop: '6px',
    fontWeight: 600
  },
  noVoucher: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    justifyContent: 'center',
    padding: '16px',
    border: '1px dashed #D1D5DB',
    borderRadius: '8px'
  },
  productsBlock: {
    border: '1px solid #ECEFF5',
    borderRadius: '14px',
    padding: '18px'
  },
  prodList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  prodItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px dashed #ECEFF5',
    paddingBottom: '8px'
  },
  prodInfo: {
    display: 'flex',
    flexDirection: 'column'
  },
  prodName: {
    fontSize: '0.83rem',
    fontWeight: 600,
    color: '#374151'
  },
  prodBrand: {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)',
    marginTop: '2px'
  },
  prodPricing: {
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column'
  },
  prodQty: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)'
  },
  prodSub: {
    fontSize: '0.83rem',
    fontWeight: 700,
    color: '#1A1D23',
    marginTop: '2px'
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '2px solid #ECEFF5',
    fontSize: '0.92rem',
    fontWeight: 800,
    color: '#1A1D23'
  },
  totalVal: {
    fontSize: '1.1rem',
    color: 'var(--accent-start)'
  },
  modalFooter: {
    padding: '18px 24px',
    borderTop: '1px solid #ECEFF5',
    background: '#F8FAFC'
  },
  statusActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  btnSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '8px',
    background: '#22C55E',
    border: 'none',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer'
  },
  btnDanger: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    borderRadius: '8px',
    background: '#EF4444',
    border: 'none',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer'
  }
};
