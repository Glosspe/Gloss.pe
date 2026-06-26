'use client';

import React from 'react';
import { Search, SlidersHorizontal, ShoppingBag, Menu } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function Header() {
  const { searchQuery, setSearchQuery, cartCount, setIsCartOpen, setIsMenuOpen } = useCart();

  return (
    <header style={styles.header}>
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
      <div style={styles.searchRow}>
        <div style={styles.searchBar}>
          <Search size={22} color="var(--accent-start)" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar productos, marcas, cosméticos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    padding: '24px 20px 16px 20px',
    backgroundColor: 'var(--bg-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
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
    fontSize: '2.1rem',
    fontWeight: '700',
    color: 'var(--accent-start)',
    letterSpacing: '0.22em',
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
    border: '1px solid rgba(216, 27, 96, 0.08)',
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
    color: 'var(--text-primary)',
    fontSize: '1rem',
    height: '100%',
  },
};
