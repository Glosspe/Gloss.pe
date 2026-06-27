'use client';

import React from 'react';
import { useCart } from '@/context/CartContext';
import ProductCard from '@/components/ProductCard';
import { ArrowLeft, ShoppingBag, Menu, Heart } from 'lucide-react';
import Link from 'next/link';

export default function FavoritesPage() {
  const { 
    favorites, 
    cartCount, 
    setIsCartOpen, 
    setIsMenuOpen 
  } = useCart();

  return (
    <div style={styles.container}>
      {/* Barra de Navegación Superior */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/" style={styles.backButton}>
            <ArrowLeft size={22} color="var(--text-primary)" />
            <span style={styles.backText}>Inicio</span>
          </Link>
          
          <h2 style={styles.title}>Mis Favoritos</h2>
          
          <div style={styles.actions}>
            {/* Carrito */}
            <button style={styles.iconButton} onClick={() => setIsCartOpen(true)}>
              <ShoppingBag size={22} color="var(--accent-start)" />
              {cartCount > 0 && (
                <span style={styles.badge}>{cartCount}</span>
              )}
            </button>
            
            {/* Menú */}
            <button style={styles.iconButton} onClick={() => setIsMenuOpen(true)}>
              <Menu size={22} color="var(--accent-start)" />
            </button>
          </div>
        </div>
      </header>

      {/* Cuerpo Principal */}
      <main style={styles.main}>
        {favorites.length === 0 ? (
          /* Empty State Premium */
          <div style={styles.emptyContainer}>
            <div style={styles.heartWrapper} className="soft-card">
              <Heart size={44} color="var(--accent-start)" fill="var(--accent-soft)" />
            </div>
            <h3 style={styles.emptyTitle}>Tu lista está vacía</h3>
            <p style={styles.emptySubtitle}>
              Guarda los productos que más te encanten para encontrarlos y comprarlos después fácilmente.
            </p>
            <Link href="/" className="soft-button">
              Explorar Catálogo
            </Link>
          </div>
        ) : (
          /* Grid de Productos Favoritos */
          <div style={styles.gridWrapper}>
            <p style={styles.countText}>Tienes {favorites.length} productos guardados</p>
            <div className="product-grid">
              {favorites.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
    paddingTop: '68px', // Compensa el Header fijo
    paddingBottom: '80px', // Espacio para el BottomBar móvil
  },
  header: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    width: '100%',
    maxWidth: '800px',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(142, 154, 167, 0.05)',
    padding: '12px 20px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  backText: {
    fontSize: '0.9rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.05rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
    margin: 0,
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
    fontWeight: '500',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid var(--bg-primary)',
  },
  main: {
    flex: 1,
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '16px 20px',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '80px 20px',
    gap: '16px',
  },
  heartWrapper: {
    width: '84px',
    height: '84px',
    borderRadius: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    boxShadow: 'var(--soft-shadow-outer)',
    marginBottom: '8px',
  },
  emptyTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.3rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    margin: 0,
  },
  emptySubtitle: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
    maxWidth: '320px',
    lineHeight: '1.45',
    margin: '0 0 12px 0',
  },
  gridWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  countText: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
    margin: '0 0 16px 20px',
  },
};
