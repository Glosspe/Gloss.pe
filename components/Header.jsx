'use client';

import React from 'react';
import { Search, SlidersHorizontal, ShoppingBag, Bell } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function Header() {
  const { searchQuery, setSearchQuery, cartCount, setIsCartOpen } = useCart();

  return (
    <header style={styles.header}>
      {/* Fila Superior: Perfil, Logo e Iconos */}
      <div style={styles.topRow}>
        <div style={styles.profileContainer}>
          <div style={styles.avatar}>
            {/* Imagen del logo de Gloss o un avatar circular por defecto */}
            <span style={styles.avatarText}>G</span>
          </div>
          <div style={styles.greeting}>
            <span style={styles.helloText}>Hola,</span>
            <h2 style={styles.nameText}>Tienda Gloss</h2>
          </div>
        </div>
        
        <div style={styles.actions}>
          <button style={styles.iconButton} onClick={() => setIsCartOpen(true)}>
            <ShoppingBag size={22} color="var(--text-primary)" />
            {cartCount > 0 && (
              <span style={styles.badge}>{cartCount}</span>
            )}
          </button>
          <button style={styles.iconButton}>
            <Bell size={22} color="var(--text-primary)" />
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
  profileContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FFE4E1, #FFC0CB)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 16px rgba(142, 154, 167, 0.1)',
  },
  avatarText: {
    fontFamily: 'var(--font-title)',
    fontWeight: '700',
    color: '#FF8C69',
    fontSize: '1.3rem',
  },
  greeting: {
    display: 'flex',
    flexDirection: 'column',
  },
  helloText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  nameText: {
    fontSize: '1.25rem',
    fontWeight: '700',
    marginTop: '-2px',
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
    backgroundColor: '#FF8C69',
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
    backgroundColor: 'var(--bg-card)',
    borderRadius: '24px',
    padding: '0 16px',
    boxShadow: '0 8px 24px rgba(142, 154, 167, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
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
