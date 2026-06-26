'use client';

import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

export default function Cart() {
  const { 
    cart, 
    isCartOpen, 
    setIsCartOpen, 
    updateQuantity, 
    removeFromCart, 
    cartTotal 
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div style={styles.overlay} onClick={() => setIsCartOpen(false)}>
      <div style={styles.cartContainer} onClick={(e) => e.stopPropagation()}>
        {/* Encabezado del Carrito */}
        <div style={styles.header}>
          <div style={styles.titleContainer}>
            <ShoppingBag size={20} color="var(--text-primary)" />
            <h3 style={styles.title}>Bolsa de Compras</h3>
          </div>
          <button style={styles.closeButton} onClick={() => setIsCartOpen(false)}>
            <X size={20} color="var(--text-primary)" />
          </button>
        </div>

        {/* Lista de Items */}
        <div style={styles.itemsList}>
          {cart.length === 0 ? (
            <div style={styles.emptyCart}>
              <ShoppingBag size={48} color="var(--text-tertiary)" style={{ marginBottom: '16px' }} />
              <p style={styles.emptyText}>Tu bolsa de compras está vacía.</p>
              <button style={styles.exploreButton} onClick={() => setIsCartOpen(false)}>
                Ver Productos
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} style={styles.cartItem}>
                {/* Imagen del Item */}
                <div style={styles.itemImageContainer}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.name} style={styles.itemImage} />
                </div>
                
                {/* Detalles y Controles */}
                <div style={styles.itemDetails}>
                  <div style={styles.itemNameRow}>
                    <h4 style={styles.itemName}>{item.name}</h4>
                    <button style={styles.deleteButton} onClick={() => removeFromCart(item.id)}>
                      <Trash2 size={16} color="var(--text-secondary)" />
                    </button>
                  </div>
                  <span style={styles.itemBrand}>{item.brand}</span>
                  
                  {/* Fila de precio e incrementos */}
                  <div style={styles.itemControlRow}>
                    <span style={styles.itemPrice}>S/ {item.price}</span>
                    <div style={styles.qtyContainer}>
                      <button 
                        style={styles.qtyButton} 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus size={14} color="var(--text-primary)" />
                      </button>
                      <span style={styles.qtyValue}>{item.quantity}</span>
                      <button 
                        style={styles.qtyButton} 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus size={14} color="var(--text-primary)" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Resumen e ir al Checkout (Fijo al fondo) */}
        {cart.length > 0 && (
          <div style={styles.footer}>
            <div style={styles.summaryRow}>
              <span style={styles.summaryLabel}>Total</span>
              <span style={styles.summaryValue}>S/ {cartTotal.toFixed(2)}</span>
            </div>
            
            <Link href="/checkout" style={{ width: '100%' }}>
              <button 
                style={styles.checkoutButton} 
                className="soft-button"
                onClick={() => setIsCartOpen(false)}
              >
                Continuar a WhatsApp
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(28, 42, 56, 0.4)',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  cartContainer: {
    backgroundColor: 'var(--bg-primary)',
    width: '100%',
    maxWidth: '450px',
    height: '100%',
    boxShadow: '-10px 0 40px rgba(142, 154, 167, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  },
  header: {
    padding: '24px 20px',
    borderBottom: '1px solid rgba(142, 154, 167, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--bg-card)',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontFamily: 'var(--font-logo)',
    fontSize: '1.3rem', // Ligeramente mayor para el estilo Serif
    fontWeight: '700',
    letterSpacing: '0.01em',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  itemsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  emptyCart: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-secondary)',
  },
  emptyText: {
    fontSize: '0.95rem',
    fontWeight: '500',
    marginBottom: '20px',
  },
  exploreButton: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid rgba(142, 154, 167, 0.15)',
    borderRadius: '16px',
    padding: '10px 20px',
    fontFamily: 'var(--font-body)',
    fontWeight: '600',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(142, 154, 167, 0.04)',
  },
  cartItem: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid rgba(142, 154, 167, 0.05)',
    borderRadius: '20px',
    padding: '12px',
    display: 'flex',
    gap: '12px',
    boxShadow: '0 6px 16px rgba(142, 154, 167, 0.04)',
  },
  itemImageContainer: {
    width: '80px',
    height: '80px',
    backgroundColor: '#FAF9F8',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  itemImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  itemDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  itemNameRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
  },
  itemName: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    lineHeight: '1.2',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  deleteButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    color: 'var(--text-secondary)',
  },
  itemBrand: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  itemControlRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
  },
  itemPrice: {
    fontSize: '0.95rem',
    fontWeight: '700',
    fontFamily: 'var(--font-title)',
  },
  qtyContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'var(--bg-primary)',
    borderRadius: '12px',
    padding: '4px',
  },
  qtyButton: {
    background: 'none',
    border: 'none',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  qtyValue: {
    fontSize: '0.85rem',
    fontWeight: '600',
    padding: '0 8px',
    minWidth: '20px',
    textAlign: 'center',
  },
  footer: {
    padding: '24px 20px',
    backgroundColor: 'var(--bg-card)',
    borderTop: '1px solid rgba(142, 154, 167, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '1rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
  },
  summaryValue: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-title)',
  },
  checkoutButton: {
    width: '100%',
    height: '52px',
  },
};
