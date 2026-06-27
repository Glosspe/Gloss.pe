'use client';

import React, { useState, useEffect } from 'react';
import { X, MapPin, Check, Globe } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function SedesModal({ isOpen, onClose }) {
  const { 
    selectedWarehouse, 
    setSelectedWarehouse, 
    selectedWarehouseName, 
    setSelectedWarehouseName 
  } = useCart();

  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar sedes dinámicas al abrir
  useEffect(() => {
    if (!isOpen) return;

    async function loadWarehouses() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/admin/warehouses');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setWarehouses(data.warehouses);
          }
        }
      } catch (err) {
        console.error('[SedesModal] Error al cargar sedes:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadWarehouses();
  }, [isOpen]);

  if (!isOpen) return null;

  // Agrupar almacenes por región
  const groupedWarehouses = warehouses.reduce((acc, w) => {
    const reg = w.region ? w.region.trim().toUpperCase() : 'CHICLAYO';
    if (!acc[reg]) acc[reg] = [];
    acc[reg].push(w);
    return acc;
  }, {});

  const formatLabel = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleSelect = (code, label) => {
    setSelectedWarehouse(code);
    setSelectedWarehouseName(label);
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <div style={styles.header}>
          <div style={styles.headerTitleGroup}>
            <MapPin size={20} color="var(--accent-start)" />
            <h3 style={styles.title}>Selecciona tu Sede</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        {/* Contenido con scroll */}
        <div style={styles.content}>
          <p style={styles.subtitle}>
            Elige una sede para mostrar la disponibilidad y stock real de los productos en tu zona.
          </p>

          {isLoading ? (
            <div style={styles.loaderContainer}>
              <div style={styles.spinner}></div>
              <span style={styles.loaderText}>Cargando sedes de Gloss...</span>
            </div>
          ) : (
            <div style={styles.optionsWrapper}>
              {/* Opción Global / Todas las Sedes */}
              <button
                style={{
                  ...styles.globalBtn,
                  borderColor: selectedWarehouse === 'all' ? 'var(--accent-start)' : 'rgba(142, 154, 167, 0.12)',
                  backgroundColor: selectedWarehouse === 'all' ? 'var(--accent-soft)' : '#FAF9F8',
                  color: selectedWarehouse === 'all' ? 'var(--accent-start)' : 'var(--text-primary)',
                }}
                onClick={() => handleSelect('all', 'Todas las sedes')}
              >
                <div style={styles.globalBtnLeft}>
                  <Globe size={18} style={styles.optionIcon} />
                  <div style={styles.btnInfo}>
                    <span style={styles.btnName}>Todas las Sedes (Stock Global)</span>
                    <span style={styles.btnSub}>Muestra el inventario total unificado</span>
                  </div>
                </div>
                {selectedWarehouse === 'all' && <Check size={18} color="var(--accent-start)" />}
              </button>

              {/* Listado agrupado por regiones */}
              {Object.keys(groupedWarehouses).map((region) => (
                <div key={region} style={styles.regionSection}>
                  <div style={styles.regionHeader}>
                    <span style={styles.regionTitle}>{formatLabel(region)}</span>
                    <button
                      style={{
                        ...styles.regionSelectLink,
                        color: selectedWarehouse === region ? 'var(--accent-start)' : 'var(--text-secondary)',
                      }}
                      onClick={() => handleSelect(region, `Región: ${formatLabel(region)}`)}
                    >
                      {selectedWarehouse === region ? '✓ Región Activa' : 'Ver todo en la región'}
                    </button>
                  </div>

                  <div style={styles.warehousesGrid}>
                    {groupedWarehouses[region].map((w) => {
                      const isSelected = selectedWarehouse === w.codalm;
                      return (
                        <button
                          key={w.codalm}
                          style={{
                            ...styles.warehouseCard,
                            borderColor: isSelected ? 'var(--accent-start)' : 'rgba(142, 154, 167, 0.1)',
                            backgroundColor: isSelected ? 'var(--accent-soft)' : '#FFFFFF',
                          }}
                          onClick={() => handleSelect(w.codalm, formatLabel(w.nomalm))}
                        >
                          <div style={styles.cardHeader}>
                            <span style={{
                              ...styles.cardName,
                              color: isSelected ? 'var(--accent-start)' : 'var(--text-primary)',
                              fontWeight: isSelected ? '600' : '500',
                            }}>
                              {formatLabel(w.nomalm)}
                            </span>
                            {isSelected && <Check size={16} color="var(--accent-start)" />}
                          </div>
                          {w.direccion && (
                            <span style={styles.cardAddress}>
                              {formatLabel(w.direccion)}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(29, 36, 43, 0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 45px rgba(29, 36, 43, 0.12)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(142, 154, 167, 0.08)',
  },
  headerTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontFamily: 'var(--font-logo)',
    fontSize: '1.15rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  },
  content: {
    padding: '20px 24px 28px 24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
    margin: '0 0 4px 0',
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
    width: '28px',
    height: '28px',
    border: '3px solid rgba(142, 154, 167, 0.1)',
    borderTopColor: 'var(--accent-start)',
    borderRadius: '50%',
  },
  loaderText: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
  },
  optionsWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  globalBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderRadius: '16px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    fontFamily: 'var(--font-body)',
  },
  globalBtnLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  optionIcon: {
    flexShrink: 0,
  },
  btnInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  btnName: {
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  btnSub: {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)',
  },
  regionSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  regionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '6px',
    borderBottom: '1px solid rgba(142, 154, 167, 0.08)',
  },
  regionTitle: {
    fontSize: '0.82rem',
    fontWeight: '600',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--text-primary)',
  },
  regionSelectLink: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: '500',
    padding: 0,
    outline: 'none',
  },
  warehousesGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  warehouseCard: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    padding: '12px 16px',
    borderRadius: '16px',
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textAlign: 'left',
    fontFamily: 'var(--font-body)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardName: {
    fontSize: '0.82rem',
  },
  cardAddress: {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
};
