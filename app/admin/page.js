'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut, Search, Save, CheckCircle, AlertCircle, Loader2,
  Sparkles, RefreshCw, Upload, X, Eye, EyeOff, Package,
  LayoutGrid, Trash2, Star, ImagePlus
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'categories'

  // ── Productos ──
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Campos del editor de producto
  const [uploadedImages, setUploadedImages] = useState([]); // Array de data URIs o URLs
  const [richDescription, setRichDescription] = useState('');
  const [isTrending, setIsTrending] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // ── Categorías ──
  const [categories, setCategories] = useState([]);
  const [isCatLoading, setIsCatLoading] = useState(false);
  const [isCatSaving, setIsCatSaving] = useState(false);
  const [catMessage, setCatMessage] = useState({ type: '', text: '' });

  // ═══ Autenticación ═══
  useEffect(() => {
    const token = localStorage.getItem('gloss_admin_token');
    const user = localStorage.getItem('gloss_admin_user');
    if (!token) {
      router.push('/admin/login');
    } else {
      setAdminUser(user ? JSON.parse(user) : { nombre: 'Administrador' });
      loadProducts('');
      loadCategories();
    }
  }, [router]);

  // ═══ Productos: Cargar ═══
  const loadProducts = async (query = '') => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`/api/products/search?category=Todos&q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      } else {
        setMessage({ type: 'error', text: 'Error al obtener productos del ERP.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de red al consultar productos.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadProducts(searchQuery);
  };

  // ═══ Productos: Seleccionar ═══
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setUploadedImages(product.images && product.images.length > 0 ? [...product.images] : []);
    setRichDescription(product.description || '');
    setIsTrending(product.category === 'Trending' || product.destacado || false);
    setIsVisible(product.visible !== false);
    setMessage({ type: '', text: '' });
  };

  // ═══ Upload de Imágenes ═══
  const uploadFile = async (file) => {
    const token = localStorage.getItem('gloss_admin_token');
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Error al subir archivo');
    }

    const data = await res.json();
    return data.dataUri;
  };

  const handleFileSelect = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const newImages = [];
      for (const file of Array.from(files)) {
        if (file.size > 3 * 1024 * 1024) {
          setMessage({ type: 'error', text: `${file.name} excede 3MB. Usa una imagen más pequeña.` });
          continue;
        }
        const dataUri = await uploadFile(file);
        newImages.push(dataUri);
      }
      setUploadedImages(prev => [...prev, ...newImages]);
      if (newImages.length > 0) {
        setMessage({ type: 'success', text: `${newImages.length} imagen(es) subida(s) correctamente.` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Drag & Drop
  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragOver(false), []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  // ═══ Guardar Producto ═══
  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    setIsSaving(true);
    setMessage({ type: '', text: '' });
    const token = localStorage.getItem('gloss_admin_token');

    try {
      const response = await fetch('/api/admin/products/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          codart: selectedProduct.id,
          imagenes: uploadedImages,
          descripcionEnriquecida: richDescription,
          destacado: isTrending,
          visible: isVisible
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: '¡Producto actualizado con éxito!' });
        setProducts(prev => prev.map(p =>
          p.id === selectedProduct.id
            ? {
                ...p,
                image: uploadedImages.length > 0 ? uploadedImages[0] : p.image,
                images: uploadedImages,
                description: richDescription,
                destacado: isTrending,
                visible: isVisible,
                category: isTrending ? 'Trending' : p.category
              }
            : p
        ));
        setSelectedProduct(prev => ({
          ...prev,
          image: uploadedImages.length > 0 ? uploadedImages[0] : prev.image,
          images: uploadedImages,
          description: richDescription,
          destacado: isTrending,
          visible: isVisible,
          category: isTrending ? 'Trending' : prev.category
        }));
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de red al intentar guardar.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ═══ Categorías: Cargar ═══
  const loadCategories = async () => {
    setIsCatLoading(true);
    const token = localStorage.getItem('gloss_admin_token');
    try {
      const res = await fetch('/api/admin/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Error cargando categorías:', err);
    } finally {
      setIsCatLoading(false);
    }
  };

  // ═══ Categorías: Toggle visibilidad ═══
  const toggleCategoryVisibility = (categoria) => {
    setCategories(prev => prev.map(c =>
      c.categoria === categoria ? { ...c, visible: !c.visible } : c
    ));
  };

  // ═══ Categorías: Guardar ═══
  const saveCategories = async () => {
    setIsCatSaving(true);
    setCatMessage({ type: '', text: '' });
    const token = localStorage.getItem('gloss_admin_token');

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ categories })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCatMessage({ type: 'success', text: 'Categorías actualizadas correctamente.' });
      } else {
        setCatMessage({ type: 'error', text: data.error || 'Error al guardar categorías.' });
      }
    } catch (err) {
      setCatMessage({ type: 'error', text: 'Error de red.' });
    } finally {
      setIsCatSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gloss_admin_token');
    localStorage.removeItem('gloss_admin_user');
    router.push('/admin/login');
  };

  const CATEGORY_ICONS = { 
    'UÑAS': '💅', 
    'PESTAÑAS': '👁️', 
    'DECOLORADOR': '🧪', 
    'ACCESORIOS': '🛍️', 
    'HIDRATANTE': '🧴', 
    'ELECTRONICOS': '🔌', 
    'PIES': '🦶', 
    'PERFUME': '✨', 
    'FIJADOR': '💨', 
    'PARCHES': '🩹' 
  };
  const CATEGORY_LABELS = { 
    'UÑAS': 'Uñas', 
    'PESTAÑAS': 'Pestañas', 
    'DECOLORADOR': 'Decoloradores', 
    'ACCESORIOS': 'Accesorios', 
    'HIDRATANTE': 'Hidratantes', 
    'ELECTRONICOS': 'Electrónicos', 
    'PIES': 'Pies', 
    'PERFUME': 'Perfumes', 
    'FIJADOR': 'Fijadores', 
    'PARCHES': 'Parches' 
  };

  // ═══ RENDER ═══
  return (
    <div style={s.container}>
      {/* ── Barra Superior ── */}
      <header style={s.header}>
        <div style={s.headerContent}>
          <div style={s.logoGroup}>
            <Sparkles size={20} color="var(--accent-start)" />
            <h1 style={s.logo}>GLOSS ADMIN</h1>
          </div>
          <div style={s.userGroup}>
            <span style={s.userName}>{adminUser?.nombre}</span>
            <button onClick={handleLogout} style={s.logoutBtn}>
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>
      </header>

      {/* ── Tabs de Navegación ── */}
      <div style={s.tabBar}>
        <button
          style={{ ...s.tab, ...(activeTab === 'products' ? s.tabActive : {}) }}
          onClick={() => setActiveTab('products')}
        >
          <Package size={16} /> Productos
        </button>
        <button
          style={{ ...s.tab, ...(activeTab === 'categories' ? s.tabActive : {}) }}
          onClick={() => setActiveTab('categories')}
        >
          <LayoutGrid size={16} /> Categorías
        </button>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* ═══ TAB: PRODUCTOS ═══ */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === 'products' && (
        <div className="dashboard-grid">
          {/* Panel Izquierdo: Lista de Productos */}
          <div style={s.leftPanel}>
            <div style={s.panelCard} className="soft-card">
              <div style={s.panelHeader}>
                <h3 style={s.panelTitle}>Catálogo ERP</h3>
                <button onClick={() => loadProducts(searchQuery)} style={s.refreshBtn}>
                  <RefreshCw size={16} />
                </button>
              </div>

              <form onSubmit={handleSearch} style={s.searchForm}>
                <div style={s.searchBox}>
                  <Search size={18} color="var(--text-secondary)" />
                  <input
                    type="text"
                    placeholder="Buscar por código, nombre o marca..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={s.searchInput}
                  />
                </div>
                <button type="submit" style={s.searchBtn} className="soft-button">
                  Buscar
                </button>
              </form>

              <div style={s.productsList}>
                {isLoading ? (
                  <div style={s.centerState}>
                    <Loader2 size={32} color="var(--accent-start)" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={s.stateText}>Cargando productos...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div style={s.centerState}>
                    <p style={s.stateText}>No se encontraron productos.</p>
                  </div>
                ) : (
                  products.map((prod) => {
                    const isSelected = selectedProduct?.id === prod.id;
                    const hasCustomImage = prod.images && prod.images.length > 0;
                    const prodVisible = prod.visible !== false;
                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleSelectProduct(prod)}
                        style={{
                          ...s.productItem,
                          backgroundColor: isSelected ? 'var(--accent-soft)' : 'transparent',
                          borderColor: isSelected ? 'var(--accent-start)' : 'rgba(142, 154, 167, 0.08)',
                          opacity: prodVisible ? 1 : 0.5,
                        }}
                      >
                        <div style={s.prodThumb}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={prod.image} alt={prod.name} style={s.prodThumbImg} />
                        </div>
                        <div style={s.prodInfo}>
                          <h4 style={s.prodName}>{prod.name}</h4>
                          <div style={s.prodMeta}>
                            <span style={s.prodCode}>{prod.id}</span>
                            <span style={s.prodPrice}>S/ {prod.price}</span>
                            {hasCustomImage && <span style={s.badgeGreen}>📷</span>}
                            {prod.destacado && <span style={s.badgePink}>⭐</span>}
                            {!prodVisible && <span style={s.badgeGray}>Oculto</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Panel Derecho: Editor */}
          <div style={s.rightPanel}>
            {selectedProduct ? (
              <div style={s.panelCard} className="soft-card">
                <h3 style={s.panelTitle}>Editar Producto</h3>
                <p style={s.panelSub}>Personaliza las fotos y detalles para la web.</p>

                {/* Alertas */}
                {message.text && (
                  <div style={{
                    ...s.alert,
                    backgroundColor: message.type === 'success' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                    borderColor: message.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
                  }}>
                    {message.type === 'success' ? <CheckCircle size={16} color="#22C55E" /> : <AlertCircle size={16} color="#EF4444" />}
                    <span style={{ fontSize: '0.82rem', fontWeight: '600', color: message.type === 'success' ? '#22C55E' : '#EF4444' }}>
                      {message.text}
                    </span>
                  </div>
                )}

                {/* Ficha ERP */}
                <div style={s.erpGrid}>
                  <div style={s.erpItem}>
                    <span style={s.erpLabel}>Código ERP</span>
                    <span style={s.erpVal}>{selectedProduct.id}</span>
                  </div>
                  <div style={s.erpItem}>
                    <span style={s.erpLabel}>Nombre ERP</span>
                    <span style={s.erpVal}>{selectedProduct.name}</span>
                  </div>
                  <div style={s.erpItem}>
                    <span style={s.erpLabel}>Marca / Stock</span>
                    <span style={s.erpVal}>{selectedProduct.brand} | {selectedProduct.stock} und.</span>
                  </div>
                  <div style={s.erpItem}>
                    <span style={s.erpLabel}>Precio ERP</span>
                    <span style={s.erpVal}>S/ {selectedProduct.price}</span>
                  </div>
                </div>

                <form onSubmit={handleSave} style={s.editorForm}>
                  {/* ── Switches ── */}
                  <div style={s.switchRow}>
                    {/* Switch Visible */}
                    <div
                      style={{ ...s.switchCard, borderColor: isVisible ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)' }}
                      onClick={() => setIsVisible(!isVisible)}
                    >
                      {isVisible ? <Eye size={18} color="#22C55E" /> : <EyeOff size={18} color="#EF4444" />}
                      <div>
                        <div style={s.switchTitle}>{isVisible ? 'Visible en Web' : 'Oculto en Web'}</div>
                        <div style={s.switchDesc}>Los clientes {isVisible ? 'pueden' : 'NO pueden'} ver este producto</div>
                      </div>
                      <div style={{
                        ...s.toggleTrack,
                        backgroundColor: isVisible ? '#22C55E' : '#D1D5DB',
                      }}>
                        <div style={{
                          ...s.toggleThumb,
                          transform: isVisible ? 'translateX(20px)' : 'translateX(2px)',
                        }} />
                      </div>
                    </div>

                    {/* Switch Destacado */}
                    <div
                      style={{ ...s.switchCard, borderColor: isTrending ? 'rgba(255,46,147,0.3)' : 'rgba(142,154,167,0.1)' }}
                      onClick={() => setIsTrending(!isTrending)}
                    >
                      <Star size={18} color={isTrending ? 'var(--accent-start)' : 'var(--text-secondary)'} fill={isTrending ? 'var(--accent-start)' : 'none'} />
                      <div>
                        <div style={s.switchTitle}>Producto Destacado</div>
                        <div style={s.switchDesc}>Aparece en la sección "Trending"</div>
                      </div>
                      <div style={{
                        ...s.toggleTrack,
                        backgroundColor: isTrending ? 'var(--accent-start)' : '#D1D5DB',
                      }}>
                        <div style={{
                          ...s.toggleThumb,
                          transform: isTrending ? 'translateX(20px)' : 'translateX(2px)',
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* ── Zona de Upload con Drag & Drop ── */}
                  <div style={s.uploadSection}>
                    <label style={s.label}>Imágenes del Producto</label>
                    <div
                      style={{
                        ...s.dropZone,
                        borderColor: isDragOver ? 'var(--accent-start)' : 'rgba(142,154,167,0.2)',
                        backgroundColor: isDragOver ? 'rgba(255,46,147,0.04)' : '#FAFAFA',
                      }}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <div style={s.uploadingState}>
                          <Loader2 size={28} color="var(--accent-start)" style={{ animation: 'spin 1s linear infinite' }} />
                          <span style={s.dropText}>Subiendo imagen...</span>
                        </div>
                      ) : (
                        <>
                          <ImagePlus size={32} color={isDragOver ? 'var(--accent-start)' : 'var(--text-secondary)'} />
                          <span style={s.dropText}>
                            {isDragOver ? 'Suelta la imagen aquí' : 'Arrastra una imagen o haz clic para seleccionar'}
                          </span>
                          <span style={s.dropHint}>JPEG, PNG, WebP — máx. 3MB</span>
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileSelect(e.target.files)}
                      />
                    </div>

                    {/* Grid de imágenes subidas */}
                    {uploadedImages.length > 0 && (
                      <div style={s.imageGrid}>
                        {uploadedImages.map((imgSrc, idx) => (
                          <div key={idx} style={s.imageThumb}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imgSrc} alt={`Imagen ${idx + 1}`} style={s.imageThumbImg} />
                            <button
                              type="button"
                              style={s.removeImgBtn}
                              onClick={() => handleRemoveImage(idx)}
                            >
                              <X size={12} color="#FFF" />
                            </button>
                            {idx === 0 && <span style={s.mainBadge}>Principal</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Descripción ── */}
                  <div style={s.inputGroup}>
                    <label style={s.label}>Descripción de Venta</label>
                    <textarea
                      placeholder="Beneficios, ingredientes, modo de uso..."
                      rows={5}
                      value={richDescription}
                      onChange={(e) => setRichDescription(e.target.value)}
                      style={s.textarea}
                    />
                  </div>

                  {/* ── Botón Guardar ── */}
                  <button type="submit" disabled={isSaving} style={s.saveBtn} className="soft-button">
                    {isSaving ? (
                      <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
                    ) : (
                      <><Save size={18} /> Guardar Cambios</>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              <div style={s.emptyEditor} className="soft-card">
                <Package size={48} color="var(--text-tertiary)" />
                <h4 style={{ marginTop: '16px' }}>Selecciona un producto</h4>
                <p style={s.emptyText}>Elige un artículo de la lista para editar sus imágenes, descripción y visibilidad.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* ═══ TAB: CATEGORÍAS ═══ */}
      {/* ══════════════════════════════════════════ */}
      {activeTab === 'categories' && (
        <div style={s.catContainer}>
          <div style={s.catCard} className="soft-card">
            <h3 style={s.panelTitle}>Gestión de Categorías</h3>
            <p style={s.panelSub}>Controla qué categorías se muestran en la tienda y su orden.</p>

            {catMessage.text && (
              <div style={{
                ...s.alert,
                backgroundColor: catMessage.type === 'success' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                borderColor: catMessage.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
              }}>
                {catMessage.type === 'success' ? <CheckCircle size={16} color="#22C55E" /> : <AlertCircle size={16} color="#EF4444" />}
                <span style={{ fontSize: '0.82rem', fontWeight: '600', color: catMessage.type === 'success' ? '#22C55E' : '#EF4444' }}>
                  {catMessage.text}
                </span>
              </div>
            )}

            {isCatLoading ? (
              <div style={s.centerState}>
                <Loader2 size={32} color="var(--accent-start)" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <div style={s.catList}>
                {categories.map((cat) => (
                  <div key={cat.categoria} style={{
                    ...s.catItem,
                    opacity: cat.visible ? 1 : 0.5,
                    borderColor: cat.visible ? 'rgba(34,197,94,0.2)' : 'rgba(142,154,167,0.1)',
                  }}>
                    <div style={s.catIcon}>{CATEGORY_ICONS[cat.categoria] || '📦'}</div>
                    <div style={s.catInfo}>
                      <div style={s.catName}>{CATEGORY_LABELS[cat.categoria] || cat.categoria}</div>
                      <div style={s.catStatus}>
                        {cat.visible ? '✅ Visible en la tienda' : '🚫 Oculta para los clientes'}
                      </div>
                    </div>
                    <div
                      style={{
                        ...s.toggleTrack,
                        backgroundColor: cat.visible ? '#22C55E' : '#D1D5DB',
                      }}
                      onClick={() => toggleCategoryVisibility(cat.categoria)}
                    >
                      <div style={{
                        ...s.toggleThumb,
                        transform: cat.visible ? 'translateX(20px)' : 'translateX(2px)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={saveCategories}
              disabled={isCatSaving}
              style={s.saveCatBtn}
              className="soft-button"
            >
              {isCatSaving ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
              ) : (
                <><Save size={18} /> Guardar Configuración de Categorías</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// ═══ ESTILOS ═══
// ═══════════════════════════════════════════════════
const s = {
  container: { minHeight: '100vh', backgroundColor: '#F8F9FA', display: 'flex', flexDirection: 'column' },

  // Header
  header: {
    backgroundColor: '#FFFFFF', borderBottom: '1px solid rgba(142,154,167,0.08)',
    position: 'sticky', top: 0, zIndex: 10, padding: '14px 24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
  },
  headerContent: { maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  logoGroup: { display: 'flex', alignItems: 'center', gap: '8px' },
  logo: { fontFamily: 'var(--font-logo)', fontWeight: '600', fontSize: '1.35rem', letterSpacing: '0.15em', color: 'var(--text-primary)' },
  userGroup: { display: 'flex', alignItems: 'center', gap: '16px' },
  userName: { fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' },
  logoutBtn: { background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' },

  // Tabs
  tabBar: {
    display: 'flex', gap: '0', maxWidth: '1200px', width: '100%', margin: '0 auto',
    padding: '16px 20px 0 20px',
  },
  tab: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px',
    border: 'none', borderBottom: '3px solid transparent', cursor: 'pointer',
    fontFamily: 'var(--font-body)', fontWeight: '600', fontSize: '0.9rem',
    color: 'var(--text-secondary)', backgroundColor: 'transparent',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: 'var(--accent-start)', borderBottomColor: 'var(--accent-start)',
  },

  // Panels
  leftPanel: { flex: 1, minWidth: '320px' },
  rightPanel: { flex: 1.3 },
  panelCard: {
    padding: '20px', backgroundColor: '#FFFFFF', borderRadius: '20px',
    height: 'calc(100vh - 170px)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  panelTitle: { fontSize: '1.1rem', fontWeight: '700', fontFamily: 'var(--font-title)', letterSpacing: '0.02em' },
  panelSub: { fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '16px', marginTop: '-6px' },
  refreshBtn: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' },

  // Search
  searchForm: { display: 'flex', gap: '8px', marginBottom: '14px' },
  searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(142,154,167,0.12)', borderRadius: '14px', padding: '0 12px', backgroundColor: '#FAFAFA' },
  searchInput: { border: 'none', outline: 'none', width: '100%', height: '40px', fontSize: '0.85rem', fontFamily: 'var(--font-body)', backgroundColor: 'transparent' },
  searchBtn: { padding: '0 16px', borderRadius: '14px', height: '42px', fontSize: '0.82rem' },

  // Products list
  productsList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' },
  centerState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' },
  stateText: { fontSize: '0.85rem', color: 'var(--text-secondary)' },
  productItem: { display: 'flex', gap: '10px', padding: '8px', borderRadius: '14px', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s ease' },
  prodThumb: { width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  prodThumbImg: { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' },
  prodInfo: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 },
  prodName: { fontSize: '0.82rem', fontWeight: '600', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  prodMeta: { display: 'flex', gap: '6px', marginTop: '2px', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-secondary)' },
  prodCode: { fontWeight: '600' },
  prodPrice: { fontWeight: '700', color: 'var(--text-primary)' },
  badgeGreen: { fontSize: '0.65rem' },
  badgePink: { fontSize: '0.65rem' },
  badgeGray: { backgroundColor: '#F3F4F6', color: '#6B7280', padding: '1px 5px', borderRadius: '4px', fontWeight: '600', fontSize: '0.6rem' },

  // Alert
  alert: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid', padding: '10px 14px', borderRadius: '12px', marginBottom: '12px' },

  // ERP summary
  erpGrid: { backgroundColor: '#F8F9FA', borderRadius: '14px', padding: '14px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' },
  erpItem: { display: 'flex', flexDirection: 'column' },
  erpLabel: { fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em' },
  erpVal: { fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  // Editor form
  editorForm: { display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto', paddingRight: '4px' },

  // Switches
  switchRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  switchCard: {
    flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px 14px', borderRadius: '14px', border: '1px solid',
    cursor: 'pointer', transition: 'all 0.2s ease', backgroundColor: '#FAFAFA',
  },
  switchTitle: { fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' },
  switchDesc: { fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '1px' },
  toggleTrack: {
    width: '42px', height: '22px', borderRadius: '11px', marginLeft: 'auto',
    position: 'relative', transition: 'background-color 0.2s ease', flexShrink: 0, cursor: 'pointer',
  },
  toggleThumb: {
    width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#FFFFFF',
    position: 'absolute', top: '2px', transition: 'transform 0.2s ease',
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
  },

  // Upload
  uploadSection: { display: 'flex', flexDirection: 'column', gap: '10px' },
  label: { fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' },
  dropZone: {
    border: '2px dashed', borderRadius: '16px', padding: '28px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '8px', cursor: 'pointer', transition: 'all 0.2s ease',
  },
  dropText: { fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500', textAlign: 'center' },
  dropHint: { fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: '500' },
  uploadingState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  imageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' },
  imageThumb: {
    position: 'relative', borderRadius: '12px', overflow: 'hidden', aspectRatio: '1',
    backgroundColor: '#F5F5F5', border: '1px solid rgba(142,154,167,0.1)',
  },
  imageThumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  removeImgBtn: {
    position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px',
    borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.9)', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  mainBadge: {
    position: 'absolute', bottom: '4px', left: '4px', backgroundColor: 'var(--accent-start)',
    color: '#FFF', fontSize: '0.55rem', fontWeight: '700', padding: '2px 6px',
    borderRadius: '6px', textTransform: 'uppercase',
  },

  // Description textarea
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  textarea: {
    width: '100%', padding: '12px 14px', border: '1px solid rgba(142,154,167,0.12)',
    borderRadius: '14px', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
    outline: 'none', resize: 'none', backgroundColor: '#FAFAFA',
  },

  // Save button
  saveBtn: { width: '100%', height: '46px', marginTop: '8px', flexShrink: 0, fontSize: '0.88rem' },

  // Empty editor
  emptyEditor: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: 'calc(100vh - 170px)', padding: '40px', backgroundColor: '#FFFFFF',
    color: 'var(--text-primary)', borderRadius: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  emptyText: { fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '8px', maxWidth: '280px' },

  // ── Categories tab ──
  catContainer: { maxWidth: '700px', width: '100%', margin: '20px auto', padding: '0 20px' },
  catCard: {
    padding: '24px', backgroundColor: '#FFFFFF', borderRadius: '20px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  catList: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' },
  catItem: {
    display: 'flex', alignItems: 'center', gap: '14px', padding: '16px',
    borderRadius: '16px', border: '1px solid', transition: 'all 0.2s ease',
    backgroundColor: '#FAFAFA',
  },
  catIcon: { fontSize: '1.8rem', lineHeight: 1 },
  catInfo: { flex: 1 },
  catName: { fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: '600', color: 'var(--text-primary)' },
  catStatus: { fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' },
  saveCatBtn: { width: '100%', height: '48px', fontSize: '0.88rem' },
};
