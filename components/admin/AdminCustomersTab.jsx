'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, Search, Eye, Edit2, MessageCircle, Phone, 
  Mail, MapPin, FileText, Loader2, RefreshCw, 
  ChevronLeft, ChevronRight, CheckCircle2, ShoppingBag 
} from 'lucide-react';

export default function AdminCustomersTab() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modal y Edición
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Campos del formulario de edición/notas
  const [editNotes, setEditNotes] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gloss_admin_token') : '';
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(search)}&page=${page}&limit=10`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setClientes(data.clientes);
          setTotalPages(data.pagination.totalPages);
          setTotalItems(data.pagination.total);
        }
      } else {
        setErrorMsg('Error al conectar con la API de clientes.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al cargar clientes.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const openClienteModal = (cliente) => {
    setSelectedCliente(cliente);
    setEditNotes(cliente.notasAdmin || '');
    setEditEmail(cliente.correo || '');
    setEditPhone(cliente.telefono || '');
    setEditAddress(cliente.direccion || '');
    setIsEditing(false);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const closeClienteModal = () => {
    setSelectedCliente(null);
  };

  const handleSaveNotes = async () => {
    setActionProcessing(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('gloss_admin_token') : '';
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          documento: selectedCliente.documento,
          notasAdmin: editNotes,
          correo: editEmail,
          telefono: editPhone,
          direccion: editAddress
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSuccessMsg('Ficha de cliente y notas de CRM actualizadas con éxito.');
          // Actualizar lista local
          setClientes(prev => prev.map(c => c.documento === selectedCliente.documento ? { 
            ...c, 
            notasAdmin: editNotes,
            correo: editEmail,
            telefono: editPhone,
            direccion: editAddress
          } : c));
          setSelectedCliente(prev => ({ 
            ...prev, 
            notasAdmin: editNotes,
            correo: editEmail,
            telefono: editPhone,
            direccion: editAddress
          }));
          setIsEditing(false);
        } else {
          setErrorMsg(data.error || 'Error al guardar los datos.');
        }
      } else {
        setErrorMsg('Error de servidor al guardar cambios.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Error de red al intentar guardar.');
    } finally {
      setActionProcessing(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitleSec}>
          <Users size={24} color="var(--accent-start)" />
          <h2 style={styles.title}>CRM - Control de Clientes</h2>
        </div>
        <p style={styles.subtitle}>Administra los datos de contacto de tus compradores de la web, revisa su historial de consumo y registra notas de seguimiento.</p>
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
            placeholder="Buscar clientes por DNI, RUC, nombre o celular..."
            value={search}
            onChange={handleSearchChange}
            style={styles.searchInput}
          />
        </div>
        <button onClick={fetchClientes} style={styles.refreshBtn} className="soft-button">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabla de Clientes */}
      <div style={styles.tableCard}>
        {loading ? (
          <div style={styles.loadingWrapper}>
            <Loader2 size={36} className="spinner" color="var(--accent-start)" />
            <span style={{ marginTop: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Cargando base de datos CRM...</span>
          </div>
        ) : clientes.length === 0 ? (
          <div style={styles.emptyWrapper}>
            <Users size={48} color="var(--text-secondary)" style={{ opacity: 0.5 }} />
            <h3 style={{ margin: '16px 0 8px 0', fontSize: '1.1rem', fontWeight: 700 }}>No hay clientes registrados</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No se encontraron registros de clientes todavía.</p>
          </div>
        ) : (
          <div style={styles.tableResponsive}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.thRow}>
                  <th style={styles.th}>Cliente / Razón Social</th>
                  <th style={styles.th}>DNI / RUC</th>
                  <th style={styles.th}>Teléfono</th>
                  <th style={styles.th}>Dirección</th>
                  <th style={styles.th}>Nro Pedidos</th>
                  <th style={styles.th}>Consumo Total</th>
                  <th style={styles.th}>Contacto</th>
                  <th style={styles.th}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} style={styles.tr}>
                    <td style={{ ...styles.td, fontWeight: 700 }}>
                      {c.nombre}
                    </td>
                    <td style={{ ...styles.td, fontFamily: 'monospace' }}>
                      {c.documento}
                    </td>
                    <td style={styles.td}>
                      {c.telefono}
                    </td>
                    <td style={styles.td}>
                      {c.direccion || <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>-</span>}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', fontWeight: 600 }}>
                      {c.cantidadPedidos || 0}
                    </td>
                    <td style={{ ...styles.td, fontWeight: 700, color: 'var(--accent-start)' }}>
                      S/. {c.totalCompras ? c.totalCompras.toFixed(2) : '0.00'}
                    </td>
                    <td style={styles.td}>
                      <a 
                        href={`https://wa.me/${c.telefono.replace(/[^0-9]/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={styles.waBadge}
                      >
                        <MessageCircle size={13} />
                        <span>Chat</span>
                      </a>
                    </td>
                    <td style={styles.td}>
                      <button onClick={() => openClienteModal(c)} style={styles.actionBtn} className="soft-button">
                        <Eye size={14} />
                        <span>Ficha CRM</span>
                      </button>
                    </td>
                  </tr>
                ))}
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

      {/* MODAL DE DETALLE / FICHA CRM DEL CLIENTE */}
      {selectedCliente && (
        <div style={styles.modalOverlay} onClick={closeClienteModal}>
          <div style={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitleSec}>
                <Users size={20} color="var(--accent-start)" />
                <h3 style={styles.modalTitle}>Ficha de Cliente: {selectedCliente.nombre}</h3>
              </div>
              <button onClick={closeClienteModal} style={styles.modalCloseBtn}>×</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid2Col}>
                
                {/* Formulario/Vista de Información del Cliente */}
                <div style={styles.detailBlock}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 style={styles.sectionSub}>Datos de Contacto</h4>
                    <button 
                      onClick={() => setIsEditing(!isEditing)} 
                      style={styles.editBtn} 
                      className="soft-button"
                    >
                      <Edit2 size={13} /> {isEditing ? 'Cancelar' : 'Editar'}
                    </button>
                  </div>

                  {isEditing ? (
                    <div style={styles.editForm}>
                      <div style={styles.inputGroup}>
                        <label style={styles.inputLabel}>Celular / WhatsApp</label>
                        <input 
                          type="text" 
                          value={editPhone} 
                          onChange={e => setEditPhone(e.target.value)} 
                          style={styles.input} 
                        />
                      </div>
                      <div style={styles.inputGroup}>
                        <label style={styles.inputLabel}>Correo Electrónico</label>
                        <input 
                          type="email" 
                          value={editEmail} 
                          onChange={e => setEditEmail(e.target.value)} 
                          style={styles.input} 
                        />
                      </div>
                      <div style={styles.inputGroup}>
                        <label style={styles.inputLabel}>Dirección de Entrega</label>
                        <input 
                          type="text" 
                          value={editAddress} 
                          onChange={e => setEditAddress(e.target.value)} 
                          style={styles.input} 
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={styles.infoItem}>
                        <FileText size={16} color="var(--text-secondary)" />
                        <div>
                          <div style={styles.infoLabel}>Documento de Identidad</div>
                          <div style={styles.infoVal}>{selectedCliente.documento}</div>
                        </div>
                      </div>
                      <div style={styles.infoItem}>
                        <Phone size={16} color="var(--text-secondary)" />
                        <div>
                          <div style={styles.infoLabel}>Celular / WhatsApp</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={styles.infoVal}>{selectedCliente.telefono}</span>
                            <a 
                              href={`https://wa.me/${selectedCliente.telefono.replace(/[^0-9]/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              style={styles.waLink}
                            >
                              <MessageCircle size={14} /> Chatear
                            </a>
                          </div>
                        </div>
                      </div>
                      <div style={styles.infoItem}>
                        <Mail size={16} color="var(--text-secondary)" />
                        <div>
                          <div style={styles.infoLabel}>Correo Electrónico</div>
                          <div style={styles.infoVal}>{selectedCliente.correo || <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Sin Registrar</span>}</div>
                        </div>
                      </div>
                      <div style={styles.infoItem}>
                        <MapPin size={16} color="var(--text-secondary)" />
                        <div>
                          <div style={styles.infoLabel}>Dirección por Defecto</div>
                          <div style={styles.infoVal}>{selectedCliente.direccion || <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Sin Registrar</span>}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Estadísticas de Consumo */}
                  <div style={styles.statsSummaryBox}>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Consumo E-commerce</h5>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Nro Pedidos</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: 2 }}>{selectedCliente.cantidadPedidos || 0}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Monto Invertido</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-start)', marginTop: 2 }}>S/. {selectedCliente.totalCompras ? selectedCliente.totalCompras.toFixed(2) : '0.00'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notas de Seguimiento Administrativo (CRM) */}
                <div style={styles.detailBlock}>
                  <h4 style={styles.sectionSub}>Notas de CRM y Seguimiento</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>Registra anotaciones privadas del cliente, preferencias de entrega, observaciones de contacto, etc.</p>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Escribe observaciones sobre el cliente (ej: Prefiere recojo los sábados, cliente mayorista, prefiere marcas profesionales...)"
                    style={styles.textarea}
                  />
                  <button 
                    onClick={handleSaveNotes}
                    disabled={actionProcessing}
                    style={styles.saveNotesBtn}
                    className="soft-button"
                  >
                    {actionProcessing ? (
                      <Loader2 size={14} className="spinner" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    <span>Guardar Ficha de Cliente</span>
                  </button>
                </div>

              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={closeClienteModal} style={styles.closeBtn} className="soft-button">
                Cerrar Ficha
              </button>
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
    marginBottom: '20px'
  },
  searchBox: {
    position: 'relative',
    flex: 1
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
  waBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    borderRadius: '8px',
    background: '#E8F5E9',
    color: '#2E7D32',
    fontSize: '0.75rem',
    fontWeight: 700,
    textDecoration: 'none',
    transition: 'opacity 150ms ease',
    ':hover': {
      opacity: 0.8
    }
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
    maxWidth: '750px',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
    gap: '20px'
  },
  detailBlock: {
    background: '#F8FAFC',
    border: '1px solid #ECEFF5',
    borderRadius: '14px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column'
  },
  sectionSub: {
    fontSize: '0.85rem',
    fontWeight: 800,
    color: '#1A1D23',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.02em'
  },
  editBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.72rem',
    fontWeight: 700,
    background: '#FFFFFF',
    border: '1px solid #D1D5DB',
    padding: '4px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    color: 'var(--text-secondary)'
  },
  editForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  inputLabel: {
    fontSize: '0.72rem',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase'
  },
  input: {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #D1D5DB',
    fontSize: '0.82rem',
    outline: 'none'
  },
  infoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    marginBottom: '14px',
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
  statsSummaryBox: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '12px',
    marginTop: '16px'
  },
  textarea: {
    width: '100%',
    height: '140px',
    padding: '10px',
    borderRadius: '10px',
    border: '1px solid #D1D5DB',
    fontSize: '0.83rem',
    outline: 'none',
    resize: 'none',
    background: '#FFFFFF',
    fontFamily: 'inherit',
    lineHeight: 1.4
  },
  saveNotesBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '10px',
    background: '#10B981',
    border: 'none',
    borderRadius: '10px',
    color: '#FFFFFF',
    fontWeight: 600,
    fontSize: '0.8rem',
    marginTop: '12px',
    cursor: 'pointer'
  },
  modalFooter: {
    padding: '14px 24px',
    borderTop: '1px solid #ECEFF5',
    background: '#F8FAFC',
    display: 'flex',
    justifyContent: 'flex-end'
  },
  closeBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    background: '#FFFFFF',
    border: '1px solid #D1D5DB',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.8rem',
    color: '#374151'
  }
};
