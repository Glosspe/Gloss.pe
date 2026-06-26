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
        title={isFavorite ? "Quitar de Favoritos" : "Añadir a Favoritos"}
      >
        <Heart 
          size={18} 
          color={isFavorite ? 'var(--accent-start)' : 'var(--text-secondary)'} 
          fill={isFavorite ? 'var(--accent-start)' : 'none'} 
        />
      </button>

      {/* Contenedor de la Imagen del Producto (Dentro de la tarjeta con fondo rosa pastel suave) */}
      <div style={styles.imageContainer}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={product.image || 'https://via.placeholder.com/200?text=Gloss'} 
          alt={product.name} 
          style={styles.image} 
        />
      </div>

      {/* Información del Producto (Nombre y Detalle) */}
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
            title="Añadir a la Bolsa"
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
    backgroundColor: '#FFFFFF',
    borderRadius: '28px',
    boxShadow: 'var(--soft-shadow-outer)',
    border: '1px solid rgba(216, 27, 96, 0.02)',
    transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.3s ease',
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
    boxShadow: '0 6px 12px rgba(216, 27, 96, 0.05)',
    zIndex: 2,
    transition: 'transform 0.2s ease',
    outline: 'none',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    backgroundColor: 'var(--accent-soft)', // Fondo rosa pastel suave oficial de la marca
    borderRadius: '20px',
    overflow: 'hidden',
    marginBottom: '14px',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    mixBlendMode: 'multiply', // Se mezcla de forma limpia si la imagen tiene fondo blanco
  },
  infoContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  name: {
    fontFamily: 'var(--font-logo)', // Mantenemos la tipografía de logotipo elegante
    fontSize: '0.95rem',
    fontWeight: '700',
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
    marginTop: 'auto', // Empuja la fila del precio al final del contenedor de información
    borderTop: '1px solid rgba(216, 27, 96, 0.02)',
    paddingTop: '10px',
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
    border: '1px solid rgba(216, 27, 96, 0.05)',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 12px rgba(216, 27, 96, 0.03)',
    transition: 'transform 0.2s ease, background-color 0.2s ease',
    outline: 'none',
  },
};
