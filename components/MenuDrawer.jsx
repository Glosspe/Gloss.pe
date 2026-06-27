'use client';

import React, { useState, useEffect } from 'react';
import { X, Phone, ChevronDown, ChevronUp, Tag, Grid, RotateCcw, Loader2, MapPin } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function MenuDrawer() {
  const { 
    isMenuOpen, 
    setIsMenuOpen, 
    selectedCategory, 
    setSelectedCategory,
    selectedBrand,
    setSelectedBrand,
    setSearchQuery,
    setSelectedCategoryLabel,
    selectedWarehouse,
    setSelectedWarehouse,
    selectedWarehouseName,
    setSelectedWarehouseName
  } = useCart();

  const [categoriesTree, setCategoriesTree] = useState([]);
  const [brands, setBrands] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [activeFamily, setActiveFamily] = useState(null); // ID de familia desplegada
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
  const [isBrandsOpen, setIsBrandsOpen] = useState(false);
  const [isWarehousesOpen, setIsWarehousesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar datos dinámicos del ERP
  useEffect(() => {
    if (!isMenuOpen) return;

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

        // Cargar sedes
        const whRes = await fetch('/api/admin/warehouses');
        if (whRes.ok) {
          const whData = await whRes.json();
          if (whData.success) {
            setWarehouses(whData.warehouses);
          }
        }
      } catch (err) {
        console.error('[MenuDrawer] Error cargando árbol, marcas y sedes:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMenuData();
  }, [isMenuOpen]);

  if (!isMenuOpen) return null;

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
    setIsMenuOpen(false);
  };

  const handleSelectSubcategory = (subId, subName) => {
    setSelectedCategory(subId);
    setSelectedCategoryLabel(formatLabel(subName));
    setSelectedBrand(''); // Limpiar marca al elegir categoría
    setSearchQuery(''); // Limpiar buscador
    setIsMenuOpen(false); // Cerrar sidebar
  };

  const handleSelectBrand = (brandName) => {
    setSelectedBrand(brandName);
    setSelectedCategory('Todos'); // Resetear a 'Todos' para ver todos los productos de esa marca
    setSelectedCategoryLabel('');
    setSearchQuery(''); // Limpiar buscador
    setIsMenuOpen(false); // Cerrar sidebar
  };

  const toggleFamily = (famId) => {
    setActiveFamily(activeFamily === famId ? null : famId);
  };

  const hasActiveFilters = selectedBrand || selectedCategory !== 'Trending';

  return (
    <div style={styles.overlay} onClick={() => setIsMenuOpen(false)}>
      <div style={styles.menuContainer} onClick={(e) => e.stopPropagation()}>
        {/* Encabezado del Menú */}
        <div style={styles.header}>
          <div style={styles.logoGroup}>
            <h3 style={styles.logoText}>GLOSS</h3>
          </div>
          <button style={styles.closeButton} onClick={() => setIsMenuOpen(false)}>
            <X size={20} color="var(--text-primary)" />
          </button>
        </div>

        {/* Contenido / Filtros */}
        <div style={styles.scrollArea}>
          {isLoading && (
            <div style={styles.loadingContainer}>
              <Loader2 style={styles.spinner} size={24} />
              <span style={styles.loadingText}>Cargando opciones...</span>
            </div>
          )}

          {!isLoading && (
            <div style={styles.filtersWrapper}>
              {/* Botón para Restablecer filtros */}
              {hasActiveFilters && (
                <button style={styles.clearButton} onClick={handleClearFilters}>
                  <RotateCcw size={16} />
                  <span>Limpiar Filtros del Catálogo</span>
                </button>
              )}

              {/* SECCIÓN CATEGORÍAS */}
              <div style={styles.sectionCard}>
                <button 
                  style={styles.sectionHeader}
                  onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                >
                  <div style={styles.sectionTitleGroup}>
                    <Grid size={18} color="var(--accent-start)" />
                    <span style={styles.sectionTitle}>Categorías</span>
                  </div>
                  {isCategoriesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
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
                              backgroundColor: isExpanded ? 'var(--accent-soft)' : 'transparent'
                            }}
                            onClick={() => toggleFamily(fam.id)}
                          >
                            <span style={styles.familyName}>{formatLabel(fam.name)}</span>
                            {isExpanded ? <ChevronUp size={16} color="var(--accent-start)" /> : <ChevronDown size={16} />}
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
                                      color: isSubActive ? 'var(--accent-start)' : 'var(--text-primary)',
                                      fontWeight: isSubActive ? '700' : '500'
                                    }}
                                    onClick={() => handleSelectSubcategory(sub.id, sub.name)}
                                  >
                                    <div style={{
                                      ...styles.bulletDot,
                                      backgroundColor: isSubActive ? 'var(--accent-start)' : 'transparent',
                                      borderColor: isSubActive ? 'var(--accent-start)' : '#D1D5DB'
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

              {/* SECCIÓN MARCAS */}
              <div style={styles.sectionCard}>
                <button 
                  style={styles.sectionHeader}
                  onClick={() => setIsBrandsOpen(!isBrandsOpen)}
                >
                  <div style={styles.sectionTitleGroup}>
                    <Tag size={18} color="var(--accent-start)" />
                    <span style={styles.sectionTitle}>Marcas</span>
                  </div>
                  {isBrandsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
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
                            borderColor: isBrandActive ? 'var(--accent-start)' : 'rgba(142, 154, 167, 0.1)',
                            backgroundColor: isBrandActive ? 'var(--accent-soft)' : '#FAF9F8',
                            color: isBrandActive ? 'var(--accent-start)' : 'var(--text-primary)',
                            fontWeight: isBrandActive ? '700' : '500'
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
                    <MapPin size={18} color="var(--accent-start)" />
                    <span style={styles.sectionTitle}>Nuestras Sedes</span>
                  </div>
                  {isWarehousesOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {isWarehousesOpen && (
                  <div style={styles.warehousesList}>
                    {/* Opción para Ver Todas */}
                    <button
                      style={{
                        ...styles.warehouseBtn,
                        borderColor: selectedWarehouse === 'all' ? 'var(--accent-start)' : 'rgba(142, 154, 167, 0.1)',
                        backgroundColor: selectedWarehouse === 'all' ? 'var(--accent-soft)' : '#FAF9F8',
                        color: selectedWarehouse === 'all' ? 'var(--accent-start)' : 'var(--text-primary)',
                        fontWeight: '500',
                        marginBottom: '12px',
                        width: '100%',
                        justifyContent: 'center',
                        border: '1px solid',
                      }}
                      onClick={() => {
                        setSelectedWarehouse('all');
                        setSelectedWarehouseName('Todas las sedes');
                        setIsMenuOpen(false);
                      }}
                    >
                      Ver stock global (Todas las sedes)
                    </button>

                    {Object.keys(
                      warehouses.reduce((acc, w) => {
                        const reg = w.region ? w.region.trim().toUpperCase() : 'CHICLAYO';
                        if (!acc[reg]) acc[reg] = [];
                        acc[reg].push(w);
                        return acc;
                      }, {})
                    ).map((region) => {
                      const grouped = warehouses.reduce((acc, w) => {
                        const reg = w.region ? w.region.trim().toUpperCase() : 'CHICLAYO';
                        if (!acc[reg]) acc[reg] = [];
                        acc[reg].push(w);
                        return acc;
                      }, {});
                      return (
                        <div key={region} style={styles.regionGroup}>
                          {/* Botón/Título para seleccionar toda la región */}
                          <button
                            style={{
                              ...styles.regionSelectBtn,
                              color: selectedWarehouse === region ? 'var(--accent-start)' : 'var(--text-secondary)',
                              fontWeight: selectedWarehouse === region ? '500' : '500'
                            }}
                            onClick={() => {
                              setSelectedWarehouse(region);
                              setSelectedWarehouseName(`Región: ${formatLabel(region)}`);
                              setIsMenuOpen(false);
                            }}
                          >
                            <span style={styles.regionTitleText}>{formatLabel(region)}</span>
                            <span style={styles.regionSelectText}>
                              {selectedWarehouse === region ? '✓ Seleccionado' : 'Ver stock región'}
                            </span>
                          </button>
                          
                          <div style={styles.regionWarehousesGrid}>
                            {grouped[region].map((w) => {
                              const isSelected = selectedWarehouse === w.codalm;
                              return (
                                <button
                                  key={w.codalm}
                                  style={{
                                    ...styles.warehouseItemCard,
                                    borderColor: isSelected ? 'var(--accent-start)' : 'rgba(142, 154, 167, 0.1)',
                                    backgroundColor: isSelected ? 'var(--accent-soft)' : '#FFFFFF'
                                  }}
                                  onClick={() => {
                                    setSelectedWarehouse(w.codalm);
                                    setSelectedWarehouseName(formatLabel(w.nomalm));
                                    setIsMenuOpen(false);
                                  }}
                                >
                                  <span style={{
                                    ...styles.warehouseItemName,
                                    color: isSelected ? 'var(--accent-start)' : 'var(--text-primary)',
                                    fontWeight: '500'
                                  }}>
                                    {formatLabel(w.nomalm)}
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
            <Phone size={16} />
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
    backdropFilter: 'blur(4px)',
    zIndex: 2000,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: '310px',
    height: '100%',
    boxShadow: '-10px 0 40px rgba(165, 177, 194, 0.15)',
    display: 'flex',
    flexDirection: 'column',
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
    fontFamily: 'var(--font-logo)',
    fontSize: '1.45rem',
    fontWeight: '700',
    color: 'var(--accent-start)',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
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
