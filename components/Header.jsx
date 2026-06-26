'use client';

import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, ShoppingBag, Menu } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function Header() {
  const { searchQuery, setSearchQuery, cartCount, setIsCartOpen, setIsMenuOpen } = useCart();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 10) {
        setIsCollapsed(false);
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsCollapsed(true);
      } else if (currentScrollY < lastScrollY) {
        setIsCollapsed(false);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const headerStyle = {
    ...styles.header,
    padding: isCollapsed ? '10px 20px 10px 20px' : '14px 20px 12px 20px',
    gap: isCollapsed ? '0px' : '12px',
    transition: 'padding 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), gap 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  };

  const searchRowStyle = {
    ...styles.searchRow,
    maxHeight: isCollapsed ? '0px' : '80px',
    opacity: isCollapsed ? 0 : 1,
    transform: isCollapsed ? 'translateY(-15px)' : 'translateY(0)',
    pointerEvents: isCollapsed ? 'none' : 'auto',
    transition: 'max-height 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.25s ease, transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    overflow: 'hidden',
  };

  return (
    <header style={headerStyle}>
      {/* Fila Superior: Logo y Botones de Acción (Bolsa + Menú) */}
      <div style={styles.topRow}>
        <div style={styles.logoContainer}>
          <h2 style={styles.logoText}>GLOSS</h2>
        </div>
        
        <div style={styles.actions}>
          {/* Botón Bolsa (Carrito) */}
          <button style={styles.iconButton} onClick={() => setIsCartOpen(true)}>
            <ShoppingBag size={24} color="var(--accent-start)" />
            {cartCount > 0 && (
              <span style={styles.badge}>{cartCount}</span>
            )}
          </button>
          
          {/* Botón Menú Desplegable */}
          <button style={styles.iconButton} onClick={() => setIsMenuOpen(true)}>
            <Menu size={24} color="var(--accent-start)" />
          </button>
        </div>
      </div>
      
      {/* Fila Inferior: Buscador Expandido */}
      <div style={searchRowStyle}>
        <div style={styles.searchBar}>
          <Search size={22} color="var(--accent-start)" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar productos, marcas, cosméticos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
            className="search-input-premium"
          />
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    padding: '14px 20px 12px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(142, 154, 167, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    maxWidth: '800px',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  logoText: {
    fontFamily: 'var(--font-logo)',
    fontSize: '2.2rem',
    fontWeight: '600',
    color: 'var(--accent-start)',
    letterSpacing: '0.28em',
    textTransform: 'uppercase',
    fontStyle: 'normal',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  iconButton: {
    background: 'none',
    border: 'none',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    transition: 'transform 0.2s ease',
    outline: 'none',
    padding: 0,
  },
  badge: {
    position: 'absolute',
    top: '0px',
    right: '0px',
    backgroundColor: 'var(--accent-start)',
    color: '#FFFFFF',
    fontSize: '0.65rem',
    fontWeight: '700',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--bg-primary)',
  },
  searchRow: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--accent-soft)',
    borderRadius: '30px',
    padding: '0 20px',
    boxShadow: '0 8px 24px rgba(216, 27, 96, 0.03)',
    border: 'none',
    height: '60px',
  },
  searchIcon: {
    marginRight: '12px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)', // Gris carbón nítido y legible, 100% libre de efecto percudido
    fontSize: '1rem',
    height: '100%',
  },
};
