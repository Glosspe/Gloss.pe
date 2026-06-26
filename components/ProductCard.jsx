'use client';

import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';

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

  // Estados para productos recomendados ("Completa tu rutina")
  const [isEquivalentsOpen, setIsEquivalentsOpen] = useState(false);
  const [equivalents, setEquivalents] = useState([]);
  const [isLoadingEquivalents, setIsLoadingEquivalents] = useState(false);
  const [equivalentsError, setEquivalentsError] = useState(null);
  const [addedEquivalents, setAddedEquivalents] = useState({});

  const isFavorite = favorites.some((fav) => fav.id === product.id);
  const stockBadge = getStockBadge(product.stock);

  const handleAddToCart = () => {
    addToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const handleAddToEquivalentsCart = (item) => {
    addToCart(item);
    setAddedEquivalents((prev) => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedEquivalents((prev) => ({ ...prev, [item.id]: false }));
    }, 1500);
  };

  // Carga perezosa de equivalentes al abrir el modal
  useEffect(() => {
    if (!isEquivalentsOpen || equivalents.length > 0 || isLoadingEquivalents) return;

    const fetchEquivalents = async () => {
      setIsLoadingEquivalents(true);
      setEquivalentsError(null);
      try {
        const res = await fetch(`/api/products/equivalents?id=${product.id}`);
        if (!res.ok) throw new Error('Error al cargar recomendaciones');
        const data = await res.json();
        setEquivalents(data);
      } catch (err) {
        console.error('Error fetching equivalents:', err);
        setEquivalentsError(err.message);
      } finally {
        setIsLoadingEquivalents(false);
      }
    };

    fetchEquivalents();
  }, [isEquivalentsOpen, product.id, equivalents.length, isLoadingEquivalents]);

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
      {/* ═══ ZONA DE IMAGEN CON ALFOMBRA LIMPIA ═══ */}
      <div className="product-card-image-zone">
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

        {/* Badge de Stock en la esquina superior derecha */}
        <div style={{
          ...styles.stockImageBadge,
          backgroundColor: stockBadge.bg,
          color: stockBadge.color,
          borderColor: stockBadge.color + '20'
        }}>
          <span style={{
            ...styles.stockDot,
            backgroundColor: stockBadge.dotColor
          }} />
          {stockBadge.label}
        </div>

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

        {/* Botón de Equivalentes (Completa tu rutina) */}
        {product.hasEquivalents && (
          <div style={styles.equivalentsContainer}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEquivalentsOpen(true);
              }}
              style={styles.equivalentsBtn}
              className="equivalents-pill-btn"
            >
              ✨ Completa tu rutina
            </button>
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
                size={18}
                color={isFavorite ? '#FFFFFF' : 'var(--accent-start)'}
                fill={isFavorite ? '#FFFFFF' : 'none'}
                strokeWidth={2}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ MODAL RECOMENDACIONES (COMPLETA TU RUTINA) ═══ */}
      {isEquivalentsOpen && (
        <div 
          style={modalStyles.overlay} 
          onClick={(e) => {
            e.stopPropagation();
            setIsEquivalentsOpen(false);
          }}
        >
          <div 
            style={modalStyles.modalContainer} 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div style={modalStyles.header}>
              <div style={modalStyles.titleContainer}>
                <Sparkles size={18} color="var(--accent-start)" />
                <h3 style={modalStyles.title}>Completa tu rutina</h3>
              </div>
              <button 
                style={modalStyles.closeButton} 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEquivalentsOpen(false);
                }}
              >
                <X size={20} color="var(--text-primary)" />
              </button>
            </div>

            {/* Subtítulo */}
            <p style={modalStyles.subtitle}>
              Recomendaciones del ERP para potenciar los resultados de tu compra.
            </p>

            {/* Cuerpo del Modal */}
            <div style={modalStyles.body}>
              {isLoadingEquivalents ? (
                <div style={modalStyles.loaderContainer}>
                  <div className="loader-spinner" style={modalStyles.spinner} />
                  <span style={modalStyles.loadingText}>Cargando recomendaciones...</span>
                </div>
              ) : equivalentsError ? (
                <div style={modalStyles.errorContainer}>
                  <p style={modalStyles.errorText}>Error al cargar recomendaciones de compra.</p>
                </div>
              ) : equivalents.length === 0 ? (
                <div style={modalStyles.emptyContainer}>
                  <p style={modalStyles.emptyText}>No hay recomendaciones disponibles para este producto.</p>
                </div>
              ) : (
                <div style={modalStyles.list}>
                  {equivalents.map((item) => {
                    const itemBadge = getStockBadge(item.stock);
                    const isAdded = addedEquivalents[item.id];
                    return (
                      <div key={item.id} style={modalStyles.itemRow}>
                        {/* Imagen mini */}
                        <div style={modalStyles.itemImageContainer}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            style={modalStyles.itemImage} 
                          />
                        </div>

                        {/* Detalles */}
                        <div style={modalStyles.itemInfo}>
                          <span style={modalStyles.itemBrand}>{item.brand}</span>
                          <h4 style={modalStyles.itemName} title={item.name}>
                            {item.name}
                          </h4>
                          
                          {/* Precio y Stock */}
                          <div style={modalStyles.itemMeta}>
                            <span style={modalStyles.itemPrice}>S/ {parseFloat(item.price || 0).toFixed(2)}</span>
                            
                            {/* Stock Badge */}
                            <span style={{
                              ...modalStyles.stockBadge,
                              backgroundColor: itemBadge.bg,
                              color: itemBadge.color,
                            }}>
                              {itemBadge.label}
                            </span>
                          </div>
                        </div>

                        {/* Botón Agregar */}
                        <div style={modalStyles.actionContainer}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToEquivalentsCart(item);
                            }}
                            disabled={item.stock <= 0}
                            style={{
                              ...modalStyles.addButton,
                              backgroundColor: item.stock <= 0 
                                ? '#E5E7EB' 
                                : isAdded 
                                  ? '#22C55E' 
                                  : 'var(--accent-gradient)',
                              color: item.stock <= 0 ? '#9CA3AF' : '#FFFFFF',
                              cursor: item.stock <= 0 ? 'not-allowed' : 'pointer',
                              transform: isAdded ? 'scale(1.03)' : 'scale(1)',
                              boxShadow: item.stock <= 0 ? 'none' : isAdded ? '0 4px 12px rgba(34, 197, 94, 0.3)' : '0 4px 12px rgba(255, 46, 147, 0.2)'
                            }}
                            className={item.stock <= 0 ? '' : 'soft-button-hover'}
                          >
                            {item.stock <= 0 ? 'Agotado' : isAdded ? '¡Agregado!' : 'Agregar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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
  categoryBadge: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    zIndex: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(8px)',
    borderRadius: '20px',
    padding: '3px 8px',
    border: '1px solid rgba(255, 255, 255, 0.4)',
  },
  categoryText: {
    fontFamily: 'var(--font-title)',
    fontSize: '0.58rem',
    fontWeight: '600',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  trendingBadge: {
    position: 'absolute',
    top: '10px',
    left: '10px',
    zIndex: 5,
    background: 'var(--accent-gradient)',
    borderRadius: '20px',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    boxShadow: '0 4px 10px rgba(255, 46, 147, 0.2)',
  },
  trendingText: {
    fontFamily: 'var(--font-title)',
    fontSize: '0.58rem',
    fontWeight: '700',
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
  stockImageBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    zIndex: 5,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.58rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    border: '1px solid',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  stockDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    display: 'inline-block',
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
    fontWeight: '600',
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
    fontWeight: '600',
    color: '#1F2937',
  },
  priceValue: {
    fontFamily: 'var(--font-title), sans-serif',
    fontSize: '1.3rem',
    fontWeight: '700',
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

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(28, 42, 56, 0.4)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 1100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modalContainer: {
    backgroundColor: 'var(--bg-primary)',
    width: '90%',
    maxWidth: '550px',
    borderRadius: '28px',
    boxShadow: '0 24px 60px rgba(216, 27, 96, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04)',
    border: '1px solid rgba(255, 46, 147, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
  subtitle: {
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    marginBottom: '20px',
    lineHeight: '1.4',
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '350px',
    overflowY: 'auto',
    paddingRight: '4px',
    gap: '12px',
  },
  loaderContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    gap: '12px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid var(--accent-soft)',
    borderTop: '3px solid var(--accent-start)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  errorContainer: {
    padding: '24px 0',
    textAlign: 'center',
  },
  errorText: {
    fontSize: '0.88rem',
    color: '#EF4444',
  },
  emptyContainer: {
    padding: '30px 0',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px',
    borderRadius: '18px',
    backgroundColor: 'var(--accent-soft)',
    border: '1px solid rgba(255, 46, 147, 0.05)',
    transition: 'transform 0.2s ease',
  },
  itemImageContainer: {
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px',
    flexShrink: 0,
    border: '1px solid rgba(255, 46, 147, 0.03)',
  },
  itemImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  itemInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  itemBrand: {
    fontSize: '0.62rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  itemName: {
    fontSize: '0.88rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.25',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '2px',
  },
  itemPrice: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--accent-end)',
  },
  stockBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.62rem',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actionContainer: {
    flexShrink: 0,
  },
  addButton: {
    border: 'none',
    borderRadius: '14px',
    padding: '8px 16px',
    fontSize: '0.8rem',
    fontWeight: '700',
    transition: 'all 0.2s ease',
  }
};
