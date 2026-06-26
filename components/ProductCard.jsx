'use client';

import React from 'react';
import { Plus, Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart, toggleFavorite, favorites } = useCart();

  const isFavorite = favorites.some((fav) => fav.id === product.id);

  return (
    <div style={styles.card} className="soft-card soft-card-hover">
      {/* Botón de Favorito Flotante superior */}
      <button 
        style={styles.favoriteButton} 
        onClick={() => toggleFavorite(product)}
      >
        <Heart 
          size={18} 
          color={isFavorite ? 'var(--accent-start)' : 'var(--text-secondary)'} 
          fill={isFavorite ? 'var(--accent-start)' : 'none'} 
        />
      </button>

      {/* Imagen del Producto */}
      <div style={styles.imageContainer}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={product.image || 'https://via.placeholder.com/200?text=Gloss'} 
          alt={product.name} 
          style={styles.image} 
        />
      </div>

      {/* Información del Producto */}
      <div style={styles.infoContainer}>
        <h3 style={styles.name}>{product.name}</h3>
        <p style={styles.description}>{product.brand || 'Cosmética Premium'}</p>
        
        {/* Fila Inferior: Precio y Añadir */}
        <div style={styles.priceRow}>
          <div style={styles.priceColumn}>
            <span style={styles.priceLabel}>Precio</span>
            <span style={styles.priceValue}>S/ {product.price}</span>
          </div>
          
          <button 
            style={styles.addButton} 
            onClick={() => addToCart(product)}
          >
            <Plus size={20} color="var(--text-primary)" />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100%',
    justifyContent: 'space-between',
  },
  favoriteButton: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: '#FFFFFF',
    border: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 12px rgba(142, 154, 167, 0.08)',
    zIndex: 2,
    transition: 'transform 0.2s ease',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    backgroundColor: '#FAF9F8',
    borderRadius: '20px',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    mixBlendMode: 'multiply', // Combina con fondos claros
  },
  infoContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  name: {
    fontFamily: 'var(--font-title)',
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.3',
    minHeight: '2.6em', // Asegurar altura uniforme para 2 líneas
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  description: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.2',
    marginBottom: '12px',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  priceLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  priceValue: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
  },
  addButton: {
    background: '#FFFFFF',
    border: '1px solid rgba(142, 154, 167, 0.08)',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 12px rgba(142, 154, 167, 0.08)',
    transition: 'transform 0.2s ease, background-color 0.2s ease',
  },
};
