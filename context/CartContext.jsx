'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedWarehouseName, setSelectedWarehouseName] = useState('Todas las sedes');
  const [isInitialized, setIsInitialized] = useState(false);

  // Cargar carrito, favoritos y sede desde localStorage al iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem('gloss_cart');
    const savedFavorites = localStorage.getItem('gloss_favorites');
    const savedWh = localStorage.getItem('gloss_selected_warehouse');
    const savedWhName = localStorage.getItem('gloss_selected_warehouse_name');
    
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedWh) setSelectedWarehouse(savedWh);
    if (savedWhName) setSelectedWarehouseName(savedWhName);
    
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
    }
  }, [selectedWarehouse, selectedWarehouseName, isInitialized]);

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
    setFavorites((prevFavorites) => {
      const isFav = prevFavorites.some((item) => item.id === product.id);
      if (isFav) {
        return prevFavorites.filter((item) => item.id !== product.id);
      }
      return [...prevFavorites, product];
    });
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
        isInitialized,
      }}
    >
      {children}
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
