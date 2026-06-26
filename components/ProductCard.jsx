'use client';

import React from 'react';
import { Plus, Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart, toggleFavorite, favorites } = useCart();

  const isFavorite = favorites.some((fav) => fav.id === product.id);

  return (
    <div style={styles.card} className="soft-card soft-card-hover">
      {/* Contenedor de la Imagen Flotante que sobresale hacia arriba */}
      <div style={styles.imageContainer}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={product.image || 'https://via.placeholder.com/200?text=Gloss'} 
          alt={product.name} 
          style={styles.image} 
        />
      </div>

      {/* Información del Producto y Acciones (Layout horizontal con dos columnas) */}
      <div style={styles.footerRow}>
        <div style={styles.infoCol}>
          {/* Nombre del producto con tipografía Serif Premium Bodoni Moda */}
          <h3 style={styles.name}>{product.name}</h3>
          
          {/* Descripción corta */}
          <p style={styles.description}>{product.brand || 'Cosmética Premium'}</p>
          
          {/* Precio del producto */}
          <div style={styles.priceContainer}>
            <span style={styles.priceLabel}>Precio</span>
            <span style={styles.priceValue}>S/ {product.price}</span>
          </div>
        </div>

        {/* Columna de Acciones apiladas verticalmente en el lado derecho */}
        <div style={styles.actionsCol}>
          <button 
            style={styles.circleButton} 
            onClick={() => toggleFavorite(product)}
            title="Añadir a Favoritos"
          >
            <Heart 
              size={16} 
              color={isFavorite ? 'var(--accent-start)' : 'var(--text-secondary)'} 
              fill={isFavorite ? 'var(--accent-start)' : 'none'} 
            />
          </button>
          
          <button 
            style={styles.circleButton} 
            onClick={() => addToCart(product)}
            title="Añadir a la Bolsa"
          >
            <Plus size={18} color="var(--text-primary)" />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    padding: '0 16px 20px 16px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%',
    overflow: 'visible',
    marginTop: '45px', // Espacio necesario para el producto flotante
    backgroundColor: '#FFFFFF',
    borderRadius: '28px',
    boxShadow: 'var(--soft-shadow-outer)',
    border: '1px solid rgba(216, 27, 96, 0.02)',
  },
  imageContainer: {
    width: '100%',
    height: '110px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: '-45px', // Margen negativo para empujar la imagen hacia arriba
    zIndex: 3,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  image: {
    maxHeight: '125px',
    maxWidth: '100%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 12px 14px rgba(216, 27, 96, 0.12))', // Sombra de gota de alta calidad
    transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    marginTop: '32px',
    gap: '8px',
  },
  infoCol: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0, // Evita desbordamiento de textos en flexbox
  },
  name: {
    fontFamily: 'var(--font-logo)', // Bodoni Moda para un look editorial premium
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.25',
    marginBottom: '4px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    minHeight: '2.5em', // Altura uniforme para 2 líneas
  },
  description: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.2',
    marginBottom: '10px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  priceContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  priceLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  priceValue: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
  },
  actionsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'center',
    flexShrink: 0,
  },
  circleButton: {
    background: '#FFFFFF',
    border: '1px solid rgba(216, 27, 96, 0.05)',
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 12px rgba(216, 27, 96, 0.04)',
    transition: 'transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
    outline: 'none',
  },
};
