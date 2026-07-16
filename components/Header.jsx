'use client';

import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, Menu, MapPin, ChevronDown, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import SedesModal from './SedesModal';
import Link from 'next/link';

export default function Header() {
  const { 
    cartCount, 
    setIsCartOpen, 
    setIsMenuOpen, 
    selectedWarehouseName, 
    selectedWarehouseAddress,
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
        {/* Fila Superior Unificada: Logo, Buscar, Carrito, Menú */}
        <div style={styles.topRow}>
          <div style={styles.logoContainer}>
            <Link href="/" onClick={handleHomeClick} style={{ textDecoration: 'none' }}>
              <h2 style={styles.logoText} className="header-logo">GLOSS</h2>
            </Link>
          </div>
          
          <div style={styles.actions}>
            {/* Botón Lupa de Búsqueda (Pantalla completa y escáner) */}
            <button 
              style={styles.iconButton} 
              className="header-icon-button" 
              onClick={() => setIsSearchOpen(true)}
              title="Buscar o Escanear"
            >
              <Search size={22} color="#475569" strokeWidth={1.5} className="header-icon-svg" />
            </button>

            {/* Botón Carrito (Con fondo Celeste Bebé) */}
            <button 
              style={styles.cartButtonHighlight} 
              className="header-cart-button" 
              onClick={() => setIsCartOpen(true)}
              title="Ver Carrito"
            >
              <ShoppingCart size={20} color="#0284C7" strokeWidth={1.5} className="header-icon-svg" />
              {cartCount > 0 && (
                <span style={styles.cartCountText} className="header-cart-count-text">{cartCount}</span>
              )}
            </button>
            
            {/* Botón Mi Cuenta (Plano) */}
            <Link 
              href="/profile" 
              style={styles.iconButton}
              className="header-profile-button"
              title="Mi Cuenta"
            >
              <User size={22} color="#475569" strokeWidth={1.5} className="header-icon-svg" />
            </Link>

            {/* Botón Menú Desplegable */}
            <button 
              style={styles.iconButton} 
              className="header-icon-button" 
              onClick={() => setIsMenuOpen(true)}
              title="Menú"
            >
              <Menu size={22} color="#475569" strokeWidth={1.5} className="header-icon-svg" />
            </button>
          </div>
        </div>

        {/* Fila Inferior: Selector de Sede y Dirección (Sub-header) */}
        <div style={styles.addressBar} className="header-address-bar">
          <div style={styles.addressBarLeft}>
            <MapPin size={15} color="#94A3B8" style={{ marginRight: '6px', flexShrink: 0 }} />
            <span style={styles.addressText} className="header-address-text">
              <strong style={{ fontWeight: '600', color: '#1F2937' }}>{selectedWarehouseName}</strong>
              {selectedWarehouseAddress && (
                <span style={{ color: '#94A3B8', marginLeft: '6px', fontWeight: '400' }}>
                  • {selectedWarehouseAddress}
                </span>
              )}
            </span>
          </div>
          <button 
            onClick={() => setIsSedesModalOpen(true)} 
            style={styles.addressBarBtn}
            className="header-address-btn"
            title="Cambiar Dirección o Sede"
          >
            <span>Ver direcciones</span>
            <ChevronDown size={13} style={{ marginLeft: '4px', flexShrink: 0 }} />
          </button>
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
  addressBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: '8px 0 2px 0',
    marginTop: '6px',
    borderTop: '1px solid rgba(142, 154, 167, 0.08)',
  },
  addressBarLeft: {
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
    paddingRight: '12px',
  },
  addressText: {
    fontSize: '0.75rem',
    fontFamily: 'var(--font-body), sans-serif',
    color: '#1F2937',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  addressBarBtn: {
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    color: '#0284C7', // Azul para combinar con el fondo celeste
    fontSize: '0.72rem',
    fontWeight: '600',
    fontFamily: 'var(--font-body), sans-serif',
    padding: '4px 8px',
    borderRadius: '8px',
    backgroundColor: '#E0F2FE', // Azul clarito bb / celeste suave
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  cartButtonHighlight: {
    height: '36px',
    padding: '0 12px',
    borderRadius: '10px',
    backgroundColor: '#E0F2FE', // Celeste bebé muy suave
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    cursor: 'pointer',
    transition: 'transform 0.2s ease, background-color 0.2s ease',
    textDecoration: 'none',
    border: 'none',
    outline: 'none',
    alignSelf: 'center',
    minWidth: '44px',
  },
  cartCountText: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#0284C7',
    fontFamily: 'var(--font-body), sans-serif',
  },
};
