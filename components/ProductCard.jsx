'use client';

import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

const getStockBadge = (stock, lowStockThreshold = 5) => {
  const qty = parseFloat(stock || 0);
  if (qty <= 0) {
    return {
      label: 'Agotado',
      color: '#EF4444',
      bg: 'rgba(254, 242, 242, 0.9)',
      dotColor: '#EF4444'
    };
  } else if (qty <= lowStockThreshold) {
    return {
      label: `¡Solo ${qty} unids!`,
      color: '#B45309', // Cobre/marrón elegante
      bg: '#FEF3C7',    // Ámbar suave
      dotColor: '#D97706'
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
  const stockBadge = getStockBadge(product.stock, product.lowStockThreshold || 5);

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

      {/* ═══ FILA SUPERIOR DIVIDIDA EN DOS ═══ */}
      <div className="product-card-top-row">
        {/* Lado Izquierdo: Imagen */}
        <Link 
          href={`/product/${product.id}`} 
          className="product-card-left-side"
        >
          <div className="product-card-image-wrapper">
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
        </Link>

        {/* Lado Derecho: Precio + Botón Ver Kit + Marca/Nombre del Producto */}
        <div className="product-card-right-side">
          {/* Bloque de Precio */}
          <div style={styles.priceBlockSide}>
            <span style={styles.priceLabelSide} className="product-card-price-label">Precio</span>
            <div style={styles.priceValueBlock}>
              <span style={styles.currency} className="product-card-currency">S/</span>
              <span style={styles.priceValueSide} className="product-card-price-value">{parseFloat(product.price || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Botón de Kit */}
          {product.hasEquivalents && (
            <Link
              href={`/product/${product.id}#kit`}
              className="equivalents-pill-btn-side"
              style={{ textDecoration: 'none' }}
            >
              Ver Kit
            </Link>
          )}

          {/* Nombre y Marca en la columna derecha */}
          <Link 
            href={`/product/${product.id}`} 
            style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit', marginTop: '2px', width: '100%' }}
          >
            {/* Marca en mayúsculas, ultra ligero */}
            <span style={styles.brandLabel} className="product-card-brand">
              {product.brand || 'Gloss Beauty'}
            </span>

            {/* Nombre del producto */}
            <h3 style={styles.productName} className="product-card-name">
              {product.name}
            </h3>
          </Link>
        </div>
      </div>



      {/* ═══ FILA INFERIOR: BOTONES DE ACCIÓN ═══ */}
      <div style={styles.bottomRowJustButtons}>
        <div className="product-card-actions-zone" style={{ width: '100%' }}>
          {/* Botón Agregar al Carrito */}
          <button
            className={`product-add-to-cart-btn ${justAdded ? 'success' : ''}`}
            onClick={(e) => { e.stopPropagation(); handleAddToCart(); }}
            disabled={product.stock <= 0}
            style={product.stock <= 0 ? styles.disabledAddToCartBtn : {}}
          >
            {product.stock <= 0 ? 'Agotado' : (justAdded ? '¡Agregado! ✓' : 'Agregar al carrito')}
          </button>

          {/* Botón de Favorito (Corazón sin contorno) */}
          <button
            className={`product-favorite-btn ${isFavorite ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }}
            title="Favorito"
          >
            <Heart
              size={24}
              color={isFavorite ? '#FFFFFF' : '#FF2E93'}
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
    backgroundColor: '#FFFFFF', // Restaurado a blanco puro para flotar sobre el nuevo fondo
    padding: '16px',
    border: '1px solid rgba(0, 0, 0, 0.025)', // Borde sutil original
    transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.4s ease',
    cursor: 'pointer',
    position: 'relative',
  },

  // ─── Imagen ───
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
    maxHeight: '90%',
    maxWidth: '90%',
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
    backgroundColor: '#1D242D',
    borderBottomLeftRadius: '10px',
    borderBottomRightRadius: '10px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.08)',
  },
  trendingCardText: {
    fontFamily: 'var(--font-body)',
    fontSize: '0.62rem',
    fontWeight: '600',
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
    marginTop: '6px',
    padding: '0 6px', // Espacio interior adicional para que no empiece tan al borde de la tarjeta
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
    color: '#B8BFC6', // Aclarado a gris plata fino
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '2px',
  },
  productName: {
    fontFamily: 'var(--font-body), sans-serif',
    fontSize: '1.15rem',
    fontWeight: '500',
    color: '#4B5563', // Aclarado a gris intermedio elegante
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
    color: '#8E9AA7', // Aclarado a gris azulado suave
    lineHeight: '1.35',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    marginBottom: '4px',
  },

  // ─── Estilos de la columna de precio lateral ───
  priceBlockSide: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  priceLabelSide: {
    fontFamily: 'var(--font-body), sans-serif',
    fontSize: '0.68rem',
    color: '#B8BFC6', // Aclarado a gris plata fino
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  priceValueSide: {
    fontFamily: 'var(--font-title), sans-serif',
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#4B5563', // Aclarado a gris intermedio elegante
    letterSpacing: '-0.02em',
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
    color: '#8E9AA7', // Aclarado a gris azulado suave
  },

  // ─── Fila inferior de botones expandidos ───
  bottomRowJustButtons: {
    display: 'flex',
    marginTop: '12px',
    width: '100%',
  },
};
