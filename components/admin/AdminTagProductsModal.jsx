'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Search, Package, AlertCircle, Loader2 } from 'lucide-react';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    padding: '24px',
    animation: 'adminModalOverlayIn 0.2s ease-out forwards',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '680px',
    height: '80vh',
    maxHeight: '650px',
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.05)',
    animation: 'adminModalCardIn 0.25s ease-out forwards',
    overflow: 'hidden',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #F1F5F9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  titleArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#0F172A',
    fontFamily: 'var(--font-title, inherit)',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.78rem',
    color: '#64748B',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '10px',
    color: '#94A3B8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s, color 0.15s',
  },
  searchBar: {
    padding: '14px 24px',
    borderBottom: '1px solid #F1F5F9',
    backgroundColor: '#F8FAFC',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
  },
  searchInputWrapper: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    color: '#94A3B8',
  },
  searchInput: {
    width: '100%',
    height: '38px',
    paddingLeft: '38px',
    paddingRight: '12px',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    fontSize: '0.85rem',
    outline: 'none',
    backgroundColor: '#ffffff',
    transition: 'all 0.15s ease',
    fontFamily: 'var(--font-body)',
  },
  productCountBadge: {
    fontSize: '0.72rem',
    fontWeight: 600,
    color: '#475569',
    backgroundColor: '#E2E8F0',
    padding: '4px 10px',
    borderRadius: '20px',
    whiteSpace: 'nowrap',
  },
  listArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 24px',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  productRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '10px 12px',
    borderRadius: '12px',
    border: '1px solid #F1F5F9',
    backgroundColor: '#FFFFFF',
    transition: 'all 0.15s ease',
  },
  productImage: {
    width: '46px',
    height: '46px',
    borderRadius: '8px',
    objectFit: 'cover',
    backgroundColor: '#F8FAFC',
    border: '1px solid #F1F5F9',
    flexShrink: 0,
  },
  productImagePlaceholder: {
    width: '46px',
    height: '46px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 46, 147, 0.04)',
    border: '1px dashed rgba(255, 46, 147, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent-start)',
    flexShrink: 0,
  },
  productDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  productName: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#1E293B',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  productMeta: {
    fontSize: '0.7rem',
    color: '#64748B',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  productMetaDivider: {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    backgroundColor: '#CBD5E1',
  },
  stockBadge: (stock) => ({
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '6px',
    backgroundColor: stock > 5 ? '#E6F4EA' : '#FCE8E6',
    color: stock > 5 ? '#137333' : '#C5221F',
  }),
  priceTag: {
    fontSize: '0.82rem',
    fontWeight: 700,
    color: '#0F172A',
    flexShrink: 0,
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0',
    gap: '12px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 24px',
    textAlign: 'center',
    gap: '12px',
  },
  emptyTitle: {
    fontSize: '0.88rem',
    fontWeight: 600,
    color: '#475569',
    margin: 0,
  },
  emptyDesc: {
    fontSize: '0.78rem',
    color: '#94A3B8',
    margin: 0,
    maxWidth: '280px',
    lineHeight: '1.4',
  },
};

const keyframesCSS = `
  @keyframes adminModalOverlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes adminModalCardIn {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(12px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;

export default function AdminTagProductsModal({ isOpen, tag, onClose }) {
  const [catalog, setCatalog] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Guardar catálogo cargado globalmente en cache local para no re-descargar
  // si se abren modales de diferentes etiquetas
  useEffect(() => {
    if (isOpen && catalog.length === 0) {
      loadCatalog();
    }
  }, [isOpen]);

  const loadCatalog = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/products/search?category=Todos&limit=all&includeHidden=true');
      if (response.ok) {
        const data = await response.json();
        setCatalog(data);
      }
    } catch (err) {
      console.error('[AdminTagProductsModal] Error al precargar productos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Filtrar productos asociados a la etiqueta
  const associatedProducts = useMemo(() => {
    if (!tag || !tag.productos) return [];
    
    // Convertir a conjunto de códigos limpios
    const codesSet = new Set(tag.productos.map(code => String(code).trim().toLowerCase()));
    
    // Mapear desde el catálogo local
    return catalog.filter(p => codesSet.has(String(p.id).trim().toLowerCase()));
  }, [tag, catalog]);

  // Si no se encuentran en la búsqueda (ej. códigos del ERP que aún no se han indexado
  // o no han sincronizado imágenes), mostramos información cruda del ERP.
  const unmatchedCodes = useMemo(() => {
    if (!tag || !tag.productos) return [];
    const matchedIds = new Set(associatedProducts.map(p => String(p.id).trim().toLowerCase()));
    return tag.productos.filter(code => !matchedIds.has(String(code).trim().toLowerCase()));
  }, [tag, associatedProducts]);

  // Filtrar por término de búsqueda en el input
  const filteredList = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return associatedProducts;
    return associatedProducts.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.id.toLowerCase().includes(term) || 
      (p.brand && p.brand.toLowerCase().includes(term))
    );
  }, [associatedProducts, searchTerm]);

  if (!isOpen || !tag) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
      <style>{keyframesCSS}</style>
      <div style={styles.overlay} onClick={handleOverlayClick}>
        <div style={styles.card}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.titleArea}>
              <h3 style={styles.title}>Productos en {tag.etiqueta}</h3>
              <p style={styles.subtitle}>Listado de productos asociados mediante el motor inteligente de Gloss</p>
            </div>
            <button 
              style={styles.closeButton}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
                e.currentTarget.style.color = '#334155';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#94A3B8';
              }}
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search bar inside modal */}
          <div style={styles.searchBar}>
            <div style={styles.searchInputWrapper}>
              <Search size={16} style={styles.searchIcon} />
              <input 
                type="text"
                placeholder="Buscar por código, nombre o marca..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <div style={styles.productCountBadge}>
              {associatedProducts.length} producto{associatedProducts.length !== 1 ? 's' : ''} indexado{associatedProducts.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* List Area */}
          <div style={styles.listArea}>
            {isLoading ? (
              <div style={styles.loadingState}>
                <Loader2 size={32} color="var(--accent-start)" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Cargando catálogo central...</span>
              </div>
            ) : associatedProducts.length === 0 ? (
              <div style={styles.emptyState}>
                <AlertCircle size={36} color="#94A3B8" />
                <h4 style={styles.emptyTitle}>Sin productos cargados</h4>
                <p style={styles.emptyDesc}>
                  Los {tag.productos.length} códigos asociados de este filtro aún no se han sincronizado con las imágenes de la base de datos de la web.
                </p>
              </div>
            ) : (
              <>
                {/* Lista de productos encontrados */}
                {filteredList.map(p => (
                  <div 
                    key={p.id} 
                    style={styles.productRow}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 46, 147, 0.12)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(142, 154, 167, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#F1F5F9';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {p.image ? (
                      <img src={p.image} alt={p.name} style={styles.productImage} />
                    ) : (
                      <div style={styles.productImagePlaceholder}>
                        <Package size={18} />
                      </div>
                    )}
                    <div style={styles.productDetails}>
                      <h4 style={styles.productName} title={p.name}>{p.name}</h4>
                      <div style={styles.productMeta}>
                        <span>ID: {p.id}</span>
                        <div style={styles.productMetaDivider} />
                        <span>{p.brand}</span>
                        <div style={styles.productMetaDivider} />
                        <span style={styles.stockBadge(p.stock)}>
                          {p.stock} und.
                        </span>
                        {!p.visible && (
                          <>
                            <div style={styles.productMetaDivider} />
                            <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#F3F4F6', color: '#4B5563', fontWeight: 600 }}>
                              Oculto en Web
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={styles.priceTag}>
                      S/ {p.price.toFixed(2)}
                    </div>
                  </div>
                ))}

                {/* Si hay códigos ERP no cruzados aún */}
                {unmatchedCodes.length > 0 && searchTerm === '' && (
                  <div style={{ marginTop: '16px', padding: '14px', borderRadius: '12px', border: '1px dashed #E2E8F0', backgroundColor: '#F8FAFC' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Códigos del ERP pendientes de indexación ({unmatchedCodes.length})
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '80px', overflowY: 'auto' }}>
                      {unmatchedCodes.map((code, idx) => (
                        <span key={idx} style={{ fontSize: '0.68rem', backgroundColor: '#E2E8F0', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
