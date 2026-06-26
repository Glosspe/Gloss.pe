'use client';

import React, { useState } from 'react';
import { Plus, Heart, ShoppingBag, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart, toggleFavorite, favorites } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isFavorite = favorites.some((fav) => fav.id === product.id);

  const handleAddToCart = () => {
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  // Determinar color de acento del backdrop según categoría
  const getCategoryAccent = () => {
    const cat = product.category;
    if (cat === 'Capilar') return { bg: 'rgba(255, 182, 217, 0.15)', glow: 'rgba(255, 105, 180, 0.08)' };
    if (cat === 'Facial') return { bg: 'rgba(200, 220, 255, 0.15)', glow: 'rgba(100, 149, 237, 0.08)' };
    if (cat === 'Cosmeticos') return { bg: 'rgba(255, 200, 200, 0.18)', glow: 'rgba(255, 46, 147, 0.1)' };
    if (cat === 'Corporal') return { bg: 'rgba(220, 240, 220, 0.15)', glow: 'rgba(120, 200, 150, 0.08)' };
    return { bg: 'rgba(255, 220, 240, 0.12)', glow: 'rgba(255, 46, 147, 0.06)' };
  };

  const accent = getCategoryAccent();

  return (
    <div
      className="gloss-product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.card,
        transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? '0 20px 50px rgba(216, 27, 96, 0.1), 0 8px 20px rgba(0,0,0,0.04)' 
          : '0 4px 20px rgba(216, 27, 96, 0.04), 0 1px 6px rgba(0,0,0,0.02)',
      }}
    >
      {/* ═══ ZONA DE IMAGEN CON BACKDROP ORGÁNICO ═══ */}
      <div style={styles.imageZone}>
        {/* Fondo orgánico degradado */}
        <div style={{
          ...styles.organicBackdrop,
          background: `radial-gradient(ellipse at 50% 60%, ${accent.bg} 0%, transparent 70%)`,
        }} />
        
        {/* Shimmer / Brillo sutil animado */}
        <div style={styles.shimmer} className="card-shimmer" />

        {/* Badge de Categoría con glassmorphism */}
        {product.category && product.category !== 'Trending' && (
          <div style={styles.categoryBadge}>
            <span style={styles.categoryText}>{product.category}</span>
          </div>
        )}

        {/* Badge Trending / Destacado */}
        {(product.destacado || product.category === 'Trending') && (
          <div style={styles.trendingBadge}>
            <Sparkles size={10} color="#FFFFFF" />
            <span style={styles.trendingText}>Top</span>
          </div>
        )}

        {/* Botón de Favorito flotante */}
        <button
          style={{
            ...styles.heartButton,
            backgroundColor: isFavorite ? 'var(--accent-start)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }}
          title="Favorito"
        >
          <Heart
            size={14}
            color={isFavorite ? '#FFFFFF' : 'var(--accent-start)'}
            fill={isFavorite ? '#FFFFFF' : 'none'}
            strokeWidth={2.5}
          />
        </button>

        {/* Imagen del Producto */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image || 'https://via.placeholder.com/200?text=Gloss'}
          alt={product.name}
          style={{
            ...styles.productImage,
            transform: isHovered ? 'scale(1.06)' : 'scale(1)',
          }}
        />
      </div>

      {/* ═══ LÍNEA DE ACENTO GRADIENTE ═══ */}
      <div style={styles.accentLine} />

      {/* ═══ ZONA DE INFORMACIÓN ═══ */}
      <div style={styles.infoZone}>
        {/* Marca en mayúsculas, ultra ligero */}
        <span style={styles.brandLabel}>
          {product.brand || 'Gloss Beauty'}
        </span>

        {/* Nombre del producto con tipografía serif editorial */}
        <h3 style={styles.productName}>
          {product.name}
        </h3>

        {/* Fila de precio + botón de acción */}
        <div style={styles.bottomRow}>
          <div style={styles.priceBlock}>
            <span style={styles.currency}>S/</span>
            <span style={styles.priceValue}>{parseFloat(product.price || 0).toFixed(2)}</span>
          </div>

          <button
            style={{
              ...styles.addButton,
              ...(justAdded ? styles.addButtonSuccess : {}),
            }}
            onClick={handleAddToCart}
            title="Añadir a la bolsa"
          >
            {justAdded ? (
              <span style={styles.addedText}>✓</span>
            ) : (
              <ShoppingBag size={15} color="#FFFFFF" strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '20px',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    border: '1px solid rgba(216, 27, 96, 0.04)',
    transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.4s ease',
    cursor: 'pointer',
    position: 'relative',
  },

  // ─── Zona de imagen ───
  imageZone: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 4.2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#FDFBFC',
  },
  organicBackdrop: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '60%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  productImage: {
    position: 'relative',
    zIndex: 2,
    maxHeight: '75%',
    maxWidth: '80%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.06))',
    transition: 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
  },

  // ─── Badges ───
  categoryBadge: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    zIndex: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '20px',
    padding: '4px 10px',
    border: '1px solid rgba(255, 255, 255, 0.5)',
  },
  categoryText: {
    fontFamily: 'var(--font-title)',
    fontSize: '0.6rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  trendingBadge: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    zIndex: 5,
    background: 'var(--accent-gradient)',
    borderRadius: '20px',
    padding: '4px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    boxShadow: '0 4px 12px rgba(255, 46, 147, 0.25)',
  },
  trendingText: {
    fontFamily: 'var(--font-title)',
    fontSize: '0.6rem',
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },

  // ─── Corazón ───
  heartButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: 5,
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '1px solid rgba(216, 27, 96, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.06)',
  },

  // ─── Línea de acento ───
  accentLine: {
    width: '100%',
    height: '2px',
    background: 'linear-gradient(90deg, transparent 0%, var(--accent-start) 30%, var(--accent-end) 70%, transparent 100%)',
    opacity: 0.25,
  },

  // ─── Zona de información ───
  infoZone: {
    padding: '14px 14px 16px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  brandLabel: {
    fontFamily: 'var(--font-title)',
    fontSize: '0.6rem',
    fontWeight: '500',
    color: 'var(--accent-start)',
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    opacity: 0.8,
  },
  productName: {
    fontFamily: 'var(--font-logo)',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.3',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    minHeight: '2.6em',
    letterSpacing: '0.01em',
  },

  // ─── Fila inferior (precio + botón) ───
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: '10px',
  },
  priceBlock: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
  },
  currency: {
    fontFamily: 'var(--font-title)',
    fontSize: '0.7rem',
    fontWeight: '500',
    color: 'var(--text-secondary)',
  },
  priceValue: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.15rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  addButton: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--accent-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(255, 46, 147, 0.25)',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  },
  addButtonSuccess: {
    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
    boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)',
    transform: 'scale(1.1)',
  },
  addedText: {
    color: '#FFFFFF',
    fontSize: '1rem',
    fontWeight: '700',
  },
};
