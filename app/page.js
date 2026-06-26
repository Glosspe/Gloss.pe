'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import CategorySlider from '@/components/CategorySlider';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/context/CartContext';
import { Sparkles } from 'lucide-react';
import { MOCK_PRODUCTS } from '@/lib/mocks';

export default function HomePage() {
  const { selectedCategory, searchQuery } = useCart();
  const [products, setProducts] = useState(MOCK_PRODUCTS);
  const [filteredProducts, setFilteredProducts] = useState([]);

  // Filtrar productos según categoría y búsqueda en tiempo real
  useEffect(() => {
    let result = MOCK_PRODUCTS;

    // Filtro por Categoría
    if (selectedCategory !== 'Trending') {
      result = result.filter(p => p.category === selectedCategory);
    } else {
      // "Trending" muestra los destacados (en este caso el MOCK tiene algunos marcados de forma predeterminada)
      result = result.filter(p => p.category === 'Trending' || p.price > 150);
    }

    // Filtro por Búsqueda
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p => p.name.toLowerCase().includes(q) || 
             p.brand.toLowerCase().includes(q) || 
             (p.description && p.description.toLowerCase().includes(q))
      );
    }

    setFilteredProducts(result);
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
        <span style={styles.sectionCount}>{filteredProducts.length} productos</span>
      </div>

      {/* Rejilla de Productos */}
      {filteredProducts.length === 0 ? (
        <div style={styles.noResults}>
          <p style={styles.noResultsText}>No encontramos productos que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <div className="product-grid">
          {filteredProducts.map((product) => (
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
    fontFamily: 'var(--font-title)',
    fontSize: '1.2rem',
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  noResults: {
    width: '100%',
    textAlign: 'center',
    padding: '60px 20px',
  },
  noResultsText: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
  },
};
