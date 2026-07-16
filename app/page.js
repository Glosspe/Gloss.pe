'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/context/CartContext';
import { Sparkles, Loader2, ChevronRight, Home, X } from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/mocks';

export default function HomePage() {
  const { 
    selectedCategory, 
    setSelectedCategory,
    selectedCategoryLabel,
    setSelectedCategoryLabel,
    parentCategoryLabel,
    setParentCategoryLabel,
    searchQuery,
    setSearchQuery,
    selectedBrand,
    setSelectedBrand,
    selectedWarehouse, 
    isInitialized 
  } = useCart();

  const clearAllFilters = () => {
    setSelectedCategory('Trending');
    setSelectedBrand('');
    setSearchQuery('');
    setSelectedCategoryLabel('');
    setParentCategoryLabel('');
  };
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isErpUnavailable, setIsErpUnavailable] = useState(false);

  // Fetch dinámico de productos desde la API híbrida de la tienda
  useEffect(() => {
    let active = true;
    
    async function fetchProducts() {
      if (!isInitialized) return; // Evitar llamadas fetch duplicadas/incompletas antes de cargar localStorage
      
      setIsLoading(true);
      setError(null);
      
      try {
        const queryParams = new URLSearchParams();
        if (selectedCategory) queryParams.append('category', selectedCategory);
        if (searchQuery.trim() !== '') queryParams.append('q', searchQuery.trim());
        if (selectedBrand) queryParams.append('brand', selectedBrand);
        if (selectedWarehouse) queryParams.append('warehouse', selectedWarehouse);
        
        console.log(`[Frontend] Fetching products with: ${queryParams.toString()}`);
        const res = await fetch(`/api/products/search?${queryParams.toString()}`);
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          if (errData.erpUnavailable || res.status === 503) {
            if (active) {
              setIsErpUnavailable(true);
              setIsLoading(false);
            }
            return;
          }
          throw new Error(`Error en el servidor: código ${res.status}`);
        }
        
        const data = await res.json();
        
        if (active) {
          setProducts(data);
          setIsOffline(false);
          setIsErpUnavailable(false);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[Frontend] Error fetching products:', err);
        if (active) {
          // Cargamos productos mock locales como fallback de respaldo para que la web siga online y usable
          setProducts(MOCK_PRODUCTS.slice(0, 24));
          setIsOffline(true);
          setIsErpUnavailable(false);
          setIsLoading(false);
        }
      }
    }

    fetchProducts();
    
    return () => {
      active = false;
    };
  }, [selectedCategory, searchQuery, selectedBrand, selectedWarehouse, isInitialized]);

  // Generar título de sección inteligente
  const getSectionTitle = () => {
    if (selectedBrand) return `Marca: ${selectedBrand}`;
    if (selectedCategoryLabel) return selectedCategoryLabel;
    if (selectedCategory === 'Trending') return 'Productos Destacados';
    if (selectedCategory === 'Todos') return 'Todos los Productos';
    return selectedCategory; // Fallback al ID crudo
  };

  if (isErpUnavailable) {
    return (
      <div style={styles.unavailableContainer}>
        <div style={styles.unavailableCard}>
          <h1 style={styles.unavailableLogo}>GLOSS</h1>
          <div style={styles.unavailableDivider} />
          <h2 style={styles.unavailableTitle}>No estamos disponibles en este momento</h2>
          <p style={styles.unavailableText}>
            Estamos realizando labores de mantenimiento y sincronización con nuestro almacén central. 
            Por favor, vuelve a ingresar en unos minutos. ¡Gracias por tu paciencia!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Cabecera Principal */}
      <Header />

      {/* Banner de Sincronización / Catálogo de respaldo */}
      {isOffline && (
        <div style={styles.offlineBanner}>
          <span style={styles.offlineText}>
            Sincronización en curso con el almacén. Mostrando nuestro catálogo de respaldo.
          </span>
        </div>
      )}

      {/* Banner Promocional Híbrido (Cosmética y Cuidado Facial) */}
      <div style={styles.bannerContainer} className="home-promo-banner">
        {/* Lado Izquierdo: Textos */}
        <div style={styles.bannerTextContent}>
          <span style={styles.bannerBadge}>Cosmética & Cuidado</span>
          <h2 style={styles.bannerTitle}>Tu rutina de brillo diario</h2>
          <p style={styles.bannerSubtitle}>Encuentra las mejores marcas y fórmulas para tu piel</p>
        </div>

        {/* Lado Derecho: Imagen decorativa fusionada */}
        <div style={styles.bannerImageWrapper}>
          <picture style={{ width: '100%', height: '100%', display: 'block' }}>
            {/* Imagen optimizada para móviles */}
            <source media="(max-width: 640px)" srcSet="/cosmetics_banner_mobile.png" />
            {/* Imagen para PC y pantallas grandes */}
            <img 
              src="/cosmetics_banner_desktop.png" 
              alt="Cosméticos y Cuidado Facial" 
              style={styles.bannerImage}
            />
          </picture>
          <div style={styles.bannerOverlayGrad} />
        </div>
      </div>

      {/* Barra de Ruta / Breadcrumbs (Filtro Activo) */}
      {(selectedCategory !== 'Trending' || selectedBrand || searchQuery.trim() !== '') && (
        <div style={styles.breadcrumbsContainer} className="home-breadcrumbs">
          <button onClick={clearAllFilters} style={styles.breadcrumbLink} title="Regresar al Inicio">
            <Home size={13} style={{ marginRight: '4px' }} />
            <span>Inicio</span>
          </button>
          
          <ChevronRight size={11} color="#94A3B8" style={{ margin: '0 4px', flexShrink: 0 }} />
          
          {searchQuery.trim() !== '' ? (
            <span style={styles.breadcrumbActive}>Búsqueda: "{searchQuery}"</span>
          ) : selectedBrand ? (
            <span style={styles.breadcrumbActive}>Marca: {selectedBrand}</span>
          ) : selectedCategoryLabel ? (
            <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
              {parentCategoryLabel && parentCategoryLabel !== selectedCategoryLabel && (
                <>
                  <span style={styles.breadcrumbParent}>{parentCategoryLabel}</span>
                  <ChevronRight size={11} color="#94A3B8" style={{ margin: '0 4px', flexShrink: 0 }} />
                </>
              )}
              <span style={styles.breadcrumbActive}>{selectedCategoryLabel}</span>
            </div>
          ) : (
            <span style={styles.breadcrumbActive}>{selectedCategory}</span>
          )}

          <button 
            onClick={clearAllFilters} 
            style={styles.breadcrumbClearBtn} 
            title="Quitar filtro y ver destacados"
          >
            <X size={10} color="#64748B" />
          </button>
        </div>
      )}

      {/* Título de Sección */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle} className="home-section-title">
          {getSectionTitle()}
        </h3>
        {!isLoading && (
          <span style={styles.sectionCount}>{products.length} productos</span>
        )}
      </div>

      {/* Cuerpo principal / Rejilla */}
      {isLoading ? (
        <div style={styles.loaderContainer}>
          <Loader2 style={styles.spinner} />
          <p style={styles.loaderText}>Buscando productos de belleza...</p>
        </div>
      ) : products.length === 0 ? (
        <div style={styles.noResults}>
          <p style={styles.noResultsText}>No encontramos productos que coincidan con tu búsqueda en este momento.</p>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    paddingTop: '130px',
    paddingBottom: '20px',
  },
  sectionHeader: {
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '16px 20px 8px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.3rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    letterSpacing: '0.02em',
  },
  offlineBanner: {
    width: 'calc(100% - 40px)',
    maxWidth: '800px',
    margin: '8px auto 16px auto',
    padding: '12px 16px',
    backgroundColor: 'var(--accent-soft)',
    borderRadius: '16px',
    border: '1px dashed rgba(255, 46, 147, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  offlineText: {
    fontSize: '0.8rem',
    color: 'var(--accent-end)',
    fontWeight: '500',
    fontFamily: 'var(--font-body)',
  },
  sectionCount: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    gap: '12px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    color: 'var(--accent-start)',
    animation: 'spin 1s linear infinite',
  },
  loaderText: {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    fontWeight: '500',
    fontFamily: 'var(--font-body)',
  },
  noResults: {
    width: '100%',
    textAlign: 'center',
    padding: '60px 20px',
  },
  noResultsText: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-body)',
  },
  unavailableContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    width: '100%',
    backgroundColor: '#FFFFFF',
    padding: '24px',
    boxSizing: 'border-box',
  },
  unavailableCard: {
    maxWidth: '460px',
    width: '100%',
    textAlign: 'center',
    padding: '40px 30px',
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)',
    border: '1px solid rgba(142, 154, 167, 0.08)',
  },
  unavailableLogo: {
    fontFamily: 'var(--font-logo)',
    fontSize: '3rem',
    fontWeight: 'normal',
    color: '#000000',
    letterSpacing: '0.25em',
    margin: '0 0 0 0.25em', // Centrado compensando el letter-spacing
    textTransform: 'uppercase',
  },
  unavailableDivider: {
    width: '40px',
    height: '2px',
    backgroundColor: '#000000',
    margin: '24px auto',
  },
  unavailableTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.25rem',
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: '12px',
    lineHeight: '1.4',
  },
  unavailableText: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.88rem',
    lineHeight: '1.6',
    color: '#6B7280',
    margin: 0,
  },
  breadcrumbsContainer: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '16px 20px 0 20px',
    fontFamily: 'var(--font-body), sans-serif',
    position: 'relative',
  },
  breadcrumbLink: {
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    color: 'var(--accent-start)',
    fontSize: '0.78rem',
    fontWeight: '600',
    fontFamily: 'var(--font-body), sans-serif',
    padding: 0,
    transition: 'color 0.2s',
  },
  breadcrumbActive: {
    fontSize: '0.78rem',
    fontWeight: '500',
    color: '#475569',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '220px',
  },
  breadcrumbClearBtn: {
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    marginLeft: 'auto',
    transition: 'all 0.2s',
    padding: 0,
  },
  breadcrumbParent: {
    fontSize: '0.78rem',
    fontWeight: '500',
    color: '#64748B', // Un gris intermedio para el padre en el camino de la ruta
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '120px',
  },
  bannerContainer: {
    width: 'calc(100% - 40px)',
    maxWidth: '800px',
    margin: '10px auto 16px auto',
    borderRadius: '20px',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    background: '#FFFFFF', // Fondo blanco puro para fluir con la web
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.03)',
    border: '1px solid rgba(0, 0, 0, 0.05)', // Borde sutil
  },
  bannerTextContent: {
    flex: 1,
    padding: '16px 20px',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    maxWidth: '65%', // Evita que los textos pisen la imagen de la derecha
  },
  bannerBadge: {
    fontSize: '0.62rem',
    fontWeight: '600', // Más fino
    color: '#FFFFFF', // Texto blanco
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '4px',
    backgroundColor: '#1E293B', // Fondo oscuro (gris carbón elegante)
    padding: '2px 8px',
    borderRadius: '6px',
    width: 'fit-content',
    fontFamily: 'var(--font-body), sans-serif',
  },
  bannerTitle: {
    fontSize: '1.05rem',
    fontWeight: '500', // Título más delgado (de 700 a 500)
    color: '#1E293B',
    margin: '0 0 2px 0',
    fontFamily: 'var(--font-title), sans-serif',
    lineHeight: '1.2',
  },
  bannerSubtitle: {
    fontSize: '0.72rem',
    fontWeight: '400', // Subtítulo muy fino (de 500 a 400)
    color: '#64748B',
    margin: 0,
    lineHeight: '1.3',
    fontFamily: 'var(--font-body), sans-serif',
  },
  bannerImageWrapper: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '45%',
    height: '100%',
    zIndex: 1,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center right',
    display: 'block',
  },
  bannerOverlayGrad: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(to right, #FFFFFF 10%, rgba(255, 255, 255, 0.6) 50%, transparent 100%)', // Difuminado para integrar la foto con los textos
  },
};
