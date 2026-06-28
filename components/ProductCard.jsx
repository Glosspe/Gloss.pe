'use client';

import React, { useState } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

const getStockBadge = (stock) => {
  const qty = parseFloat(stock || 0);
  if (qty <= 0) {
    return {
      label: 'Agotado',
      color: '#EF4444',
      bg: 'rgba(254, 242, 242, 0.9)',
      dotColor: '#EF4444'
    };
  } else if (qty <= 10) {
    return {
      label: `Poco stock (${qty})`,
      color: '#F59E0B',
      bg: 'rgba(254, 243, 199, 0.9)',
      dotColor: '#F59E0B'
    };
  } else {
    return {
      label: 'Disponible',
      color: '#10B981',
      bg: 'rgba(236, 253, 245, 0.9)',
      dotColor: '#10B981'
    };
  }
};

export default function ProductCard({ product }) {
  const { addToCart, toggleFavorite, favorites } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isFavorite = favorites.some((fav) => fav.id === product.id);
  const stockBadge = getStockBadge(product.stock);

  const handleAddToCart = () => {
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <div
      className="gloss-product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.card,
        transform: isHovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? '0 20px 40px rgba(0,0,0,0.06), 0 8px 16px rgba(0,0,0,0.02)' 
          : '0 8px 24px rgba(0,0,0,0.02), 0 1px 4px rgba(0,0,0,0.01)',
      }}
    >
      {/* Badge de Stock pegado al borde superior de la tarjeta */}
      {stockBadge.label && stockBadge.label !== 'Disponible' && (
        <div style={{
          ...styles.stockCardBadge,
          backgroundColor: stockBadge.bg,
          color: stockBadge.color,
        }}>
          {stockBadge.label}
        </div>
      )}

      {/* Badge de Categoría / Trending pegado al borde superior izquierdo de la tarjeta */}
      {product.destacado || product.category === 'Trending' ? (
        <div style={styles.trendingCardBadge}>
          <span style={styles.trendingCardText}>Top</span>
        </div>
      ) : (
        product.category && (
          <div style={styles.categoryCardBadge}>
            <span style={styles.categoryCardText}>{product.category}</span>
          </div>
        )
      )}

      {/* Zona clickable que redirige al detalle del producto */}
      <Link 
        href={`/product/${product.id}`} 
        style={{ display: 'flex', flexDirection: 'column', flex: 1, textDecoration: 'none', color: 'inherit' }}
      >
        {/* ═══ ZONA DE IMAGEN CON ALFOMBRA LIMPIA ═══ */}
        <div className="product-card-image-zone">
          {/* Shimmer / Brillo sutil animado */}
          <div style={styles.shimmer} className="card-shimmer" />

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

          {/* Descripción / Observaciones del ERP */}
          {product.description && (
            <p style={styles.descriptionLabel}>
              {product.description}
            </p>
          )}
        </div>
      </Link>

      {/* Botón de Kit (Ver Kit) - Fuera de Link para evitar anidamiento HTML inválido */}
      {product.hasEquivalents && (
        <div style={styles.equivalentsContainer}>
          <Link
            href={`/product/${product.id}#kit`}
            className="equivalents-pill-btn"
            style={{ textDecoration: 'none' }}
          >
            Ver Kit
          </Link>
        </div>
      )}

      {/* Fila inferior: precio a la izquierda, botones de acción a la derecha */}
      <div style={styles.bottomRow}>
        {/* Bloque de Precio */}
        <div style={styles.priceBlock}>
          <span style={styles.priceLabel}>Precio</span>
          <div style={styles.priceValueBlock}>
            <span style={styles.currency}>S/</span>
            <span style={styles.priceValue}>{parseFloat(product.price || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* Zona de Botones de Acción */}
        <div className="product-card-actions-zone">
          {/* Botón Agregar al Carrito (Verde) */}
          <button
            className={`product-add-to-cart-btn ${justAdded ? 'success' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}
            disabled={product.stock <= 0}
            style={product.stock <= 0 ? styles.disabledAddToCartBtn : {}}
          >
            {product.stock <= 0 ? 'Agotado' : (justAdded ? '¡Agregado! ✓' : 'Agregar al carrito')}
          </button>

          {/* Botón de Favorito (Corazón con borde de marca) */}
          <button
            className={`product-favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }}
            title="Favorito"
          >
            <Heart
              size={22}
              color={isFavorite ? '#FFFFFF' : '#FF5CA6'}
              fill={isFavorite ? '#FFFFFF' : 'none'}
              strokeWidth={2}
            />
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
    borderRadius: '28px',
    backgroundColor: '#FFFFFF',
    padding: '16px',
    border: '1px solid rgba(0, 0, 0, 0.02)',
    transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.4s ease',
    cursor: 'pointer',
    position: 'relative',
  },

  // ─── Zona de imagen ───
  shimmer: {
    position: 'absolute',
    top: 0,
    left: '-100%',
    width: '60%',
    height: '100%',
    background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
    zIndex: 1,
    pointerEvents: 'none',
  },
  productImage: {
    position: 'relative',
    zIndex: 2,
    maxHeight: '80%',
    maxWidth: '80%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.04))',
    transition: 'transform 0.5s cubic-bezier(0.25, 0.8, 0.25, 1)',
  },

  // ─── Badges ───
  categoryCardBadge: {
    position: 'absolute',
    top: 0,
    left: '24px',
    zIndex: 10,
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: '10px',
    borderBottomRightRadius: '10px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.02)',
  },
  categoryCardText: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.62rem',
    fontWeight: '600',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  trendingCardBadge: {
    position: 'absolute',
    top: 0,
    left: '24px',
    zIndex: 10,
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#1D242D', // Negro carbón sofisticado para evitar el exceso de rosa
    borderBottomLeftRadius: '10px',
    borderBottomRightRadius: '10px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.08)',
  },
  trendingCardText: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.62rem',
    fontWeight: '600', // Suavizado
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },

  // ─── Zona de información ───
  infoZone: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
    gap: '8px',
  },
  stockCardBadge: {
    position: 'absolute',
    top: 0,
    right: '24px',
    zIndex: 10,
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderBottomLeftRadius: '10px',
    borderBottomRightRadius: '10px',
    fontSize: '0.62rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.03)',
  },
  disabledAddToCartBtn: {
    backgroundColor: '#E5E7EB',
    color: '#9CA3AF',
    cursor: 'not-allowed',
    boxShadow: 'none',
    transform: 'none',
  },
  brandLabel: {
    fontFamily: 'var(--font-body), sans-serif',
    fontSize: '0.62rem',
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '2px',
  },
  productName: {
    fontFamily: 'var(--font-body), sans-serif',
    fontSize: '1.15rem',
    fontWeight: '500',
    color: '#1F2937',
    lineHeight: '1.25',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    minHeight: '2.5em',
    marginBottom: '2px',
  },
  descriptionLabel: {
    fontFamily: 'var(--font-body), sans-serif',
    fontSize: '0.78rem',
    color: '#6B7280',
    lineHeight: '1.35',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    marginBottom: '4px',
  },

  // ─── Fila inferior (precio + botones) ───
  bottomRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: '10px',
  },
  priceBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  priceLabel: {
    fontFamily: 'var(--font-body), sans-serif',
    fontSize: '0.72rem',
    color: '#9CA3AF',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  priceValueBlock: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '2px',
  },
  currency: {
    fontFamily: 'var(--font-title), sans-serif',
    fontSize: '0.8rem',
    fontWeight: '500',
    color: '#1F2937',
  },
  priceValue: {
    fontFamily: 'var(--font-title), sans-serif',
    fontSize: '1.3rem',
    fontWeight: '500',
    color: '#1F2937',
    letterSpacing: '-0.02em',
  },

  // ─── Stack de botones de acción ───
  actionsStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
  },
  roundButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: '#FFFFFF',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
  },
  roundButtonSuccess: {
    backgroundColor: '#22C55E',
    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
  },
  addedText: {
    color: '#FFFFFF',
    fontSize: '0.9rem',
    fontWeight: '700',
  },
  equivalentsContainer: {
    marginTop: '6px',
    marginBottom: '2px',
    display: 'flex',
    justifyContent: 'flex-start',
  },
  equivalentsBtn: {
    background: 'rgba(255, 46, 147, 0.05)',
    border: '1px solid rgba(255, 46, 147, 0.15)',
    borderRadius: '16px',
    padding: '4px 10px',
    color: '#FF2E93',
    fontFamily: 'var(--font-body), sans-serif',
    fontSize: '0.72rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
  },
};
