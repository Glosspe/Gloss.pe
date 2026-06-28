'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Loader2, Image, ImageOff, Star, Eye, EyeOff, Package, AlertTriangle } from 'lucide-react';

export default function AdminProductSearch({
  products,
  isLoading,
  onSearch,
  onSelectProduct,
  selectedProduct,
  onBulkAction,
}) {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [sortBy, setSortBy] = useState('name-asc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const inputRef = useRef(null);
  const sortRef = useRef(null);
  const ITEMS_PER_PAGE = 25;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Reset page on filter/sort change
  useEffect(() => { setCurrentPage(1); }, [activeFilters, sortBy, products]);

  // Close sort menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter logic
  const filteredProducts = products.filter(p => {
    if (activeFilters.has('with-image') && (!p.images || p.images.length === 0)) return false;
    if (activeFilters.has('no-image') && p.images && p.images.length > 0) return false;
    if (activeFilters.has('featured') && !p.destacado) return false;
    if (activeFilters.has('visible') && p.visible === false) return false;
    if (activeFilters.has('hidden') && p.visible !== false) return false;
    if (activeFilters.has('in-stock') && (p.stock === undefined || p.stock <= 0)) return false;
    if (activeFilters.has('no-stock') && p.stock > 0) return false;
    return true;
  });

  // Sort logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc': return (a.name || '').localeCompare(b.name || '');
      case 'name-desc': return (b.name || '').localeCompare(a.name || '');
      case 'price-asc': return (a.price || 0) - (b.price || 0);
      case 'price-desc': return (b.price || 0) - (a.price || 0);
      case 'stock-asc': return (a.stock || 0) - (b.stock || 0);
      case 'stock-desc': return (b.stock || 0) - (a.stock || 0);
      case 'code': return (a.id || '').localeCompare(b.id || '');
      default: return 0;
    }
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = sortedProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const toggleFilter = (filter) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      // Mutually exclusive pairs
      const pairs = { 'with-image': 'no-image', 'no-image': 'with-image', 'visible': 'hidden', 'hidden': 'visible', 'in-stock': 'no-stock', 'no-stock': 'in-stock' };
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
        if (pairs[filter]) next.delete(pairs[filter]);
      }
      return next;
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedProducts.map(p => p.id)));
    }
  };

  const handleBulkAction = (action) => {
    if (onBulkAction) {
      onBulkAction(action, Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const FILTERS = [
    { id: 'with-image', label: 'Con Imagen', icon: Image, color: '#10B981', bgColor: '#E6F4EA' },
    { id: 'no-image', label: 'Sin Imagen', icon: ImageOff, color: '#D97706', bgColor: '#FEF3C7' },
    { id: 'featured', label: 'Destacado', icon: Star, color: '#E11D48', bgColor: '#FFF1F2' },
    { id: 'visible', label: 'Visible', icon: Eye, color: '#2563EB', bgColor: '#E8F0FE' },
    { id: 'hidden', label: 'Oculto', icon: EyeOff, color: '#4B5563', bgColor: '#F3F4F6' },
    { id: 'in-stock', label: 'Con Stock', icon: Package, color: '#059669', bgColor: '#E6F4EA' },
    { id: 'no-stock', label: 'Sin Stock', icon: AlertTriangle, color: '#DC2626', bgColor: '#FEE2E2' },
  ];

  const SORT_OPTIONS = [
    { id: 'name-asc', label: 'Nombre A → Z' },
    { id: 'name-desc', label: 'Nombre Z → A' },
    { id: 'price-asc', label: 'Precio menor → mayor' },
    { id: 'price-desc', label: 'Precio mayor → menor' },
    { id: 'stock-asc', label: 'Stock menor → mayor' },
    { id: 'stock-desc', label: 'Stock mayor → menor' },
    { id: 'code', label: 'Código' },
  ];

  // Skeleton loader
  const renderSkeletons = () => (
    Array.from({ length: 6 }).map((_, i) => (
      <div key={i} style={st.skeletonItem}>
        <div style={st.skeletonThumb} className="admin-skeleton" />
        <div style={st.skeletonText}>
          <div style={{ ...st.skeletonLine, width: '70%' }} className="admin-skeleton" />
          <div style={{ ...st.skeletonLine, width: '45%', height: '10px' }} className="admin-skeleton" />
        </div>
      </div>
    ))
  );

  return (
    <div style={st.container}>
      {/* Search Input */}
      <div style={st.searchRow}>
        <div style={st.searchInputWrapper}>
          <Search size={18} color="#9CA3AF" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar por código, nombre o marca..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={st.searchInput}
          />
          {query && (
            <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} style={st.clearBtn}>
              <X size={14} color="#9CA3AF" />
            </button>
          )}
        </div>

        {/* Sort Button */}
        <div ref={sortRef} style={{ position: 'relative' }}>
          <button onClick={() => setShowSortMenu(!showSortMenu)} style={st.sortBtn} title="Ordenar">
            <ArrowUpDown size={16} />
          </button>
          {showSortMenu && (
            <div style={st.sortMenu}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}
                  style={{
                    ...st.sortOption,
                    backgroundColor: sortBy === opt.id ? 'var(--accent-soft, rgba(255,46,147,0.06))' : 'transparent',
                    color: sortBy === opt.id ? 'var(--accent-start)' : 'var(--text-primary)',
                    fontWeight: sortBy === opt.id ? '700' : '500',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div style={st.filtersRow}>
        <Filter size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
        <div style={st.chipsList}>
          {FILTERS.map(f => {
            const active = activeFilters.has(f.id);
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                style={{
                  ...st.chip,
                  backgroundColor: active ? f.color : f.bgColor,
                  color: active ? '#FFFFFF' : f.color,
                  borderColor: active ? f.color : 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontWeight: '600',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  border: '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={12} style={{ flexShrink: 0 }} />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count + Select all */}
      <div style={st.resultsBar}>
        <div style={st.resultCount}>
          <span style={st.resultNumber}>{sortedProducts.length}</span>
          <span style={st.resultLabel}>producto{sortedProducts.length !== 1 ? 's' : ''}</span>
          {activeFilters.size > 0 && (
            <button onClick={() => setActiveFilters(new Set())} style={st.clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
        <div style={st.selectAllRow}>
          <label style={st.checkboxLabel}>
            <input
              type="checkbox"
              checked={sortedProducts.length > 0 && selectedIds.size === sortedProducts.length}
              onChange={toggleSelectAll}
              style={st.checkbox}
            />
            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Seleccionar todo</span>
          </label>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div style={st.bulkBar}>
          <span style={st.bulkCount}>{selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}</span>
          <div style={st.bulkActions}>
            <button onClick={() => handleBulkAction('feature')} style={st.bulkBtn}>
              <Star size={13} /> Destacar
            </button>
            <button onClick={() => handleBulkAction('show')} style={st.bulkBtn}>
              <Eye size={13} /> Mostrar
            </button>
            <button onClick={() => handleBulkAction('hide')} style={{ ...st.bulkBtn, color: '#EF4444' }}>
              <EyeOff size={13} /> Ocultar
            </button>
            <button onClick={() => handleBulkAction('unfeature')} style={{ ...st.bulkBtn, color: '#EF4444' }}>
              <X size={13} /> Quitar Dest.
            </button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} style={st.bulkClear}>
            <X size={12} /> Cancelar
          </button>
        </div>
      )}

      {/* Product List */}
      <div style={st.productList}>
        {isLoading ? renderSkeletons() : paginatedProducts.length === 0 ? (
          <div style={st.emptyState}>
            <Package size={40} color="#D1D5DB" />
            <p style={st.emptyText}>No se encontraron productos</p>
          </div>
        ) : (
          paginatedProducts.map(prod => {
            const isSelected = selectedProduct?.id === prod.id;
            const isChecked = selectedIds.has(prod.id);
            const hasImage = prod.images && prod.images.length > 0;
            const prodVisible = prod.visible !== false;
            return (
              <div
                key={prod.id}
                style={{
                  ...st.productItem,
                  backgroundColor: isSelected ? 'var(--accent-soft, rgba(255,46,147,0.04))' : isChecked ? 'rgba(59,130,246,0.04)' : 'transparent',
                  borderColor: isSelected ? 'var(--accent-start)' : isChecked ? 'rgba(59,130,246,0.3)' : 'rgba(142,154,167,0.08)',
                  opacity: prodVisible ? 1 : 0.55,
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => { e.stopPropagation(); toggleSelect(prod.id); }}
                  style={st.checkbox}
                />
                <div
                  style={st.productClickable}
                  onClick={() => onSelectProduct(prod)}
                >
                  <div style={st.prodThumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={prod.image} alt={prod.name} style={st.prodImg} />
                  </div>
                  <div style={st.prodInfo}>
                    <div style={st.prodName}>{prod.name}</div>
                    <div style={st.prodMeta}>
                      <span style={st.prodCode}>{prod.id}</span>
                      <span style={st.prodPrice}>S/ {prod.price}</span>
                      {prod.stock !== undefined && <span style={st.prodStock}>{prod.stock} und.</span>}
                      {hasImage && <Image size={11} color="#10B981" style={{ flexShrink: 0 }} />}
                      {prod.destacado && <Star size={11} color="#E11D48" fill="#E11D48" style={{ flexShrink: 0 }} />}
                      {!prodVisible && <span style={st.badgeHidden}>Oculto</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={st.pagination}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ ...st.pageBtn, opacity: currentPage === 1 ? 0.4 : 1 }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={st.pageInfo}>
            Pág. <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ ...st.pageBtn, opacity: currentPage === totalPages ? 0.4 : 1 }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

const st = {
  container: { display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' },

  // Search
  searchRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  searchInputWrapper: {
    flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
    backgroundColor: '#F9FAFB', border: '1px solid rgba(142,154,167,0.12)',
    borderRadius: '12px', padding: '0 14px', height: '44px',
    transition: 'border-color 0.2s',
  },
  searchInput: {
    border: 'none', outline: 'none', width: '100%', height: '100%',
    fontSize: '0.85rem', fontFamily: 'var(--font-body)', backgroundColor: 'transparent',
    color: 'var(--text-primary)',
  },
  clearBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: '50%', transition: 'background 0.2s',
  },
  sortBtn: {
    width: '44px', height: '44px', borderRadius: '12px',
    border: '1px solid rgba(142,154,167,0.12)', backgroundColor: '#F9FAFB',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#6B7280', transition: 'all 0.2s',
  },
  sortMenu: {
    position: 'absolute', top: '50px', right: 0, backgroundColor: '#FFFFFF',
    borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    border: '1px solid rgba(142,154,167,0.08)', padding: '6px', zIndex: 50,
    minWidth: '200px',
  },
  sortOption: {
    display: 'block', width: '100%', textAlign: 'left', border: 'none',
    padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
    fontSize: '0.82rem', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
  },

  // Filters
  filtersRow: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  chipsList: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  chip: {
    display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
    borderRadius: '20px', border: '1px solid', fontSize: '0.72rem', fontWeight: '600',
    fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },

  // Results bar
  resultsBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' },
  resultCount: { display: 'flex', alignItems: 'center', gap: '6px' },
  resultNumber: { fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' },
  resultLabel: { fontSize: '0.78rem', color: '#9CA3AF' },
  clearFilters: {
    background: 'none', border: 'none', color: 'var(--accent-start)', fontSize: '0.72rem',
    fontWeight: '600', cursor: 'pointer', textDecoration: 'underline',
  },
  selectAllRow: { display: 'flex', alignItems: 'center' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' },
  checkbox: { width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-start)' },

  // Bulk actions
  bulkBar: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
    backgroundColor: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
    borderRadius: '12px', flexWrap: 'wrap',
  },
  bulkCount: { fontSize: '0.78rem', fontWeight: '700', color: '#3B82F6', whiteSpace: 'nowrap' },
  bulkActions: { display: 'flex', gap: '4px', flexWrap: 'wrap', flex: 1 },
  bulkBtn: {
    display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
    borderRadius: '8px', border: 'none', backgroundColor: '#FFFFFF',
    fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer',
    color: 'var(--text-primary)', transition: 'all 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  bulkClear: {
    display: 'flex', alignItems: 'center', gap: '3px', background: 'none',
    border: 'none', color: '#9CA3AF', fontSize: '0.72rem', cursor: 'pointer',
    marginLeft: 'auto',
  },

  // Product list
  productList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' },
  productItem: {
    display: 'flex', gap: '10px', padding: '8px 10px', alignItems: 'center',
    borderRadius: '12px', border: '1px solid', cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  productClickable: { display: 'flex', gap: '10px', flex: 1, alignItems: 'center', cursor: 'pointer', minWidth: 0 },
  prodThumb: {
    width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#F5F5F5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', flexShrink: 0,
  },
  prodImg: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  prodInfo: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 },
  prodName: {
    fontSize: '0.8rem', fontWeight: '600', lineHeight: '1.2',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    color: 'var(--text-primary)',
  },
  prodMeta: { display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center', fontSize: '0.68rem', color: '#9CA3AF' },
  prodCode: { fontWeight: '600' },
  prodPrice: { fontWeight: '700', color: 'var(--text-primary)' },
  prodStock: { color: '#9CA3AF' },
  badge: { fontSize: '0.6rem' },
  badgeHidden: {
    backgroundColor: '#F3F4F6', color: '#6B7280', padding: '1px 5px',
    borderRadius: '4px', fontWeight: '600', fontSize: '0.58rem',
  },

  // Skeletons
  skeletonItem: { display: 'flex', gap: '10px', padding: '10px', alignItems: 'center' },
  skeletonThumb: { width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#E5E7EB' },
  skeletonText: { flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' },
  skeletonLine: { height: '12px', borderRadius: '6px', backgroundColor: '#E5E7EB' },

  // Empty
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '10px' },
  emptyText: { fontSize: '0.85rem', color: '#9CA3AF' },

  // Pagination
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
    padding: '10px 0', borderTop: '1px solid rgba(142,154,167,0.08)',
    marginTop: 'auto', flexShrink: 0,
  },
  pageBtn: {
    width: '34px', height: '34px', borderRadius: '10px', border: '1px solid rgba(142,154,167,0.12)',
    backgroundColor: '#F9FAFB', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', color: '#6B7280',
    transition: 'all 0.2s',
  },
  pageInfo: { fontSize: '0.78rem', color: '#9CA3AF' },
};
