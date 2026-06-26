'use client';

import React from 'react';
import { Plus, Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart, toggleFavorite, favorites } = useCart();

  const isFavorite = favorites.some((fav) => fav.id === product.id);

  return (
    <div style={styles.card} className="soft-card soft-card-hover">
      {/* Contenedor de la Imagen Flotante Absoluta */}
      <div style={styles.imageContainer}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={product.image || 'https://via.placeholder.com/200?text=Gloss'} 
          alt={product.name} 
          style={styles.image} 
        />
      </div>

      {/* Bloque superior de la tarjeta (Nombre + Descripción) */}
      <div style={styles.infoContainer}>
        <h3 style={styles.name}>{product.name}</h3>
        <p style={styles.description}>{product.brand || 'Cosmética Premium'}</p>
      </div>

      {/* Bloque inferior de la tarjeta (Precio + Botones de acciones) */}
      <div style={styles.footerRow}>
        <div style={styles.priceContainer}>
          <span style={styles.priceLabel}>Precio</span>
          <span style={styles.priceValue}>S/ {product.price}</span>
        </div>

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
    padding: '85px 16px 16px 16px', // Espacio superior reservado para la imagen flotante absoluta
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between', // Empuja la info hacia arriba y el precio/botones hacia abajo
    position: 'relative',
    height: '100%',
    minHeight: '290px', // Altura uniforme y compacta para todas las tarjetas
    overflow: 'visible',
    marginTop: '35px',
    backgroundColor: '#FFFFFF',
    borderRadius: '28px',
    boxShadow: 'var(--soft-shadow-outer)',
    border: '1px solid rgba(216, 27, 96, 0.02)',
  },
  imageContainer: {
    position: 'absolute',
    top: '-35px', // Sobresale 35px por encima del borde superior de la tarjeta blanca
    left: '12px',
    right: '12px',
    height: '110px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  image: {
    maxHeight: '105px',
    maxWidth: '100%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 12px 14px rgba(216, 27, 96, 0.12))', // Sombra flotante sobre la tarjeta blanca
  },
  infoContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    minWidth: 0, // Evita desbordamiento de textos en flexbox
  },
  name: {
    fontFamily: 'var(--font-logo)', // Bodoni Moda para un look editorial premium
    fontSize: '0.9rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    lineHeight: '1.25',
    marginBottom: '2px',
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
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '8px',
  },
  footerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: '100%',
    gap: '8px',
    borderTop: '1px solid rgba(216, 27, 96, 0.02)',
    paddingTop: '10px', // Línea divisoria muy tenue para que se vea estructurada la base
  },
  priceContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  priceLabel: {
    fontSize: '0.65rem',
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
    gap: '6px',
    alignItems: 'center',
    flexShrink: 0,
  },
  circleButton: {
    background: '#FFFFFF',
    border: '1px solid rgba(216, 27, 96, 0.05)',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 6px 12px rgba(216, 27, 96, 0.03)',
    transition: 'transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease',
    outline: 'none',
  },
};
