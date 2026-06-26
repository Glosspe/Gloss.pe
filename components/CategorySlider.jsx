'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';

export default function CategorySlider() {
  const { selectedCategory, setSelectedCategory, setSelectedCategoryLabel, setSelectedBrand } = useCart();
  const [familyTabs, setFamilyTabs] = useState([
    { id: 'Trending', name: 'Trending', isSystem: true },
    { id: 'Todos', name: 'Todos', isSystem: true },
  ]);

  // Cargar familias reales desde el ERP vía /api/products/categories-tree
  useEffect(() => {
    async function loadFamilies() {
      try {
        const res = await fetch('/api/products/categories-tree');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const tabs = [
              { id: 'Trending', name: 'Trending', isSystem: true },
              { id: 'Todos', name: 'Todos', isSystem: true },
              ...data.map(fam => ({
                id: `FAM:${fam.id}`,       // ej: FAM:05
                name: fam.name,             // ej: CABELLO
                familyId: fam.id,
              }))
            ];
            setFamilyTabs(tabs);
          }
        }
      } catch (err) {
        console.warn('[CategorySlider] No se pudieron cargar familias desde API, usando fallback');
      }
    }
    loadFamilies();
  }, []);

  // Formatear label para UI (Title Case)
  function formatLabel(name) {
    if (!name) return '';
    if (name === 'Trending' || name === 'Todos') return name;
    const connectors = ['de', 'con', 'y', 'para', 'la', 'el', 'los', 'las', 'en'];
    return name
      .toLowerCase()
      .split(/\s+/)
      .map((word, index) => {
        if (index > 0 && connectors.includes(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  }

  const handleSelectTab = (tab) => {
    setSelectedCategory(tab.id);
    setSelectedCategoryLabel(tab.isSystem ? '' : formatLabel(tab.name));
    setSelectedBrand(''); // Limpiar marca al cambiar de tab
  };

  // Determinar cuál tab está activo (coincidencia exacta o por familia)
  const isTabActive = (tabId) => {
    if (selectedCategory === tabId) return true;
    // Si hay una subcategoría seleccionada (ej: 05-01), resaltar el tab de la familia correspondiente (FAM:05)
    if (tabId.startsWith('FAM:') && /^\d{2}-\d{2,}$/.test(selectedCategory)) {
      const famCode = tabId.replace('FAM:', '');
      return selectedCategory.startsWith(famCode + '-');
    }
    return false;
  };

  return (
    <div style={styles.container}>
      <div style={styles.slider}>
        {familyTabs.map((tab) => {
          const isActive = isTabActive(tab.id);
          return (
            <div key={tab.id} style={styles.tabContainer}>
              <button
                onClick={() => handleSelectTab(tab)}
                style={{
                  ...styles.tabButton,
                  ...(isActive ? styles.tabActive : styles.tabInactive)
                }}
              >
                {formatLabel(tab.name)}
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
    whiteSpace: 'nowrap',
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
    backgroundColor: 'var(--accent-start)',
    boxShadow: '0 0 8px var(--accent-shadow)',
  },
};

