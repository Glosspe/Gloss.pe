'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import CategorySlider from '@/components/CategorySlider';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/context/CartContext';
import { Sparkles, Loader2 } from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/mocks';

export default function HomePage() {
  const { selectedCategory, searchQuery, selectedBrand, selectedCategoryLabel } = useCart();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  // Fetch dinámico de productos desde la API híbrida de la tienda
  useEffect(() => {
    let active = true;
    
    async function fetchProducts() {
      setIsLoading(true);
      setError(null);
      
      try {
        const queryParams = new URLSearchParams();
        if (selectedCategory) queryParams.append('category', selectedCategory);
        if (searchQuery.trim() !== '') queryParams.append('q', searchQuery.trim());
        if (selectedBrand) queryParams.append('brand', selectedBrand);
        
        console.log(`[Frontend] Fetching products with: ${queryParams.toString()}`);
        const res = await fetch(`/api/products/search?${queryParams.toString()}`);
        
        if (!res.ok) {
          throw new Error(`Error en el servidor: código ${res.status}`);
        }
        
        const data = await res.json();
        
        if (active) {
          setProducts(data);
          const isMockData = data.length > 0 && data[0].isMock;
          setIsOffline(!!isMockData);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[Frontend] Error fetching products:', err);
        if (active) {
          // Fallback a mocks locales ante caídas para asegurar que la web siga activa
          const localFallback = MOCK_PRODUCTS.filter(p => {
            const matchesCat = selectedCategory === 'Trending' || p.category === selectedCategory;
            const matchesBrand = !selectedBrand || p.brand.toLowerCase() === selectedBrand.toLowerCase();
            const matchesQuery = searchQuery.trim() === '' || 
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              p.brand.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesBrand && matchesQuery;
          });
          setProducts(localFallback.map(p => ({ ...p, isMock: true })));
          setIsOffline(true);
          setIsLoading(false);
        }
      }
    }

    fetchProducts();
    
    return () => {
      active = false;
    };
  }, [selectedCategory, searchQuery, selectedBrand]);

  // Generar título de sección inteligente
  const getSectionTitle = () => {
    if (selectedBrand) return `Marca: ${selectedBrand}`;
    if (selectedCategoryLabel) return selectedCategoryLabel;
    if (selectedCategory === 'Trending') return 'Productos Destacados';
    if (selectedCategory === 'Todos') return 'Todos los Productos';
    return selectedCategory; // Fallback al ID crudo
  };

  return (
    <div style={styles.container}>
      {/* Cabecera Principal */}
      <Header />

      {/* Selector de Categorías */}
      <CategorySlider />

      {/* Banner de Sincronización / Catálogo de respaldo */}
      {isOffline && (
        <div style={styles.offlineBanner}>
          <span style={styles.offlineText}>
            Sincronización en curso con el almacén. Mostrando nuestro catálogo de respaldo.
          </span>
        </div>
      )}

      {/* Título de Sección */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>
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
    paddingTop: '120px',
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
    fontWeight: '700',
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
    fontWeight: '600',
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
};
