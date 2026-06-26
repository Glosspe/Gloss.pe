'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';

const CATEGORIES = [
  { id: 'Trending', label: 'Trending' },
  { id: 'Capilar', label: 'Cuidado Capilar' },
  { id: 'Facial', label: 'Cuidado Facial' },
  { id: 'Cosmeticos', label: 'Cosméticos' },
  { id: 'Corporal', label: 'Cuidado Corporal' }
];

export default function CategorySlider() {
  const { selectedCategory, setSelectedCategory } = useCart();

  return (
    <div style={styles.container}>
      <div style={styles.slider}>
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <div key={cat.id} style={styles.tabContainer}>
              <button
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  ...styles.tabButton,
                  ...(isActive ? styles.tabActive : styles.tabInactive)
                }}
              >
                {cat.label}
              </button>
              {isActive && <div style={styles.activeDot} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px',
    overflow: 'hidden',
  },
  slider: {
    display: 'flex',
    gap: '24px',
    overflowX: 'auto',
    padding: '8px 4px 16px 4px',
    scrollbarWidth: 'none', // Ocultar scrollbar en Firefox
    msOverflowStyle: 'none',  // Ocultar scrollbar en IE
    WebkitOverflowScrolling: 'touch', // Scroll táctil fluido
  },
  tabContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  tabButton: {
    border: 'none',
    outline: 'none',
    fontFamily: 'var(--font-body)',
    fontWeight: '600',
    fontSize: '0.95rem',
    padding: '10px 18px',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  },
  tabActive: {
    backgroundColor: 'var(--bg-card)',
    color: 'var(--text-primary)',
    boxShadow: '0 6px 16px rgba(142, 154, 167, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
  },
  tabInactive: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
  },
  activeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#FF8C69',
    boxShadow: '0 0 8px rgba(255, 140, 105, 0.6)',
  },
};
