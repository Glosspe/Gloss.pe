'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import CategorySlider from '@/components/CategorySlider';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/context/CartContext';
import { Sparkles, Loader2 } from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/mocks';

export default function HomePage() {
  const { selectedCategory, searchQuery } = useCart();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
        
        console.log(`[Frontend] Fetching products with: ${queryParams.toString()}`);
        const res = await fetch(`/api/products/search?${queryParams.toString()}`);
        
        if (!res.ok) {
          throw new Error(`Error en el servidor: código ${res.status}`);
        }
        
        const data = await res.json();
        
        if (active) {
          setProducts(data);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('[Frontend] Error fetching products:', err);
        if (active) {
          // Fallback a mocks locales ante caídas para asegurar que la web siga activa
          const localFallback = MOCK_PRODUCTS.filter(p => {
            const matchesCat = selectedCategory === 'Trending' || p.category === selectedCategory;
            const matchesQuery = searchQuery.trim() === '' || 
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              p.brand.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesQuery;
          });
          setProducts(localFallback);
          setIsLoading(false);
        }
      }
    }

    fetchProducts();
    
    return () => {
      active = false;
    };
  }, [selectedCategory, searchQuery]);

  return (
    <div style={styles.container}>
      {/* Cabecera Principal */}
      <Header />

      {/* Selector de Categorías */}
      <CategorySlider />

      {/* Título de Sección */}
      <div style={styles.sectionHeader}>
        <h3 style={styles.sectionTitle}>
          {selectedCategory === 'Trending' ? 'Productos Destacados' : selectedCategory}
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
    fontFamily: 'var(--font-logo)',
    fontSize: '1.4rem', // Ligeramente mayor para el estilo Serif elegante
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '0.02em',
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
