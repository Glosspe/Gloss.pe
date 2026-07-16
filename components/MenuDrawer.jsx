'use client';

import React, { useState, useEffect } from 'react';
import { X, Phone, ChevronDown, ChevronUp, Tag, Grid, RotateCcw, Loader2, MapPin, Heart, Layers, Wand2, Award } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useRouter, usePathname } from 'next/navigation';

export default function MenuDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  
  const { 
    isMenuOpen, 
    setIsMenuOpen, 
    selectedCategory, 
    setSelectedCategory,
    selectedBrand,
    setSelectedBrand,
    setSearchQuery,
    setSelectedCategoryLabel,
    parentCategoryLabel,
    setParentCategoryLabel,
    selectedWarehouse,
    setSelectedWarehouse,
    selectedWarehouseName,
    setSelectedWarehouseName,
    favorites
  } = useCart();

  const [categoriesTree, setCategoriesTree] = useState([]);
  const [brands, setBrands] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [tags, setTags] = useState([]); // Etiquetas de preocupación
  const [activeFamily, setActiveFamily] = useState(null); // ID de familia desplegada
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
  const [isBrandsOpen, setIsBrandsOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false); // Acordeón de etiquetas
  const [isWarehousesOpen, setIsWarehousesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Pre-cargar datos dinámicos del ERP una sola vez al montar la aplicación
  useEffect(() => {
    async function loadMenuData() {
      setIsLoading(true);
      try {
        // Cargar árbol de categorías
        const catRes = await fetch('/api/products/categories-tree');
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategoriesTree(catData);
        }

        // Cargar marcas
        const brandRes = await fetch('/api/products/brands');
        if (brandRes.ok) {
          const brandData = await brandRes.json();
          setBrands(brandData);
        }

        // Cargar etiquetas de preocupación
        const tagsRes = await fetch('/api/products/tags');
        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          setTags(tagsData);
        }

        // Cargar sedes
        const whRes = await fetch('/api/admin/warehouses');
        if (whRes.ok) {
          const whData = await whRes.json();
          if (whData.success) {
            setWarehouses(whData.warehouses);
          }
        }
      } catch (err) {
        console.error('[MenuDrawer] Error cargando árbol, marcas, etiquetas y sedes:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMenuData();
  }, []);

  // Formatear texto (Title Case para verse premium y no todo mayúsculas)
  function formatLabel(name) {
    if (!name) return '';
    const connectors = ['de', 'con', 'y', 'para', 'la', 'el', 'los', 'las', 'en'];
    return name
      .toLowerCase()
      .split(/\s+/)
      .map((word, index) => {
        if (index > 0 && connectors.includes(word)) {
          return word;
        }
        // Excepciones de siglas
        if (['ml', 'gr', 'kg', 'fps', 'uv'].includes(word)) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  // Limpiar filtros activos
  const handleClearFilters = () => {
    setSelectedCategory('Trending');
    setSelectedBrand('');
    setSearchQuery('');
    setSelectedCategoryLabel('');
    setParentCategoryLabel('');
    setIsMenuOpen(false);
    
    // Si no estamos en la página de inicio, navegar a ella para ver los productos
    if (pathname !== '/') {
      router.push('/');
    }
  };

  const handleSelectSubcategory = (subId, subName, parentName = '') => {
    setSelectedCategory(subId);
    setSelectedCategoryLabel(formatLabel(subName));
    setParentCategoryLabel(formatLabel(parentName));
    setSelectedBrand(''); // Limpiar marca al elegir categoría
    setSearchQuery(''); // Limpiar buscador
    setIsMenuOpen(false); // Cerrar sidebar
    
    // Si no estamos en la página de inicio, navegar a ella para ver los productos filtrados
    if (pathname !== '/') {
      router.push('/');
    }
  };

  const handleSelectBrand = (brandName) => {
    setSelectedBrand(brandName);
    setSelectedCategory('Todos'); // Resetear a 'Todos' para ver todos los productos de esa marca
    setSelectedCategoryLabel('');
    setSearchQuery(''); // Limpiar buscador
    setIsMenuOpen(false); // Cerrar sidebar
    
    // Si no estamos en la página de inicio, navegar a ella para ver los productos filtrados
    if (pathname !== '/') {
      router.push('/');
    }
  };

  const handleSelectTag = (tagEtiqueta) => {
    setSelectedCategory(tagEtiqueta);
    setSelectedCategoryLabel(`Preocupación: ${tagEtiqueta}`);
    setSelectedBrand(''); // Limpiar marca
    setSearchQuery(''); // Limpiar buscador
    setIsMenuOpen(false); // Cerrar sidebar

    if (pathname !== '/') {
      router.push('/');
    }
  };

  const toggleFamily = (famId) => {
    setActiveFamily(activeFamily === famId ? null : famId);
  };

  const hasActiveFilters = selectedBrand || selectedCategory !== 'Trending';

  // Configurar estilos interactivos con transiciones suaves
  const overlayStyle = {
    ...styles.overlay,
    opacity: isMenuOpen ? 1 : 0,
    pointerEvents: isMenuOpen ? 'auto' : 'none',
    visibility: isMenuOpen ? 'visible' : 'hidden',
  };

  const containerStyle = {
    ...styles.menuContainer,
    transform: isMenuOpen ? 'translateX(0)' : 'translateX(100%)',
  };

  return (
    <div style={overlayStyle} onClick={() => setIsMenuOpen(false)}>
      <div style={containerStyle} onClick={(e) => e.stopPropagation()}>
        {/* Encabezado del Menú */}
        <div style={styles.header}>
          <div style={styles.logoGroup}>
            <h3 style={styles.logoText}>Menú</h3>
          </div>
          <button style={styles.closeButton} onClick={() => setIsMenuOpen(false)}>
            <X size={18} color="var(--text-primary)" strokeWidth={1.3} />
          </button>
        </div>

        {/* Contenido / Filtros */}
        <div style={styles.scrollArea}>
          {isLoading && categoriesTree.length === 0 && (
            <div style={styles.loadingContainer}>
              <Loader2 style={styles.spinner} size={24} />
              <span style={styles.loadingText}>Cargando opciones...</span>
            </div>
          )}

          {(!isLoading || categoriesTree.length > 0) && (
            <div style={styles.filtersWrapper}>
              {/* Botón para Restablecer filtros */}
              {hasActiveFilters && (
                <button style={styles.clearButton} onClick={handleClearFilters}>
                  <RotateCcw size={15} strokeWidth={1.3} />
                  <span>Limpiar Filtros del Catálogo</span>
                </button>
              )}

              {/* SECCIÓN FAVORITOS (Primer apartado del menú) */}
              <button 
                onClick={() => {
                  router.push('/favorites');
                  setIsMenuOpen(false);
                }}
                style={{
                  ...styles.sectionCard,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  backgroundColor: pathname === '/favorites' ? 'rgba(255, 94, 166, 0.04)' : '#FFFFFF',
                  borderColor: pathname === '/favorites' ? '#FF5EA6' : 'rgba(0, 0, 0, 0.04)',
                  borderStyle: 'solid',
                  borderWidth: '1px',
                  cursor: 'pointer',
                  width: '100%',
                  textAlign: 'left',
                  textDecoration: 'none',
                  borderRadius: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.01)',
                  marginBottom: '14px',
                  transition: 'all 0.2s',
                  outline: 'none',
                }}
                className="menu-favorites-btn"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Heart 
                    size={18} 
                    color={pathname === '/favorites' ? '#FF5EA6' : '#64748B'} 
                    strokeWidth={1.3} 
                    fill={pathname === '/favorites' ? '#FF5EA6' : (favorites.length > 0 ? "rgba(255, 94, 166, 0.15)" : "none")} 
                  />
                  <span style={{ 
                    fontSize: '0.88rem', 
                    fontWeight: pathname === '/favorites' ? '700' : '600', 
                    color: pathname === '/favorites' ? '#FF5EA6' : 'var(--text-primary)' 
                  }}>
                    Mis Favoritos
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {favorites.length > 0 ? (
                    <span style={{
                      backgroundColor: pathname === '/favorites' ? '#FF5EA6' : '#64748B',
                      color: '#FFFFFF',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}>
                      {favorites.length}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>0</span>
                  )}
                </div>
              </button>

              {/* SECCIÓN CATEGORÍAS */}
              <div style={styles.sectionCard}>
                <button 
                  style={styles.sectionHeader}
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                >
                  <div style={styles.sectionTitleGroup}>
                    <Layers size={16} color="#64748B" strokeWidth={1.3} />
                    <span style={styles.sectionTitle}>Categorías</span>
                  </div>
                  {isCategoriesOpen ? <ChevronUp size={15} strokeWidth={1.3} /> : <ChevronDown size={15} strokeWidth={1.3} />}
                </button>

                {isCategoriesOpen && (
                  <div style={styles.familiesList}>
                    {categoriesTree.map((fam) => {
                      const isExpanded = activeFamily === fam.id;
                      return (
                        <div key={fam.id} style={styles.familyItem}>
                          <button 
                            style={{
                              ...styles.familyHeader,
                              backgroundColor: isExpanded ? 'rgba(255, 94, 166, 0.02)' : 'transparent'
                            }}
                            onClick={() => toggleFamily(fam.id)}
                          >
                            <span style={{
                              ...styles.familyName,
                              color: isExpanded ? '#FF5EA6' : 'var(--text-primary)',
                              fontWeight: isExpanded ? '700' : '600'
                            }}>{formatLabel(fam.name)}</span>
                            {isExpanded ? (
                              <ChevronUp size={14} color="#FF5EA6" strokeWidth={1.3} />
                            ) : (
                              <ChevronDown size={14} color="#64748B" strokeWidth={1.3} />
                            )}
                          </button>

                          {isExpanded && (
                            <div style={styles.subcategoriesList}>
                              {fam.subcategories.map((sub) => {
                                const isSubActive = selectedCategory === sub.id;
                                return (
                                  <button
                                    key={sub.id}
                                    style={{
                                      ...styles.subcategoryBtn,
                                      color: isSubActive ? '#FF5EA6' : 'var(--text-primary)',
                                      fontWeight: isSubActive ? '600' : '500',
                                      backgroundColor: isSubActive ? 'rgba(255, 94, 166, 0.04)' : 'transparent',
                                      padding: '8px 10px',
                                      borderRadius: '10px'
                                    }}
                                    onClick={() => handleSelectSubcategory(sub.id, sub.name, fam.name)}
                                  >
                                    <div style={{
                                      ...styles.bulletDot,
                                      backgroundColor: isSubActive ? '#FF5EA6' : 'transparent',
                                      borderColor: isSubActive ? '#FF5EA6' : '#D1D5DB',
                                      width: '6px',
                                      height: '6px'
                                    }} />
                                    <span>{formatLabel(sub.name)}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECCIÓN PREOCUPACIÓN / NECESIDAD */}
              {tags.length > 0 && (
                <div style={styles.sectionCard}>
                  <button 
                    style={styles.sectionHeader}
                    onClick={() => setIsTagsOpen(!isTagsOpen)}
                  >
                    <div style={styles.sectionTitleGroup}>
                      <Wand2 size={16} color="#64748B" strokeWidth={1.3} />
                      <span style={styles.sectionTitle}>Preocupación / Necesidad</span>
                    </div>
                    {isTagsOpen ? <ChevronUp size={15} strokeWidth={1.3} /> : <ChevronDown size={15} strokeWidth={1.3} />}
                  </button>

                  {isTagsOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 12px 16px 12px' }}>
                      {tags.map((tagItem) => {
                        const isTagActive = selectedCategory === tagItem.etiqueta;
                        return (
                          <button
                            key={tagItem.id}
                            style={{
                              ...styles.subcategoryBtn,
                              color: isTagActive ? '#FF5EA6' : 'var(--text-primary)',
                              fontWeight: isTagActive ? '600' : '500',
                              backgroundColor: isTagActive ? 'rgba(255, 94, 166, 0.04)' : 'transparent',
                              padding: '8px 10px',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              background: 'none',
                              border: 'none',
                              width: '100%',
                              cursor: 'pointer',
                              fontFamily: 'var(--font-body)',
                              fontSize: '0.82rem',
                              borderRadius: '10px'
                            }}
                            onClick={() => handleSelectTag(tagItem.etiqueta)}
                          >
                            <div style={{
                              ...styles.bulletDot,
                              backgroundColor: isTagActive ? '#FF5EA6' : 'transparent',
                              borderColor: isTagActive ? '#FF5EA6' : '#D1D5DB',
                              width: '6px',
                              height: '6px'
                            }} />
                            <span>{tagItem.etiqueta}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SECCIÓN MARCAS */}
              <div style={styles.sectionCard}>
                <button 
                  style={styles.sectionHeader}
                  onClick={() => setIsBrandsOpen(!isBrandsOpen)}
                >
                  <div style={styles.sectionTitleGroup}>
                    <Award size={16} color="#64748B" strokeWidth={1.3} />
                    <span style={styles.sectionTitle}>Marcas</span>
                  </div>
                  {isBrandsOpen ? <ChevronUp size={15} strokeWidth={1.3} /> : <ChevronDown size={15} strokeWidth={1.3} />}
                </button>

                {isBrandsOpen && (
                  <div style={styles.brandsGrid}>
                    {brands.map((brand) => {
                      const isBrandActive = selectedBrand === brand.name;
                      return (
                        <button
                          key={brand.name}
                          style={{
                            ...styles.brandBtn,
                            borderColor: isBrandActive ? '#FF5EA6' : 'rgba(142, 154, 167, 0.08)',
                            backgroundColor: isBrandActive ? 'rgba(255, 94, 166, 0.04)' : '#F8FAFC',
                            color: isBrandActive ? '#FF5EA6' : 'var(--text-primary)',
                            fontWeight: isBrandActive ? '600' : '500'
                          }}
                          onClick={() => handleSelectBrand(brand.name)}
                        >
                          {formatLabel(brand.name)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECCIÓN SEDES */}
              <div style={styles.sectionCard}>
                <button 
                  style={styles.sectionHeader}
                  onClick={() => setIsWarehousesOpen(!isWarehousesOpen)}
                >
                  <div style={styles.sectionTitleGroup}>
                    <MapPin size={16} color="#64748B" strokeWidth={1.3} />
                    <span style={styles.sectionTitle}>Nuestras Sedes</span>
                  </div>
                  {isWarehousesOpen ? <ChevronUp size={15} strokeWidth={1.3} /> : <ChevronDown size={15} strokeWidth={1.3} />}
                </button>

                {isWarehousesOpen && (
                  <div style={styles.warehousesList}>
                    {/* Opción para Ver Todas */}
                    <button
                      style={{
                        ...styles.warehouseBtn,
                        borderColor: selectedWarehouse === 'all' ? '#FF5EA6' : 'rgba(142, 154, 167, 0.08)',
                        backgroundColor: selectedWarehouse === 'all' ? 'rgba(255, 94, 166, 0.04)' : '#F8FAFC',
                        color: selectedWarehouse === 'all' ? '#FF5EA6' : 'var(--text-primary)',
                        fontWeight: '600',
                        marginBottom: '12px',
                        width: '100%',
                        justifyContent: 'center',
                        border: '1px solid',
                      }}
                      onClick={() => {
                        setSelectedWarehouse('all');
                        setSelectedWarehouseName('Todas las Sedes');
                        setIsMenuOpen(false);
                      }}
                    >
                      <MapPin size={14} strokeWidth={1.3} />
                      <span>Todas las Sedes (Consolidado)</span>
                    </button>

                    {/* Agrupar por Región */}
                    {['Chiclayo', 'Jaén'].map(region => {
                      const WAREHOUSE_REGIONS = {
                        'Chiclayo': ['01', '02', '04', '06'],
                        'Jaén': ['05']
                      };
                      const regionWHs = warehouses.filter(w => WAREHOUSE_REGIONS[region].includes(w.codalm));
                      if (regionWHs.length === 0) return null;

                      const isRegionActive = selectedWarehouse === region;

                      return (
                        <div key={region} style={styles.regionGroup}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWarehouse(region);
                              setSelectedWarehouseName(region);
                              setIsMenuOpen(false);
                            }}
                            style={{
                              ...styles.regionSelectBtn,
                              color: isRegionActive ? '#FF5EA6' : 'var(--text-primary)',
                              fontWeight: isRegionActive ? '600' : '500'
                            }}
                          >
                            <span style={styles.regionTitleText}>{region}</span>
                            <span style={styles.regionSelectText}>Seleccionar Región</span>
                          </button>

                          <div style={styles.regionWarehousesGrid}>
                            {regionWHs.map(w => {
                              const isWarehouseActive = selectedWarehouse === w.codalm;
                              return (
                                <button
                                  key={w.codalm}
                                  type="button"
                                  onClick={() => {
                                    setSelectedWarehouse(w.codalm);
                                    setSelectedWarehouseName(w.descripcion);
                                    setIsMenuOpen(false);
                                  }}
                                  style={{
                                    ...styles.warehouseItemCard,
                                    borderColor: isWarehouseActive ? '#FF5EA6' : 'rgba(142, 154, 167, 0.08)',
                                    backgroundColor: isWarehouseActive ? 'rgba(255, 94, 166, 0.04)' : '#F8FAFC',
                                    color: isWarehouseActive ? '#FF5EA6' : 'var(--text-primary)'
                                  }}
                                >
                                  <span style={{
                                    ...styles.warehouseItemName,
                                    fontWeight: isWarehouseActive ? '700' : '600'
                                  }}>
                                    {formatLabel(w.descripcion)}
                                  </span>
                                  {w.direccion && (
                                    <span style={styles.warehouseItemAddress}>
                                      {formatLabel(w.direccion)}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer del Menú / WhatsApp */}
        <div style={styles.footer}>
          <a 
            href={`https://api.whatsapp.com/send?phone=51900000000&text=Hola%20Tienda%20Gloss,%20tengo%20una%20consulta.`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsMenuOpen(false)}
            style={styles.whatsappBtn}
          >
            <Phone size={15} strokeWidth={1.3} />
            <span>Contacto WhatsApp</span>
          </a>
          <span style={styles.footerText}>© 2026 Tienda Gloss.</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(28, 42, 56, 0.4)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 2000,
    display: 'flex',
    justifyContent: 'flex-end',
    transition: 'opacity 0.28s cubic-bezier(0.25, 1, 0.5, 1), visibility 0.28s cubic-bezier(0.25, 1, 0.5, 1)',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: '310px',
    height: '100%',
    boxShadow: '-10px 0 40px rgba(165, 177, 194, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid rgba(142, 154, 167, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoText: {
    fontFamily: 'var(--font-body), sans-serif',
    fontSize: '1.25rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    letterSpacing: '0.02em',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    gap: '12px',
  },
  spinner: {
    animation: 'spin 1.5s linear infinite',
    color: 'var(--accent-start)',
  },
  loadingText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
  },
  filtersWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  clearButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 14px',
    backgroundColor: '#FFF2F6',
    border: '1px dashed var(--accent-start)',
    borderRadius: '16px',
    color: 'var(--accent-start)',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'background-color 0.2s ease',
  },
  sectionCard: {
    border: '1px solid rgba(142, 154, 167, 0.08)',
    borderRadius: '20px',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  sectionHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    outline: 'none',
    color: 'var(--text-primary)',
  },
  sectionTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    fontFamily: 'var(--font-body)',
  },
  familiesList: {
    padding: '0 8px 12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  familyItem: {
    borderRadius: '14px',
    overflow: 'hidden',
  },
  familyHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    background: 'none',
    textAlign: 'left',
    outline: 'none',
    transition: 'background-color 0.2s ease',
  },
  familyName: {
    fontSize: '0.88rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
  },
  subcategoriesList: {
    padding: '6px 12px 10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: '#FAF9F8',
    borderRadius: '0 0 12px 12px',
  },
  subcategoryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '0.82rem',
    fontFamily: 'var(--font-body)',
    width: '100%',
  },
  bulletDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    border: '1.5px solid #D1D5DB',
  },
  brandsGrid: {
    padding: '0 12px 16px 12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  brandBtn: {
    padding: '10px 6px',
    borderRadius: '12px',
    border: '1px solid',
    fontSize: '0.78rem',
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.2s ease',
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(142, 154, 167, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  whatsappBtn: {
    width: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: 'var(--accent-gradient)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '16px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    boxShadow: 'var(--button-shadow)',
    transition: 'transform 0.2s ease',
  },
  footerText: {
    fontSize: '0.65rem',
    color: 'var(--text-secondary)',
    marginTop: '4px',
  },
  warehousesList: {
    padding: '0 12px 16px 12px',
    display: 'flex',
    flexDirection: 'column',
  },
  warehouseBtn: {
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  regionGroup: {
    marginTop: '6px',
    marginBottom: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  regionSelectBtn: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    padding: '4px 2px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    outline: 'none',
    borderBottom: '1px solid rgba(142, 154, 167, 0.08)',
    paddingBottom: '6px',
    marginBottom: '6px',
  },
  regionTitleText: {
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  regionSelectText: {
    fontSize: '0.72rem',
    textTransform: 'none',
  },
  regionWarehousesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  warehouseItemCard: {
    padding: '10px 12px',
    borderRadius: '14px',
    border: '1px solid',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  warehouseItemName: {
    fontSize: '0.82rem',
  },
  warehouseItemAddress: {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.3',
  },
};
