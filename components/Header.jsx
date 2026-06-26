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
            <ShoppingBag size={22} color="var(--text-primary)" />
            {cartCount > 0 && (
              <span style={styles.badge}>{cartCount}</span>
            )}
          </button>
          
          {/* Botón Menú Desplegable */}
          <button style={styles.iconButton} onClick={() => setIsMenuOpen(true)}>
            <Menu size={22} color="var(--text-primary)" />
          </button>
        </div>
      </div>
      
      {/* Fila Inferior: Buscador e Icono de Filtro */}
      <div style={styles.searchRow}>
        <div style={styles.searchBar}>
          <Search size={20} color="var(--text-secondary)" style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar productos, marcas, cosméticos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
        </div>
        
        <button style={styles.filterButton}>
          <SlidersHorizontal size={20} color="#FFFFFF" />
        </button>
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
    gap: '12px',
  },
  iconButton: {
    background: 'var(--bg-card)',
    border: '1px solid rgba(142, 154, 167, 0.08)',
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 8px 16px rgba(142, 154, 167, 0.05)',
    position: 'relative',
    transition: 'transform 0.2s ease',
  },
  badge: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    backgroundColor: 'var(--accent-start)',
    color: '#FFFFFF',
    fontSize: '0.7rem',
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
    gap: '12px',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F8F7F6',
    borderRadius: '24px',
    padding: '0 16px',
    boxShadow: '0 8px 24px rgba(165, 177, 194, 0.05)',
    border: '1px solid rgba(142, 154, 167, 0.06)',
    height: '52px',
  },
  searchIcon: {
    marginRight: '10px',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontFamily: 'var(--font-body)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    height: '100%',
  },
  filterButton: {
    background: 'var(--accent-gradient)',
    border: 'none',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 10px 20px var(--accent-shadow)',
    transition: 'transform 0.2s ease',
  },
};
