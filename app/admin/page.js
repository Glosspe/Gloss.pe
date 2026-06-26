'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Search, Image as ImageIcon, Save, CheckCircle, AlertCircle, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);
  
  // Estados de carga y búsqueda
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Producto seleccionado para editar
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Campos del editor
  const [imageUrl, setImageUrl] = useState('');
  const [richDescription, setRichDescription] = useState('');
  const [isTrending, setIsTrending] = useState(false);

  // 1. Proteger ruta en el cliente
  useEffect(() => {
    const token = localStorage.getItem('gloss_admin_token');
    const user = localStorage.getItem('gloss_admin_user');
    
    if (!token) {
      router.push('/admin/login');
    } else {
      setAdminUser(user ? JSON.parse(user) : { nombre: 'Administrador' });
      loadProducts('');
    }
  }, [router]);

  // 2. Cargar productos desde la API (conecta a SQL Server/PostgreSQL)
  const loadProducts = async (query = '') => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      // Consultamos todos los productos (sin filtrar por categoría para ver el catálogo completo)
      const response = await fetch(`/api/products/search?category=Todos&q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        setMessage({ type: 'error', text: 'Error al obtener productos del ERP.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error de red al consultar productos.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar productos
  const handleSearch = (e) => {
    e.preventDefault();
    loadProducts(searchQuery);
  };

  // Seleccionar producto para editar
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    // Rellenar campos del editor con la info actual
    setImageUrl(product.images && product.images.length > 0 ? product.images[0] : product.image || '');
    setRichDescription(product.description || '');
    setIsTrending(product.category === 'Trending' || product.destacado || false);
    setMessage({ type: '', text: '' });
  };

  // Guardar cambios en PostgreSQL
  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsSaving(true);
    setMessage({ type: '', text: '' });

    const token = localStorage.getItem('gloss_admin_token');

    try {
      const response = await fetch('/api/admin/products/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          codart: selectedProduct.id,
          imagenes: imageUrl.trim() !== '' ? [imageUrl.trim()] : [],
          descripcionEnriquecida: richDescription,
          destacado: isTrending
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: '¡Producto actualizado con éxito!' });
        
        // Actualizar el producto en la lista local sin tener que volver a consultar
        setProducts(prevProducts => 
          prevProducts.map(p => 
            p.id === selectedProduct.id 
              ? { 
                  ...p, 
                  image: imageUrl.trim() !== '' ? imageUrl.trim() : p.image, 
                  images: imageUrl.trim() !== '' ? [imageUrl.trim()] : [], 
                  description: richDescription, 
                  destacado: isTrending,
                  category: isTrending ? 'Trending' : p.category
                } 
              : p
          )
        );
        
        // Actualizar también el producto seleccionado en pantalla
        setSelectedProduct(prev => ({
          ...prev,
          image: imageUrl.trim() !== '' ? imageUrl.trim() : prev.image,
          images: imageUrl.trim() !== '' ? [imageUrl.trim()] : [],
          description: richDescription,
          destacado: isTrending,
          category: isTrending ? 'Trending' : prev.category
        }));
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error de red al intentar guardar.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gloss_admin_token');
    localStorage.removeItem('gloss_admin_user');
    router.push('/admin/login');
  };

  return (
    <div style={styles.container}>
      {/* Barra Superior */}
      <header style={styles.header} className="glass-menu">
        <div style={styles.headerContent}>
          <div style={styles.logoGroup}>
            <Sparkles size={20} color="var(--accent-start)" />
            <h1 style={styles.logo}>Gloss Admin</h1>
            <span style={styles.badge}>Moda & Belleza</span>
          </div>
          <div style={styles.userGroup}>
            <span style={styles.userName}>{adminUser?.nombre}</span>
            <button onClick={handleLogout} style={styles.logoutButton}>
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Grid del Dashboard */}
      <div className="dashboard-grid">
        {/* Panel Izquierdo: Lista de Productos */}
        <div style={styles.leftPanel}>
          <div style={styles.panelCard} className="soft-card">
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>Catálogo de Navasoft ERP</h3>
              <button onClick={() => loadProducts(searchQuery)} style={styles.refreshButton}>
                <RefreshCw size={16} />
              </button>
            </div>

            {/* Buscador de Productos */}
            <form onSubmit={handleSearch} style={styles.searchForm}>
              <div style={styles.searchBox}>
                <Search size={18} color="var(--text-secondary)" style={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Buscar por código, nombre o marca..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                />
              </div>
              <button type="submit" style={styles.searchBtn} className="soft-button">
                Buscar
              </button>
            </form>

            {/* Listado de Productos */}
            <div style={styles.productsList}>
              {isLoading ? (
                <div style={styles.loadingState}>
                  <Loader2 size={32} className="spinner" color="var(--accent-start)" />
                  <p style={styles.loadingText}>Cargando productos de Navasoft...</p>
                </div>
              ) : products.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No se encontraron productos.</p>
                </div>
              ) : (
                products.map((prod) => {
                  const isSelected = selectedProduct?.id === prod.id;
                  const hasCustomImage = prod.images && prod.images.length > 0;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleSelectProduct(prod)}
                      style={{
                        ...styles.productItem,
                        backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent',
                        borderColor: isSelected ? 'var(--accent-start)' : 'rgba(142, 154, 167, 0.08)'
                      }}
                    >
                      <div style={styles.prodListImageContainer}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={prod.image} alt={prod.name} style={styles.prodListImage} />
                      </div>
                      <div style={styles.prodListInfo}>
                        <h4 style={styles.prodListName}>{prod.name}</h4>
                        <div style={styles.prodListMeta}>
                          <span style={styles.prodListCode}>{prod.id}</span>
                          <span style={styles.prodListPrice}>S/ {prod.price}</span>
                          {hasCustomImage && (
                            <span style={styles.imageBadge}>Con Foto</span>
                          )}
                          {prod.destacado && (
                            <span style={styles.trendingBadge}>Destacado</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Panel Derecho: Editor de Productos */}
        <div style={styles.rightPanel}>
          {selectedProduct ? (
            <div style={styles.panelCard} className="soft-card">
              <h3 style={styles.panelTitle}>Enriquecer Detalles Web</h3>
              <p style={styles.panelSubtitle}>Personaliza las fotos y descripciones que verán tus clientes en internet.</p>

              {message.text && (
                <div style={{
                  ...styles.alert,
                  backgroundColor: message.type === 'success' ? 'rgba(46, 204, 113, 0.08)' : 'rgba(235, 94, 85, 0.08)',
                  borderColor: message.type === 'success' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(235, 94, 85, 0.2)'
                }}>
                  {message.type === 'success' ? (
                    <CheckCircle size={18} color="#2ECC71" />
                  ) : (
                    <AlertCircle size={18} color="#EB5E55" />
                  )}
                  <span style={{
                    ...styles.alertText,
                    color: message.type === 'success' ? '#2ECC71' : '#EB5E55'
                  }}>{message.text}</span>
                </div>
              )}

              {/* Ficha rápida del ERP */}
              <div style={styles.erpSummary}>
                <div style={styles.erpSummaryItem}>
                  <span style={styles.erpLabel}>Código ERP</span>
                  <span style={styles.erpValue}>{selectedProduct.id}</span>
                </div>
                <div style={styles.erpSummaryItem}>
                  <span style={styles.erpLabel}>Nombre original ERP</span>
                  <span style={styles.erpValue}>{selectedProduct.name}</span>
                </div>
                <div style={styles.erpSummaryItem}>
                  <span style={styles.erpLabel}>Marca / Stock</span>
                  <span style={styles.erpValue}>{selectedProduct.brand} | {selectedProduct.stock} und.</span>
                </div>
                <div style={styles.erpSummaryItem}>
                  <span style={styles.erpLabel}>Precio ERP</span>
                  <span style={styles.erpValue}>S/ {selectedProduct.price}</span>
                </div>
              </div>

              <form onSubmit={handleSave} style={styles.editorForm}>
                {/* Checkbox Destacado (Trending) */}
                <div style={styles.checkboxGroup}>
                  <input
                    type="checkbox"
                    id="isTrending"
                    checked={isTrending}
                    onChange={(e) => setIsTrending(e.target.checked)}
                    style={styles.checkbox}
                  />
                  <label htmlFor="isTrending" style={styles.checkboxLabel}>
                    Destacar en la Página de Inicio (Sección Trending)
                  </label>
                </div>

                {/* URL de Imagen */}
                <div style={styles.inputGroup}>
                  <label style={styles.label} htmlFor="imageUrl">URL de Imagen del Producto *</label>
                  <div style={styles.inputIconWrapper}>
                    <ImageIcon size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                    <input
                      type="url"
                      id="imageUrl"
                      placeholder="Pegar enlace de imagen (ej. de Unsplash o servidor)"
                      required
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  {imageUrl && (
                    <div style={styles.previewContainer}>
                      <span style={styles.previewLabel}>Vista Previa:</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt="Vista previa" style={styles.previewImage} onError={(e) => {
                        e.target.src = 'https://via.placeholder.com/150?text=Error+Carga';
                      }} />
                    </div>
                  )}
                </div>

                {/* Descripción enriquecida */}
                <div style={styles.inputGroup}>
                  <label style={styles.label} htmlFor="richDescription">Descripción de Venta (Larga)</label>
                  <textarea
                    id="richDescription"
                    placeholder="Escribe los beneficios, ingredientes, cómo aplicar el producto..."
                    rows={6}
                    value={richDescription}
                    onChange={(e) => setRichDescription(e.target.value)}
                    style={styles.textarea}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  style={styles.saveButton}
                  className="soft-button"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      Guardando cambios...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Guardar Detalles Web
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div style={styles.noSelectedCard} className="soft-card">
              <ImageIcon size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
              <h4>Selecciona un producto</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '6px' }}>
                Elige un artículo de la lista de la izquierda para enriquecer su imagen, descripción y destacar en la Tienda Gloss.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderBottom: '1px solid rgba(142, 154, 167, 0.08)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    padding: '12px 24px',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logo: {
    fontFamily: 'var(--font-title)',
    fontWeight: '700',
    fontSize: '1.3rem',
  },
  badge: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: 'var(--accent-start)',
    backgroundColor: 'var(--accent-soft)',
    padding: '4px 8px',
    borderRadius: '8px',
  },
  userGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userName: {
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  logoutButton: {
    background: 'none',
    border: 'none',
    color: '#EB5E55',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dashboardGrid: {
    display: 'flex',
    flexDirection: 'row',
    maxWidth: '1200px',
    width: '100%',
    margin: '24px auto',
    padding: '0 20px',
    gap: '24px',
    flex: 1,
  },
  leftPanel: {
    flex: 1,
    minWidth: '350px',
  },
  rightPanel: {
    flex: 1.2,
  },
  panelCard: {
    padding: '24px',
    backgroundColor: '#FFFFFF',
    height: 'calc(100vh - 150px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  panelTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
  },
  panelSubtitle: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    marginBottom: '18px',
    marginTop: '-4px',
  },
  refreshButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
  },
  searchForm: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  searchBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    border: '1px solid rgba(142, 154, 167, 0.15)',
    borderRadius: '16px',
    padding: '0 12px',
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    marginRight: '8px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    height: '42px',
    fontSize: '0.85rem',
    fontFamily: 'var(--font-body)',
  },
  searchBtn: {
    padding: '0 16px',
    borderRadius: '16px',
    height: '44px',
  },
  productsList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingRight: '4px',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    gap: '12px',
  },
  loadingText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px',
    color: 'var(--text-secondary)',
  },
  productItem: {
    display: 'flex',
    gap: '12px',
    padding: '10px',
    borderRadius: '16px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  prodListImageContainer: {
    width: '50px',
    height: '50px',
    borderRadius: '10px',
    backgroundColor: '#FAF9F8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  prodListImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  prodListInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  prodListName: {
    fontSize: '0.85rem',
    fontWeight: '600',
    lineHeight: '1.2',
    display: '-webkit-box',
    WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  prodListMeta: {
    display: 'flex',
    gap: '10px',
    marginTop: '4px',
    alignItems: 'center',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  prodListCode: {
    fontWeight: '600',
  },
  prodListPrice: {
    fontWeight: '700',
    color: 'var(--text-primary)',
  },
  imageBadge: {
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    color: '#2ECC71',
    padding: '2px 6px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '0.65rem',
  },
  trendingBadge: {
    backgroundColor: 'var(--accent-soft)',
    color: 'var(--accent-start)',
    padding: '2px 6px',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '0.65rem',
  },
  noSelectedCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 'calc(100vh - 150px)',
    padding: '40px',
    backgroundColor: '#FFFFFF',
    color: 'var(--text-primary)',
  },
  erpSummary: {
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '16px',
    padding: '16px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  erpSummaryItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  erpLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  erpValue: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    display: '-webkit-box',
    WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  editorForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    flex: 1,
    overflowY: 'auto',
    paddingRight: '4px',
  },
  checkboxGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--accent-soft)',
    padding: '12px 16px',
    borderRadius: '16px',
    border: '1px solid rgba(216, 27, 96, 0.15)',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: 'var(--accent-start)',
  },
  checkboxLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
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
  input: {
    width: '100%',
    height: '46px',
    paddingLeft: '48px',
    paddingRight: '16px',
    border: '1px solid rgba(142, 154, 167, 0.15)',
    borderRadius: '16px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    outline: 'none',
  },
  previewContainer: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  previewLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  previewImage: {
    maxWidth: '120px',
    maxHeight: '120px',
    borderRadius: '12px',
    border: '1px solid rgba(142, 154, 167, 0.1)',
    objectFit: 'contain',
    backgroundColor: '#FAF9F8',
    padding: '4px',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid rgba(142, 154, 167, 0.15)',
    borderRadius: '16px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    outline: 'none',
    resize: 'none',
  },
  saveButton: {
    width: '100%',
    height: '48px',
    marginTop: '10px',
    flexShrink: 0,
  },
  alert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid',
    padding: '10px 16px',
    borderRadius: '16px',
    marginBottom: '16px',
  },
  alertText: {
    fontSize: '0.85rem',
    fontWeight: '600',
  },
};
