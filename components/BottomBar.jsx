'use client';

import React from 'react';
import { Home, Heart, User, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomBar() {
  const { cartCount, favorites, setIsCartOpen } = useCart();
  const pathname = usePathname();

  const isHomeActive = pathname === '/';
  const isFavActive = pathname === '/favorites';
  const isProfileActive = pathname === '/profile';
  const favCount = favorites.length;

  return (
    <div style={styles.container} className="mobile-only-bar">
      <nav style={styles.navBar}>
        {/* Botón Home */}
        <Link href="/" style={styles.navItem}>
          <div style={{
            ...styles.iconWrapper,
            ...(isHomeActive ? styles.activeIcon : {})
          }}>
            <Home size={20} color={isHomeActive ? '#FFFFFF' : 'var(--text-secondary)'} />
          </div>
          <span style={{
            ...styles.label,
            color: isHomeActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: isHomeActive ? '700' : '500'
          }}>Inicio</span>
        </Link>

        {/* Botón Bolsa (Carrito) */}
        <button onClick={() => setIsCartOpen(true)} style={styles.navItemBtn}>
          <div style={styles.iconWrapper}>
            <ShoppingBag size={20} color="var(--text-secondary)" />
            {cartCount > 0 && (
              <span style={styles.badge}>{cartCount}</span>
            )}
          </div>
          <span style={styles.label}>Mi Bolsa</span>
        </button>

        {/* Botón Favoritos */}
        <Link href="/favorites" style={styles.navItem}>
          <div style={{
            ...styles.iconWrapper,
            ...(isFavActive ? styles.activeIcon : {})
          }}>
            <Heart size={20} color={isFavActive ? '#FFFFFF' : 'var(--text-secondary)'} />
            {favCount > 0 && (
              <span style={styles.badge}>{favCount}</span>
            )}
          </div>
          <span style={{
            ...styles.label,
            color: isFavActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: isFavActive ? '700' : '500'
          }}>Favoritos</span>
        </Link>

        {/* Botón Perfil */}
        <Link href="/profile" style={styles.navItem}>
          <div style={{
            ...styles.iconWrapper,
            ...(isProfileActive ? styles.activeIcon : {})
          }}>
            <User size={20} color={isProfileActive ? '#FFFFFF' : 'var(--text-secondary)'} />
          </div>
          <span style={{
            ...styles.label,
            color: isProfileActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: isProfileActive ? '700' : '500'
          }}>Mi Cuenta</span>
        </Link>
      </nav>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderTop: '1px solid rgba(142, 154, 167, 0.08)',
    padding: '4px 16px 6px 16px', // Altura reducida optimizada
    zIndex: 900,
    display: 'block',
    // Ocultar en pantallas grandes (Laptops/PC) usando media query en el globals o inline por JS
  },
  navBar: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    maxWidth: '500px',
    margin: '0 auto',
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    cursor: 'pointer',
  },
  navItemBtn: {
    background: 'none',
    border: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    cursor: 'pointer',
    outline: 'none',
  },
  iconWrapper: {
    width: '32px',
    height: '32px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'all 0.2s ease',
  },
  activeIcon: {
    background: 'var(--accent-gradient)',
    boxShadow: '0 6px 14px var(--accent-shadow)',
  },
  label: {
    fontSize: '0.7rem',
    fontFamily: 'var(--font-body)',
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: '0px',
    right: '0px',
    backgroundColor: 'var(--accent-start)',
    color: '#FFFFFF',
    fontSize: '0.6rem',
    fontWeight: '700',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
