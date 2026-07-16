'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Search, Plus, Minus, Heart, Phone, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

const getStockBadge = (stock, lowStockThreshold = 5) => {
  const qty = parseFloat(stock || 0);
  if (qty <= 0) {
    return {
      label: 'Agotado',
      color: '#EF4444',
      bulletColor: '#EF4444',
      bg: 'rgba(254, 242, 242, 0.9)',
    };
  } else if (qty <= lowStockThreshold) {
    return {
      label: `¡Solo ${qty} unids!`,
      color: '#D97706',
      bulletColor: '#D97706',
      bg: '#FEF3C7',
    };
  } else {
    return {
      label: 'Disponible',
      color: '#10B981',
      bulletColor: '#10B981',
      bg: 'rgba(236, 253, 245, 0.9)',
    };
  }
};

export default function ProductDetailPage({ params }) {
  // Desempaquetar params de forma segura para Next.js 15+
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;

  const { cart, addToCart, toggleFavorite, favorites, setIsCartOpen, setIsSearchOpen, selectedWarehouse } = useCart();

  const [product, setProduct] = useState(null);
  const [equivalents, setEquivalents] = useState([]);
  const [crossSells, setCrossSells] = useState([]); // Venta cruzada dinámica
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEqui, setIsLoadingEqui] = useState(false);
  const [isLoadingCross, setIsLoadingCross] = useState(false); // Cargador venta cruzada
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

  // Fetch de venta cruzada (Comprados Juntos)
  useEffect(() => {
    async function fetchCrossSells() {
      setIsLoadingCross(true);
      try {
        const res = await fetch(`/api/products/cross-selling?productId=${id}&warehouse=${selectedWarehouse || ''}`);
        if (res.ok) {
          const data = await res.json();
          setCrossSells(data);
        }
      } catch (err) {
        console.error('Error fetching cross-sells:', err);
      } finally {
        setIsLoadingCross(false);
      }
    }

    if (product) {
      fetchCrossSells();
    }
  }, [product, id, selectedWarehouse]);

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

  const stockBadge = getStockBadge(product.stock, product.lowStockThreshold || 5);
  const kitTotalPrice = product.price + equivalents.reduce((acc, eq) => acc + (eq.stock > 0 ? eq.price : 0), 0);

  // Mensaje para WhatsApp utilizando el número corporativo configurado de forma dinámica
  const targetWhatsapp = product.whatsappNumber || '51900000000';
  const whatsappUrl = `https://wa.me/${targetWhatsapp}?text=${encodeURIComponent(
    `Hola Gloss, estoy interesada en el producto: ${product.name} (Código: ${product.id}).`
  )}`;

  return (
    <div style={styles.pageWrapper}>
      {/* Cabecera Fija Simplificada */}
      <header style={styles.header}>
        <Link href="/" style={styles.backBtn} title="Volver al catálogo">
          <ArrowLeft size={22} color="#475569" strokeWidth={1.3} />
        </Link>
        <div style={styles.rightActions}>
          <button style={styles.searchIconBtn} onClick={() => setIsSearchOpen(true)} title="Buscar o Escanear">
            <Search size={22} color="#475569" strokeWidth={1.3} />
          </button>
          <button style={styles.cartIconBtn} onClick={() => setIsCartOpen(true)} title="Ver Carrito">
            <ShoppingCart size={22} color="#475569" strokeWidth={1.3} />
          </button>
        </div>
      </header>

      {/* Contenedor de Ficha de Producto */}
      <div style={styles.detailContainer} className="product-detail-container">
        {/* Sección Superior: Imagen + Datos Principales */}
        <div style={styles.mainGrid} className="product-detail-main-grid">
          {/* Columna Izquierda: Imagen */}
          <div style={styles.imageColumn} className="product-detail-image-column">
            <div style={styles.imageCard} className="product-detail-image-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={product.image || 'https://via.placeholder.com/400?text=Gloss'} 
                alt={product.name} 
                style={styles.mainImage} 
                className="product-detail-main-image"
              />
            </div>
          </div>

          {/* Columna Derecha: Información y Compra */}
          <div style={styles.infoColumn} className="product-detail-info-column">
            <span style={styles.brandLabel}>{product.brand}</span>
            <h1 style={styles.productName} className="product-detail-name">{product.name}</h1>

            <div style={styles.metaRow}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: '600', color: stockBadge.color }}>
                <span style={{ fontSize: '9px', color: stockBadge.bulletColor }}>●</span>
                <span>{stockBadge.label}</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#CBD5E1' }}>|</span>
              <span style={styles.categoryLabel}>{product.category}</span>
            </div>

            {/* Bloque de Precio */}
            <div style={styles.priceContainer} className="product-detail-price-container">
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
                      <Minus size={14} color="var(--text-primary)" strokeWidth={1.3} />
                    </button>
                    <span style={styles.qtyVal}>{quantity}</span>
                    <button 
                      style={styles.qtyBtn} 
                      onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
                    >
                      <Plus size={14} color="var(--text-primary)" strokeWidth={1.3} />
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
                  background: '#FFFFFF',
                  border: '1px solid rgba(0, 0, 0, 0.04)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.015)',
                }}
                onClick={() => toggleFavorite(product)}
                className="detail-fav-btn" // Para que herede efectos de hover/active
              >
                <Heart 
                  size={20} 
                  color="#FF5EA6" 
                  fill={isFavorite ? '#FF5EA6' : 'none'} 
                  strokeWidth={1.3}
                />
              </button>
            </div>

            {/* Consultar por WhatsApp (Estilo enlace premium) */}
            <div style={styles.whatsappConsultation}>
              <Phone size={13} color="#16A34A" strokeWidth={1.3} />
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" style={styles.whatsappConsultationLink}>
                ¿Tienes dudas? Escríbenos por WhatsApp
              </a>
            </div>

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
            <div style={styles.kitGrid} className="product-detail-kit-grid">
              {/* Tarjeta del Producto Principal */}
              <div style={styles.kitItemCard} className="product-detail-kit-item-card">
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
                const equiBadge = getStockBadge(item.stock, item.lowStockThreshold || 5);
                const isAdded = addedItems[item.id];
                return (
                  <React.Fragment key={item.id}>
                    <div style={styles.kitPlusSymbol}>+</div>
                    
                    <div style={styles.kitItemCard} className="product-detail-kit-item-card">
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

        {/* Sección de Venta Cruzada: Comprados Juntos Habitualmente */}
        {!isLoadingCross && crossSells.length > 0 && (
          <div style={styles.crossSellSection}>
            <div style={styles.crossSellHeader}>
              <h2 style={styles.crossSellTitle}>Comprados juntos habitualmente</h2>
              <p style={styles.crossSellSubtitle}>
                Otras clientas que compraron este producto también se llevaron:
              </p>
            </div>
            
            <div style={styles.crossSellGrid} className="product-detail-cross-sell-grid">
              {crossSells.map((item) => {
                const isAdded = addedItems[item.id];
                return (
                  <div key={item.id} style={styles.crossSellCard} className="product-detail-cross-sell-card">
                    <Link href={`/product/${item.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={styles.crossSellImgWrapper}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image} alt={item.name} style={styles.crossSellImg} />
                      </div>
                      <div style={styles.crossSellDetails}>
                        <span style={styles.crossSellBrand}>{item.brand}</span>
                        <h4 style={styles.crossSellName}>{item.name}</h4>
                        <span style={styles.crossSellPrice}>S/ {item.price.toFixed(2)}</span>
                      </div>
                    </Link>
                    
                    <div style={{ padding: '0 12px 12px 12px' }}>
                      {item.stock > 0 ? (
                        <button
                          onClick={() => handleAddEquivalentToCart(item)}
                          style={{
                            ...styles.crossSellAddBtn,
                            backgroundColor: isAdded ? '#22C55E' : '#FF5EA6',
                          }}
                          className="soft-button"
                        >
                          {isAdded ? '✓ Agregado' : 'Añadir al carrito'}
                        </button>
                      ) : (
                        <button style={styles.crossSellAddDisabledBtn} disabled>
                          Agotado
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
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
  rightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  searchIconBtn: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  cartIconBtn: {
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
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
    fontSize: '0.72rem',
    fontWeight: '600',
    color: '#FF5EA6', // Rosa pastel unificado
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
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
    fontSize: '0.78rem',
    fontWeight: '500',
    color: '#64748B', // Gris pizarra elegante
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
    backgroundColor: '#F1F5F9', // Gris claro suave neumórfico
    borderRadius: '50px', // Totalmente redondeado
    padding: '4px',
    height: '48px',
    border: '1px solid rgba(0, 0, 0, 0.03)',
  },
  qtyBtn: {
    border: 'none',
    background: 'none',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  qtyVal: {
    fontSize: '0.95rem',
    fontWeight: '600',
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
    borderRadius: '50%', // Totalmente circular a juego con el diseño del catálogo
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  whatsappConsultation: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '12px 0 4px 0',
    padding: '4px 0',
  },
  whatsappConsultationLink: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#16A34A',
    textDecoration: 'none',
    borderBottom: '1px dashed rgba(22, 163, 74, 0.4)',
    transition: 'opacity 0.2s',
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
    lineHeight: '1.55',
  },
  specsTable: {
    display: 'flex',
    flexDirection: 'column',
    marginTop: '12px',
    borderTop: '1px solid rgba(0, 0, 0, 0.03)',
  },
  specRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8rem',
    padding: '8px 0',
    borderBottom: '1px solid rgba(0, 0, 0, 0.03)',
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
  },
  crossSellSection: {
    width: '100%',
    padding: '30px 20px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid rgba(0, 0, 0, 0.05)',
    marginTop: '40px',
  },
  crossSellHeader: {
    marginBottom: '20px',
  },
  crossSellTitle: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.35rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },
  crossSellSubtitle: {
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-body)',
  },
  crossSellGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginTop: '20px',
  },
  crossSellCard: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '16px',
    border: '1px solid rgba(0, 0, 0, 0.04)',
    overflow: 'hidden',
    transition: 'transform 0.2s ease',
  },
  crossSellImgWrapper: {
    width: '100%',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: '12px',
  },
  crossSellImg: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  crossSellDetails: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  crossSellBrand: {
    fontSize: '0.65rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  crossSellName: {
    fontSize: '0.8rem',
    fontWeight: '500',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    margin: 0,
    lineHeight: '1.3',
    display: '-webkit-box',
    WebkitLineClamp: '2',
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    height: '2.1rem',
  },
  crossSellPrice: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--accent-start)',
    marginTop: '4px',
  },
  crossSellAddBtn: {
    width: '100%',
    height: '36px',
    fontSize: '0.8rem',
    borderRadius: '10px',
    border: 'none',
    color: '#FFFFFF',
    cursor: 'pointer',
  },
  crossSellAddDisabledBtn: {
    width: '100%',
    height: '36px',
    fontSize: '0.8rem',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: 'rgba(0,0,0,0.05)',
    color: 'var(--text-secondary)',
    cursor: 'not-allowed',
  }
};
