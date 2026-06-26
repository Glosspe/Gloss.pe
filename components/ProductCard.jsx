'use client';

import React from 'react';
import { Plus, Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function ProductCard({ product }) {
  const { addToCart, toggleFavorite, favorites } = useCart();

  const isFavorite = favorites.some((fav) => fav.id === product.id);

  return (
    <div style={styles.container}>
      {/* Mitad Superior: Imagen del Producto flotando libremente sin fondo */}
      <div style={styles.imageWrapper}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={product.image || 'https://via.placeholder.com/200?text=Gloss'} 
          alt={product.name} 
          style={styles.image} 
        />
      </div>

      {/* Mitad Inferior: Tarjeta blanca con información y botones de acción */}
      <div style={styles.infoCard} className="soft-card soft-card-hover">
        {/* Nombre del producto con tipografía Serif Premium */}
        <h3 style={styles.name}>{product.name}</h3>
        
        {/* Marca/Descripción */}
        <p style={styles.description}>{product.brand || 'Cosmética Premium'}</p>
        
        {/* Fila del precio y botones de compra */}
        <div style={styles.priceRow}>
          <div style={styles.priceColumn}>
            <span style={styles.priceLabel}>Precio</span>
            <span style={styles.priceValue}>S/ {product.price}</span>
          </div>
          
          {/* Grupo de Botones de Acción (Favorito + Agregar a la Bolsa) */}
          <div style={styles.actionsGroup}>
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
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'visible',
    justifyContent: 'flex-end',
  },
  imageWrapper: {
    width: '100%',
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // Sin fondo en el bloque superior
    marginBottom: '10px',
    position: 'relative',
    zIndex: 2,
  },
  image: {
    maxHeight: '100%',
    maxWidth: '90%',
    objectFit: 'contain',
    filter: 'drop-shadow(0 10px 12px rgba(216, 27, 96, 0.06))', // Sombra de gota suave sobre el fondo de la página
  },
  infoCard: {
    backgroundColor: '#FFFFFF', // Bloque inferior con fondo blanco
    borderRadius: '24px',
    padding: '16px',
    boxShadow: 'var(--soft-shadow-outer)',
    border: '1px solid rgba(216, 27, 96, 0.02)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flex: 1,
  },
  name: {
    fontFamily: 'var(--font-logo)', // Cormorant Garamond editorial
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.3',
    marginBottom: '4px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    minHeight: '2.6em', // Altura consistente para 2 líneas
  },
  description: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '10px',
  },
  priceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    borderTop: '1px solid rgba(216, 27, 96, 0.02)',
    paddingTop: '10px',
  },
  priceColumn: {
    display: 'flex',
    flexDirection: 'column',
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
  actionsGroup: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
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
    boxShadow: '0 4px 10px rgba(216, 27, 96, 0.03)',
    transition: 'transform 0.2s ease, background-color 0.2s ease',
    outline: 'none',
  },
};
