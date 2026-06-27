'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/context/CartContext';
import { Sparkles, Loader2 } from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/mocks';

export default function HomePage() {
  const { selectedCategory, searchQuery, selectedBrand, selectedCategoryLabel, selectedWarehouse } = useCart();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isErpUnavailable, setIsErpUnavailable] = useState(false);

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
          // Si hay cualquier error de red o de carga del catálogo, consideramos que el ERP no está disponible
          // para no confundir al cliente mostrando un catálogo mock desactualizado
          setIsErpUnavailable(true);
          setIsLoading(false);
        }
      }
    }

    fetchProducts();
    
    return () => {
      active = false;
    };
  }, [selectedCategory, searchQuery, selectedBrand, selectedWarehouse]);

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
};
