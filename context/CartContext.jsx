'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState('');
  const [parentCategoryLabel, setParentCategoryLabel] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedWarehouseName, setSelectedWarehouseName] = useState('Todas las sedes');
  const [selectedWarehouseAddress, setSelectedWarehouseAddress] = useState('Stock consolidado');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [favNotification, setFavNotification] = useState(null);
  const favTimerRef = React.useRef(null);

  // Cargar carrito, favoritos y sede desde localStorage al iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem('gloss_cart');
    const savedFavorites = localStorage.getItem('gloss_favorites');
    const savedWh = localStorage.getItem('gloss_selected_warehouse');
    const savedWhName = localStorage.getItem('gloss_selected_warehouse_name');
    const savedWhAddress = localStorage.getItem('gloss_selected_warehouse_address');
    const savedParentCat = localStorage.getItem('gloss_parent_category_label');
    
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedWh) setSelectedWarehouse(savedWh);
    if (savedWhName) setSelectedWarehouseName(savedWhName);
    if (savedWhAddress) setSelectedWarehouseAddress(savedWhAddress);
    if (savedParentCat) setParentCategoryLabel(savedParentCat);
    
    setIsInitialized(true); // Indicar que la restauración inicial está lista
  }, []);

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('gloss_cart', JSON.stringify(cart));
    }
  }, [cart, isInitialized]);

  // Guardar favoritos cuando cambie
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('gloss_favorites', JSON.stringify(favorites));
    }
  }, [favorites, isInitialized]);

  // Guardar sede en localStorage cuando cambie
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('gloss_selected_warehouse', selectedWarehouse);
      localStorage.setItem('gloss_selected_warehouse_name', selectedWarehouseName);
      localStorage.setItem('gloss_selected_warehouse_address', selectedWarehouseAddress);
    }
  }, [selectedWarehouse, selectedWarehouseName, selectedWarehouseAddress, isInitialized]);

  // Guardar categoría padre en localStorage cuando cambie
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('gloss_parent_category_label', parentCategoryLabel);
    }
  }, [parentCategoryLabel, isInitialized]);

  const addToCart = (product, quantity = 1) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      const currentQty = existingItem ? existingItem.quantity : 0;
      const newQty = currentQty + quantity;

      // Si el stock está definido, limitamos al stock disponible
      const maxStock = typeof product.stock === 'number' ? product.stock : 9999;
      const finalQty = Math.max(0, Math.min(newQty, maxStock));

      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: finalQty }
            : item
        );
      }
      return [...prevCart, { ...product, quantity: finalQty }];
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === productId) {
          const maxStock = typeof item.stock === 'number' ? item.stock : 9999;
          const finalQty = Math.max(0, Math.min(quantity, maxStock));
          return { ...item, quantity: finalQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleFavorite = (product) => {
    // Calculamos el estado actual de favoritos de forma síncrona
    const isCurrentlyFav = favorites.some((item) => item.id === product.id);
    const action = isCurrentlyFav ? 'removed' : 'added';

    // Actualizamos el estado de favoritos
    setFavorites((prevFavorites) => {
      if (isCurrentlyFav) {
        return prevFavorites.filter((item) => item.id !== product.id);
      }
      return [...prevFavorites, product];
    });

    // Mostrar alerta superior de color oscuro bonito (100% precisa en tiempo real)
    setFavNotification({
      show: true,
      message: action === 'added' ? 'Agregado a favoritos' : 'Eliminado de favoritos',
      productName: product.name,
      type: action
    });

    if (favTimerRef.current) {
      clearTimeout(favTimerRef.current);
    }

    favTimerRef.current = setTimeout(() => {
      setFavNotification(null);
    }, 2500);
  };

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        setIsCartOpen,
        isMenuOpen,
        setIsMenuOpen,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        selectedBrand,
        setSelectedBrand,
        selectedCategoryLabel,
        setSelectedCategoryLabel,
        parentCategoryLabel,
        setParentCategoryLabel,
        favorites,
        toggleFavorite,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        selectedWarehouse,
        setSelectedWarehouse,
        selectedWarehouseName,
        setSelectedWarehouseName,
        selectedWarehouseAddress,
        setSelectedWarehouseAddress,
        isSearchOpen,
        setIsSearchOpen,
        isInitialized,
      }}
    >
      {children}
      {favNotification && (
        <div style={toastStyles.overlay} className="fav-toast-animate">
          <div style={toastStyles.card}>
            {favNotification.type === 'added' ? (
              <Heart 
                size={20} 
                color="#FF5EA6" 
                fill="#FF5EA6" 
                strokeWidth={1.5} 
                style={toastStyles.heartIconSvg} 
              />
            ) : (
              <Heart 
                size={20} 
                color="#94A3B8" 
                fill="none" 
                strokeWidth={1.5} 
                style={toastStyles.heartIconSvg} 
              />
            )}
            <div style={toastStyles.textContainer}>
              <span style={toastStyles.title}>{favNotification.message}</span>
              <span style={toastStyles.subtitle}>{favNotification.productName}</span>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe ser utilizado dentro de un CartProvider');
  }
  return context;
}

const toastStyles = {
  overlay: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 99999,
    width: 'calc(100% - 40px)',
    maxWidth: '340px',
    pointerEvents: 'none', // Permite clics a través del overlay por seguridad
  },
  card: {
    backgroundColor: '#1E293B', // Gris oscuro elegante
    color: '#FFFFFF',
    borderRadius: '16px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  heartIconSvg: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'heartBeat 0.3s ease',
    flexShrink: 0,
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flex: 1,
  },
  title: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'var(--font-body), sans-serif',
  },
  subtitle: {
    fontSize: '0.75rem',
    color: '#94A3B8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: '2px',
    fontFamily: 'var(--font-body), sans-serif',
  },
};
