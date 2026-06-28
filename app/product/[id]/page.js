'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingBag, Plus, Minus, Heart, Phone, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

const getStockBadge = (stock) => {
  const qty = parseFloat(stock || 0);
  if (qty <= 0) {
    return {
      label: 'Agotado',
      color: '#EF4444',
      bg: 'rgba(254, 242, 242, 0.9)',
    };
  } else if (qty <= 10) {
    return {
      label: `Poco stock (${qty})`,
      color: '#F59E0B',
      bg: 'rgba(254, 243, 199, 0.9)',
    };
  } else {
    return {
      label: 'Disponible',
      color: '#10B981',
      bg: 'rgba(236, 253, 245, 0.9)',
    };
  }
};

export default function ProductDetailPage({ params }) {
  // Desempaquetar params de forma segura para Next.js 15+
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;

  const { cart, addToCart, toggleFavorite, favorites, setIsCartOpen, selectedWarehouse } = useCart();

  const [product, setProduct] = useState(null);
  const [equivalents, setEquivalents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEqui, setIsLoadingEqui] = useState(false);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [addedItems, setAddedItems] = useState({});

  const isFavorite = product && favorites.some((fav) => fav.id === product.id);

  // Fetch de detalles del producto
  useEffect(() => {
    async function fetchProductDetail() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/products/detail?id=${id}&warehouse=${selectedWarehouse || ''}`);
        if (!res.ok) throw new Error('Producto no encontrado');
        const data = await res.json();
        setProduct(data);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchProductDetail();
    }
  }, [id, selectedWarehouse]);

  // Fetch de productos complementarios (Kit)
  useEffect(() => {
    async function fetchEquivalents() {
      setIsLoadingEqui(true);
      try {
        const res = await fetch(`/api/products/equivalents?id=${id}&warehouse=${selectedWarehouse || ''}`);
        if (res.ok) {
          const data = await res.json();
          setEquivalents(data);
        }
      } catch (err) {
        console.error('Error fetching equivalents:', err);
      } finally {
        setIsLoadingEqui(false);
      }
    }

    if (product && product.hasEquivalents) {
      fetchEquivalents();
    }
  }, [product, id, selectedWarehouse]);

  const handleAddToCart = () => {
    if (!product) return;
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const handleAddEquivalentToCart = (item) => {
    addToCart(item);
    setAddedItems(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [item.id]: false }));
    }, 1500);
  };

  const handleBuyKit = () => {
    if (!product) return;
    
    // Si el producto base no está en el carrito, lo agregamos
    const isBaseInCart = cart.some(item => item.id === product.id);
    if (!isBaseInCart) {
      addToCart(product);
    }
    
    // Agregamos únicamente los complementos del kit que no estén en el carrito y tengan stock
    equivalents.forEach(eq => {
      if (eq.stock > 0) {
        const isEquivalentInCart = cart.some(item => item.id === eq.id);
        if (!isEquivalentInCart) {
          addToCart(eq);
        }
      }
    });
    
    // Abrir el carrito
    setIsCartOpen(true);
  };

  if (isLoading) {
    return (
      <div style={styles.centerContainer}>
        <Loader2 className="loader-spinner" size={40} color="var(--accent-start)" style={styles.spinner} />
        <p style={styles.loadingText}>Cargando ficha del producto...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={styles.centerContainer}>
        <p style={styles.errorText}>{error || 'Producto no disponible'}</p>
        <Link href="/" style={styles.backLinkBtn} className="soft-button">
          Volver al Catálogo
        </Link>
      </div>
    );
  }

  const stockBadge = getStockBadge(product.stock);
  const kitTotalPrice = product.price + equivalents.reduce((acc, eq) => acc + (eq.stock > 0 ? eq.price : 0), 0);

  // Mensaje para WhatsApp
  const whatsappUrl = `https://wa.me/51900000000?text=${encodeURIComponent(
    `Hola Gloss, estoy interesada en el producto: ${product.name} (Código: ${product.id}).`
  )}`;

  return (
    <div style={styles.pageWrapper}>
      {/* Cabecera Fija Simplificada */}
      <header style={styles.header}>
        <Link href="/" style={styles.backBtn} title="Volver al catálogo">
          <ArrowLeft size={22} color="var(--accent-start)" />
        </Link>
        <button style={styles.cartIconBtn} onClick={() => setIsCartOpen(true)}>
          <ShoppingBag size={22} color="var(--accent-start)" />
        </button>
      </header>

      {/* Contenedor de Ficha de Producto */}
      <div style={styles.detailContainer}>
        {/* Sección Superior: Imagen + Datos Principales */}
        <div style={styles.mainGrid}>
          {/* Columna Izquierda: Imagen */}
          <div style={styles.imageColumn}>
            <div style={styles.imageCard}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={product.image || 'https://via.placeholder.com/400?text=Gloss'} 
                alt={product.name} 
                style={styles.mainImage} 
              />
            </div>
          </div>

          {/* Columna Derecha: Información y Compra */}
          <div style={styles.infoColumn}>
            <span style={styles.brandLabel}>{product.brand}</span>
            <h1 style={styles.productName}>{product.name}</h1>

            <div style={styles.metaRow}>
              <span style={{
                ...styles.stockBadge,
                backgroundColor: stockBadge.bg,
                color: stockBadge.color,
              }}>
                {stockBadge.label}
              </span>
              <span style={styles.categoryLabel}>{product.category}</span>
            </div>

            {/* Bloque de Precio */}
            <div style={styles.priceContainer}>
              <span style={styles.currency}>S/</span>
              <span style={styles.priceValue}>{product.price.toFixed(2)}</span>
            </div>

            {/* Controles de Compra */}
            <div style={styles.purchaseControls}>
              {product.stock > 0 ? (
                <>
                  <div style={styles.qtySelector}>
                    <button 
                      style={styles.qtyBtn} 
                      onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    >
                      <Minus size={16} color="var(--text-primary)" />
                    </button>
                    <span style={styles.qtyVal}>{quantity}</span>
                    <button 
                      style={styles.qtyBtn} 
                      onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
                    >
                      <Plus size={16} color="var(--text-primary)" />
                    </button>
                  </div>

                  <button 
                    style={styles.addToCartBtn} 
                    className="soft-button"
                    onClick={handleAddToCart}
                  >
                    {justAdded ? '¡Agregado al Carrito! ✓' : 'Agregar al carrito'}
                  </button>
                </>
              ) : (
                <button style={styles.disabledBtn} disabled>
                  Producto Agotado
                </button>
              )}

              {/* Botón de Favorito */}
              <button 
                style={{
                  ...styles.favBtn,
                  backgroundColor: isFavorite ? '#FF9EBA' : '#FFE6EC',
                  border: 'none', // Quitar línea de contorno
                }}
                onClick={() => toggleFavorite(product)}
              >
                <Heart 
                  size={20} 
                  color={isFavorite ? '#FFFFFF' : '#FF9EBA'} 
                  fill={isFavorite ? '#FFFFFF' : 'none'} 
                />
              </button>
            </div>

            {/* Consultar por WhatsApp */}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="whatsapp-btn">
              <Phone size={16} /> Consultar por WhatsApp
            </a>

            {/* Ficha técnica y Descripción */}
            <div style={styles.descriptionBox}>
              <h3 style={styles.subTitle}>Descripción</h3>
              <p style={styles.descriptionText}>
                {product.description || 'Este producto no cuenta con una descripción detallada registrada.'}
              </p>

              <div style={styles.specsTable}>
                <div style={styles.specRow}>
                  <span style={styles.specKey}>Código de producto</span>
                  <span style={styles.specValue}>{product.id}</span>
                </div>
                <div style={styles.specRow}>
                  <span style={styles.specKey}>Unidad</span>
                  <span style={styles.specValue}>{product.unit}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sección Inferior: El Kit Completo de Recomendados */}
        {product.hasEquivalents && equivalents.length > 0 && (
          <div id="kit" style={styles.kitSection}>
            <div style={styles.kitHeader}>
              <h2 style={styles.kitTitle}>Arma tu Kit de Rutina</h2>
              <p style={styles.kitSubtitle}>
                Combina este producto con sus complementos recomendados para maximizar tus resultados de belleza.
              </p>
            </div>

            {/* Grid de Productos del Kit */}
            <div style={styles.kitGrid}>
              {/* Tarjeta del Producto Principal */}
              <div style={styles.kitItemCard}>
                <div style={styles.kitItemImageContainer}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.image} alt={product.name} style={styles.kitItemImage} />
                </div>
                <div style={styles.kitItemDetails}>
                  <span style={styles.kitItemBrand}>{product.brand}</span>
                  <h4 style={styles.kitItemName}>{product.name}</h4>
                  <div style={styles.kitItemPriceRow}>
                    <span style={styles.kitItemPrice}>S/ {product.price.toFixed(2)}</span>
                    <span style={styles.kitItemBadgeMain}>Base</span>
                  </div>
                </div>
              </div>

              {/* Conector "+" visual */}
              {equivalents.map((item, idx) => {
                const equiBadge = getStockBadge(item.stock);
                const isAdded = addedItems[item.id];
                return (
                  <React.Fragment key={item.id}>
                    <div style={styles.kitPlusSymbol}>+</div>
                    
                    <div style={styles.kitItemCard}>
                      <div style={styles.kitItemImageContainer}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image} alt={item.name} style={styles.kitItemImage} />
                      </div>
                      <div style={styles.kitItemDetails}>
                        <span style={styles.kitItemBrand}>{item.brand}</span>
                        <h4 style={styles.kitItemName} title={item.name}>{item.name}</h4>
                        <div style={styles.kitItemPriceRow}>
                          <span style={styles.kitItemPrice}>S/ {item.price.toFixed(2)}</span>
                          <span style={{
                            ...styles.kitItemStockBadge,
                            backgroundColor: equiBadge.bg,
                            color: equiBadge.color
                          }}>
                            {equiBadge.label}
                          </span>
                        </div>
                        
                        {/* Agregar individual */}
                        {item.stock > 0 ? (
                          <button
                            onClick={() => handleAddEquivalentToCart(item)}
                            style={{
                              ...styles.kitItemAddBtn,
                              backgroundColor: isAdded ? '#22C55E' : 'rgba(0, 0, 0, 0.03)',
                              color: isAdded ? '#FFFFFF' : 'var(--text-primary)',
                              border: '1px solid rgba(0, 0, 0, 0.08)'
                            }}
                          >
                            {isAdded ? '✓ Agregado' : 'Añadir al Kit'}
                          </button>
                        ) : (
                          <button style={styles.kitItemDisabledBtn} disabled>
                            Agotado
                          </button>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Acción de Compra de Kit Completo */}
            <div style={styles.kitSummaryCard}>
              <div style={styles.kitSummaryInfo}>
                <span style={styles.kitSummaryLabel}>Lleva la Rutina Completa</span>
                <div style={styles.kitSummaryPriceBlock}>
                  <span style={styles.kitSummaryTotal}>S/ {kitTotalPrice.toFixed(2)}</span>
                  <span style={styles.kitSummaryIncludes}>
                    Incluye producto base y complementos con stock
                  </span>
                </div>
              </div>
              <button 
                style={styles.kitBuyBtn} 
                className="soft-button"
                onClick={handleBuyKit}
              >
                Comprar Kit Completo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  pageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    paddingTop: '60px',
    backgroundColor: 'var(--bg-primary)',
  },
  header: {
    position: 'fixed',
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    padding: '10px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(142, 154, 167, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: '800px',
  },
  backBtn: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  logoText: {
    fontFamily: 'var(--font-logo)',
    fontSize: '1.6rem',
    fontWeight: '600',
    color: 'var(--accent-start)',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
  cartIconBtn: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
  centerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px',
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
    width: '100%',
  },
  spinner: {
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '0.95rem',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  errorText: {
    fontSize: '1rem',
    color: '#EF4444',
    textAlign: 'center',
  },
  backLinkBtn: {
    padding: '12px 24px',
    borderRadius: '16px',
  },
  detailContainer: {
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    gap: '30px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '24px',
    // En desktop (min-width: 768px) cambiamos a 2 columnas
    '@media (min-width: 768px)': {
      gridTemplateColumns: '1fr 1.2fr',
      gap: '36px',
    }
  },
  imageColumn: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  imageCard: {
    width: '100%',
    maxWidth: '380px',
    aspectRatio: '1',
    borderRadius: '28px',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  mainImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    borderRadius: '20px',
  },
  infoColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  brandLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  productName: {
    fontSize: '1.6rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    lineHeight: '1.25',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '4px',
    marginBottom: '8px',
  },
  stockBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.7rem',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  categoryLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  priceContainer: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
    margin: '12px 0',
  },
  currency: {
    fontSize: '1.1rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  priceValue: {
    fontSize: '2rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
  },
  purchaseControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '8px 0',
  },
  qtySelector: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--accent-soft)',
    borderRadius: '16px',
    padding: '4px',
    height: '48px',
    border: '1px solid rgba(255, 46, 147, 0.08)',
  },
  qtyBtn: {
    border: 'none',
    background: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  qtyVal: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    width: '32px',
    textAlign: 'center',
  },
  addToCartBtn: {
    flex: 1,
    height: '48px',
    fontSize: '0.95rem',
  },
  disabledBtn: {
    flex: 1,
    height: '48px',
    borderRadius: '20px',
    backgroundColor: '#E5E7EB',
    color: '#9CA3AF',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'not-allowed',
  },
  favBtn: {
    width: '48px',
    height: '48px',
    borderRadius: '16px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  descriptionBox: {
    borderTop: '1px solid rgba(142, 154, 167, 0.08)',
    paddingTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  subTitle: {
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  descriptionText: {
    fontSize: '0.88rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.45',
  },
  specsTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    padding: '12px 16px',
    borderRadius: '18px',
    border: '1px solid rgba(0, 0, 0, 0.04)',
  },
  specRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8rem',
  },
  specKey: {
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  specValue: {
    color: 'var(--text-primary)',
    fontWeight: '700',
  },

  // ─── Sección Kit ───
  kitSection: {
    borderTop: '2px dashed rgba(255, 46, 147, 0.15)',
    paddingTop: '30px',
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  kitHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  kitTitleBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  kitTitle: {
    fontSize: '1.4rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  kitSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  kitGrid: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '16px',
    // En PC se alinea horizontalmente
    '@media (min-width: 600px)': {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }
  },
  kitItemCard: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: '#FFFFFF',
    border: '1px solid rgba(142, 154, 167, 0.06)',
    borderRadius: '20px',
    padding: '12px',
    boxShadow: 'var(--soft-shadow-outer)',
  },
  kitItemImageContainer: {
    width: '64px',
    height: '64px',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    border: '1px solid rgba(142, 154, 167, 0.04)',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  kitItemImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  kitItemDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  kitItemBrand: {
    fontSize: '0.58rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  kitItemName: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  kitItemPriceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '2px',
    marginBottom: '4px',
  },
  kitItemPrice: {
    fontSize: '0.88rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  kitItemBadgeMain: {
    fontSize: '0.58rem',
    fontWeight: '700',
    backgroundColor: 'rgba(216, 27, 96, 0.08)',
    color: 'var(--accent-start)',
    padding: '2px 6px',
    borderRadius: '8px',
    textTransform: 'uppercase',
  },
  kitItemStockBadge: {
    fontSize: '0.58rem',
    fontWeight: '700',
    padding: '2px 6px',
    borderRadius: '8px',
    textTransform: 'uppercase',
  },
  kitItemAddBtn: {
    border: 'none',
    borderRadius: '10px',
    padding: '6px 10px',
    fontSize: '0.72rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    width: 'fit-content',
  },
  kitItemDisabledBtn: {
    border: 'none',
    borderRadius: '10px',
    padding: '6px 10px',
    fontSize: '0.72rem',
    fontWeight: '700',
    backgroundColor: '#E5E7EB',
    color: '#9CA3AF',
    cursor: 'not-allowed',
    width: 'fit-content',
  },
  kitPlusSymbol: {
    fontSize: '1.6rem',
    fontWeight: '600',
    color: 'var(--text-tertiary)',
    textAlign: 'center',
    alignSelf: 'center',
  },
  kitSummaryCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    border: '1px solid rgba(0, 0, 0, 0.06)',
    borderRadius: '24px',
    padding: '18px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    alignItems: 'stretch',
    marginTop: '10px',
    '@media (min-width: 600px)': {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    }
  },
  kitSummaryInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  kitSummaryLabel: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  kitSummaryPriceBlock: {
    display: 'flex',
    flexDirection: 'column',
  },
  kitSummaryTotal: {
    fontSize: '1.6rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  kitSummaryIncludes: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
  },
  kitBuyBtn: {
    height: '48px',
    padding: '0 32px',
    fontSize: '0.95rem',
  }
};
