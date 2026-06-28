'use client';

import React, { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, ShoppingBag, Menu, MapPin } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import SedesModal from './SedesModal';
import { useRouter, usePathname } from 'next/navigation';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();

  const { searchQuery, setSearchQuery, cartCount, setIsCartOpen, setIsMenuOpen, selectedWarehouseName } = useCart();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSedesModalOpen, setIsSedesModalOpen] = useState(false);

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
    padding: isCollapsed ? '6px 20px 6px 20px' : '10px 20px 10px 20px',
    gap: isCollapsed ? '0px' : '8px',
    transition: 'padding 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), gap 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  };

  const searchRowStyle = {
    ...styles.searchRow,
    maxHeight: isCollapsed ? '0px' : '80px',
    opacity: isCollapsed ? 0 : 1,
    transform: isCollapsed ? 'translateY(-10px)' : 'translateY(0)',
    pointerEvents: isCollapsed ? 'none' : 'auto',
    transition: 'max-height 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.25s ease, transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    overflow: 'hidden',
  };

  return (
    <>
      <header style={headerStyle} className="gloss-header">
        {/* Fila Superior: Logo y Botones de Acción (Bolsa + Menú) */}
        <div style={styles.topRow}>
          <div style={styles.logoContainer}>
            <h2 style={styles.logoText} className="header-logo">GLOSS</h2>
            <button 
              onClick={() => setIsSedesModalOpen(true)} 
              style={styles.sedeSelectorBtn}
              title="Seleccionar Sede"
            >
              <MapPin size={11} color="var(--accent-start)" />
              <span style={styles.sedeText}>{selectedWarehouseName}</span>
            </button>
          </div>
          
          <div style={styles.actions}>
            {/* Botón Bolsa (Carrito) */}
            <button style={styles.iconButton} className="header-icon-button" onClick={() => setIsCartOpen(true)}>
              <ShoppingBag size={24} color="var(--accent-start)" className="header-icon-svg" />
              {cartCount > 0 && (
                <span style={styles.badge} className="header-cart-badge">{cartCount}</span>
              )}
            </button>
            
            {/* Botón Menú Desplegable */}
            <button style={styles.iconButton} className="header-icon-button" onClick={() => setIsMenuOpen(true)}>
              <Menu size={24} color="var(--accent-start)" className="header-icon-svg" />
            </button>
          </div>
        </div>
        
        {/* Fila Inferior: Buscador Expandido */}
        <div style={searchRowStyle}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (document.activeElement) {
                document.activeElement.blur();
              }
            }}
            style={{ width: '100%' }}
          >
            <div style={styles.searchBar} className="header-search-bar">
              <Search size={22} color="var(--text-secondary)" style={styles.searchIcon} className="header-search-icon" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  // Si el usuario escribe y no está en la página principal, redirigir a la Home para ver resultados
                  if (pathname !== '/' && e.target.value.trim() !== '') {
                    router.push('/');
                  }
                }}
                style={styles.searchInput}
                className="search-input-premium header-search-input"
              />
            </div>
          </form>
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
    padding: '10px 20px 10px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(142, 154, 167, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
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
    gap: '10px',
  },
  sedeSelectorBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#FAF9F8',
    border: '1px solid rgba(142, 154, 167, 0.1)',
    borderRadius: '12px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: '0.72rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
    transition: 'all 0.2s ease',
    outline: 'none',
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
  searchRow: {
    display: 'flex',
    width: '100%',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: '30px',
    padding: '0 20px',
    boxShadow: 'inset 1px 1px 4px rgba(0, 0, 0, 0.01)',
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
