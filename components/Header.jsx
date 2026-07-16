'use client';

import React, { useState, useEffect } from 'react';
import { Search, ShoppingBag, Menu, MapPin } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import SedesModal from './SedesModal';
import Link from 'next/link';

export default function Header() {
  const { 
    cartCount, 
    setIsCartOpen, 
    setIsMenuOpen, 
    selectedWarehouseName, 
    setIsSearchOpen,
    setSelectedCategory,
    setSelectedBrand,
    setSearchQuery,
    setSelectedCategoryLabel
  } = useCart();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSedesModalOpen, setIsSedesModalOpen] = useState(false);

  const handleHomeClick = () => {
    // Restablecer filtros del catálogo al hacer clic en el logo
    setSelectedCategory('Trending');
    setSelectedBrand('');
    setSearchQuery('');
    setSelectedCategoryLabel('');
  };

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
    padding: isCollapsed ? '6px 20px' : '12px 20px',
    transition: 'padding 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  };

  return (
    <>
      <header style={headerStyle} className="gloss-header">
        {/* Fila Superior Unificada: Logo, Sede, Buscar, Carrito, Menú */}
        <div style={styles.topRow}>
          <div style={styles.logoContainer}>
            <Link href="/" onClick={handleHomeClick} style={{ textDecoration: 'none' }}>
              <h2 style={styles.logoText} className="header-logo">GLOSS</h2>
            </Link>
            <button 
              onClick={() => setIsSedesModalOpen(true)} 
              className="header-sede-btn"
              title="Seleccionar Sede"
            >
              <MapPin size={11} color="var(--accent-start)" />
              <span style={styles.sedeText}>{selectedWarehouseName}</span>
            </button>
          </div>
          
          <div style={styles.actions}>
            {/* Botón Lupa de Búsqueda (Pantalla completa y escáner) */}
            <button 
              style={styles.iconButton} 
              className="header-icon-button" 
              onClick={() => setIsSearchOpen(true)}
              title="Buscar o Escanear"
            >
              <Search size={24} color="#334155" className="header-icon-svg" />
            </button>

            {/* Botón Bolsa (Carrito) */}
            <button 
              style={styles.iconButton} 
              className="header-icon-button header-cart-button" 
              onClick={() => setIsCartOpen(true)}
              title="Ver Carrito"
            >
              <ShoppingBag size={24} color="#334155" className="header-icon-svg" />
              {cartCount > 0 && (
                <span style={styles.badge} className="header-cart-badge">{cartCount}</span>
              )}
            </button>
            
            {/* Botón Menú Desplegable */}
            <button 
              style={styles.iconButton} 
              className="header-icon-button" 
              onClick={() => setIsMenuOpen(true)}
              title="Menú"
            >
              <Menu size={24} color="#334155" className="header-icon-svg" />
            </button>
          </div>
        </div>
      </header>
      <SedesModal isOpen={isSedesModalOpen} onClose={() => setIsSedesModalOpen(false)} />
    </>
  );
}

const styles = {
  header: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(142, 154, 167, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '800px',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  sedeText: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '120px',
  },
  logoText: {
    fontFamily: 'var(--font-logo)',
    fontSize: '1.8rem',
    fontWeight: '600',
    color: 'var(--accent-start)',
    letterSpacing: '0.24em',
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
    width: '36px',
    height: '36px',
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
    top: '-2px',
    right: '-2px',
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
};
