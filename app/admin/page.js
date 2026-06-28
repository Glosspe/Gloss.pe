'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Save, CheckCircle, AlertCircle, Loader2,
  RefreshCw, Upload, X, Eye, EyeOff, Package,
  LayoutGrid, Trash2, Star, ImagePlus, Store,
  Menu, ChevronRight, Sparkles
} from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminProductSearch from '@/components/admin/AdminProductSearch';
import AdminConfirmModal from '@/components/admin/AdminConfirmModal';
import IntelligenceTab from '@/components/admin/IntelligenceTab';

// ═══════════════════════════════════════════
// ═══ Breadcrumb Map ═══
// ═══════════════════════════════════════════
const BREADCRUMBS = {
  'dashboard': { path: ['Dashboard'], title: 'Panel de Control', desc: 'Resumen general de tu tienda' },
  'products': { path: ['Catálogo', 'Productos'], title: 'Gestión de Productos', desc: 'Edita imágenes, descripciones y visibilidad' },
  'featured': { path: ['Catálogo', 'Destacados'], title: 'Productos Destacados', desc: 'Gestiona los productos del carrusel principal' },
  'categories': { path: ['Clasificación', 'Categorías'], title: 'Gestión de Categorías', desc: 'Controla qué categorías se muestran' },
  'warehouses': { path: ['Clasificación', 'Sedes'], title: 'Gestión de Sedes', desc: 'Activa o desactiva puntos de venta' },
  'intel-config': { path: ['E-commerce IA', 'Configuración'], title: 'Configuración General', desc: 'Parámetros del motor de inteligencia' },
  'intel-shortcuts': { path: ['E-commerce IA', 'Atajos'], title: 'Atajos de Búsqueda', desc: 'Píldoras rápidas del buscador' },
  'intel-tags': { path: ['E-commerce IA', 'Etiquetas'], title: 'Etiquetas de Necesidad', desc: 'Filtros por preocupación estética' },
  'intel-crosssell': { path: ['E-commerce IA', 'Venta Cruzada'], title: 'Venta Cruzada', desc: 'Asociaciones manuales de productos' },
  'intel-autotag': { path: ['E-commerce IA', 'Auto-Etiquetado'], title: 'Auto-Etiquetado', desc: 'Motor automático de clasificación' },
};

const CATEGORY_ICONS = {
  'UÑAS': '💅', 'PESTAÑAS': '👁️', 'DECOLORADOR': '🧪', 'ACCESORIOS': '🛍️',
  'HIDRATANTE': '🧴', 'ELECTRONICOS': '🔌', 'PIES': '🦶', 'PERFUME': '✨',
  'FIJADOR': '💨', 'PARCHES': '🩹'
};
const CATEGORY_LABELS = {
  'UÑAS': 'Uñas', 'PESTAÑAS': 'Pestañas', 'DECOLORADOR': 'Decoloradores',
  'ACCESORIOS': 'Accesorios', 'HIDRATANTE': 'Hidratantes', 'ELECTRONICOS': 'Electrónicos',
  'PIES': 'Pies', 'PERFUME': 'Perfumes', 'FIJADOR': 'Fijadores', 'PARCHES': 'Parches'
};

export default function AdminPage() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ── Confirm Modal ──
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, title: '', message: '', onConfirm: null, variant: 'danger', confirmText: 'Confirmar', isProcessing: false,
  });

  // ── Productos ──
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Campos del editor de producto
  const [uploadedImages, setUploadedImages] = useState([]);
  const [richDescription, setRichDescription] = useState('');
  const [isTrending, setIsTrending] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // ── Destacados ──
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [isFeatLoading, setIsFeatLoading] = useState(false);

  // ── Categorías ──
  const [categories, setCategories] = useState([]);
  const [isCatLoading, setIsCatLoading] = useState(false);
  const [isCatSaving, setIsCatSaving] = useState(false);
  const [catMessage, setCatMessage] = useState({ type: '', text: '' });

  // ── Sedes ──
  const [warehouses, setWarehouses] = useState([]);
  const [isWhLoading, setIsWhLoading] = useState(false);
  const [isWhSaving, setIsWhSaving] = useState(false);
  const [whMessage, setWhMessage] = useState({ type: '', text: '' });

  // ═══ Helper: Confirm Modal ═══
  const showConfirm = (title, message, onConfirm, variant = 'danger', confirmText = 'Confirmar') => {
    setConfirmModal({ isOpen: true, title, message, onConfirm, variant, confirmText, isProcessing: false });
  };

  const closeConfirm = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const executeConfirm = async () => {
    if (confirmModal.onConfirm) {
      setConfirmModal(prev => ({ ...prev, isProcessing: true }));
      await confirmModal.onConfirm();
      closeConfirm();
    }
  };

  // ═══ Autenticación ═══
  useEffect(() => {
    const token = localStorage.getItem('gloss_admin_token');
    const user = localStorage.getItem('gloss_admin_user');
    if (!token) {
      router.push('/admin/login');
    } else {
      setAdminUser(user ? JSON.parse(user) : { nombre: 'Administrador' });
      loadProducts('');
      loadFeaturedProducts();
      loadCategories();
      loadWarehouses();
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
        setMessage({ type: 'error', text: 'Error al obtener productos del catálogo.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de red al consultar productos.' });
    } finally {
      setIsLoading(false);
    }
  };

  // ═══ Destacados: Cargar ═══
  const loadFeaturedProducts = async () => {
    setIsFeatLoading(true);
    try {
      const response = await fetch('/api/products/search?category=Trending&q=');
      if (response.ok) {
        const data = await response.json();
        setFeaturedProducts(data);
      }
    } catch (err) {
      console.error('Error al cargar destacados:', err);
    } finally {
      setIsFeatLoading(false);
    }
  };

  // ═══ Destacados: Quitar ═══
  const handleRemoveFeatured = async (prod) => {
    const token = localStorage.getItem('gloss_admin_token');
    try {
      const response = await fetch('/api/admin/products/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          codart: prod.id, imagenes: prod.images || [],
          descripcionEnriquecida: prod.description || '',
          destacado: false, visible: prod.visible !== false
        })
      });
      if (response.ok) {
        setFeaturedProducts(prev => prev.filter(p => p.id !== prod.id));
        setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, destacado: false, category: p.category === 'Trending' ? 'Otros' : p.category } : p));
        if (selectedProduct?.id === prod.id) setIsTrending(false);
      }
    } catch (err) {
      console.error('Error al remover destacado:', err);
    }
  };

  const handleToggleVisibilityFeatured = async (prod) => {
    const token = localStorage.getItem('gloss_admin_token');
    const newVisible = prod.visible === false ? true : false;
    try {
      const response = await fetch('/api/admin/products/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          codart: prod.id, imagenes: prod.images || [],
          descripcionEnriquecida: prod.description || '',
          destacado: prod.destacado !== false, visible: newVisible
        })
      });
      if (response.ok) {
        setFeaturedProducts(prev => prev.map(p => p.id === prod.id ? { ...p, visible: newVisible } : p));
        setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, visible: newVisible } : p));
        if (selectedProduct?.id === prod.id) setIsVisible(newVisible);
      }
    } catch (err) {
      console.error('Error al cambiar visibilidad:', err);
    }
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
      method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
    });
    if (!res.ok) { const errData = await res.json(); throw new Error(errData.error || 'Error al subir archivo'); }
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
          setMessage({ type: 'error', text: `${file.name} excede 3MB.` });
          continue;
        }
        const dataUri = await uploadFile(file);
        newImages.push(dataUri);
      }
      setUploadedImages(prev => [...prev, ...newImages]);
      if (newImages.length > 0) setMessage({ type: 'success', text: `${newImages.length} imagen(es) subida(s).` });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = (index) => { setUploadedImages(prev => prev.filter((_, i) => i !== index)); };
  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragOver(false), []);
  const handleDrop = useCallback((e) => { e.preventDefault(); setIsDragOver(false); handleFileSelect(e.dataTransfer.files); }, []);

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
          codart: selectedProduct.id, imagenes: uploadedImages,
          descripcionEnriquecida: richDescription, destacado: isTrending, visible: isVisible
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMessage({ type: 'success', text: '¡Producto actualizado con éxito!' });
        setProducts(prev => prev.map(p =>
          p.id === selectedProduct.id ? {
            ...p, image: uploadedImages.length > 0 ? uploadedImages[0] : p.image,
            images: uploadedImages, description: richDescription,
            destacado: isTrending, visible: isVisible, category: isTrending ? 'Trending' : p.category
          } : p
        ));
        setSelectedProduct(prev => ({
          ...prev, image: uploadedImages.length > 0 ? uploadedImages[0] : prev.image,
          images: uploadedImages, description: richDescription,
          destacado: isTrending, visible: isVisible, category: isTrending ? 'Trending' : prev.category
        }));
        if (isTrending) {
          setFeaturedProducts(prev => {
            const exists = prev.some(p => p.id === selectedProduct.id);
            if (exists) {
              return prev.map(p => p.id === selectedProduct.id ? { ...p, image: uploadedImages.length > 0 ? uploadedImages[0] : p.image, images: uploadedImages, description: richDescription, destacado: true, visible: isVisible } : p);
            } else {
              return [...prev, { id: selectedProduct.id, name: selectedProduct.name, brand: selectedProduct.brand, price: selectedProduct.price, image: uploadedImages.length > 0 ? uploadedImages[0] : selectedProduct.image, images: uploadedImages, description: richDescription, destacado: true, visible: isVisible }];
            }
          });
        } else {
          setFeaturedProducts(prev => prev.filter(p => p.id !== selectedProduct.id));
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al guardar.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de red al intentar guardar.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ═══ Bulk Actions ═══
  const handleBulkAction = async (action, ids) => {
    const token = localStorage.getItem('gloss_admin_token');
    const actionLabel = { feature: 'destacar', unfeature: 'quitar de destacados', show: 'mostrar', hide: 'ocultar' }[action];
    showConfirm(
      `Acción en lote`,
      `¿Deseas ${actionLabel} ${ids.length} producto${ids.length > 1 ? 's' : ''}?`,
      async () => {
        for (const id of ids) {
          const prod = products.find(p => p.id === id);
          if (!prod) continue;
          const body = {
            codart: id, imagenes: prod.images || [],
            descripcionEnriquecida: prod.description || '',
            destacado: action === 'feature' ? true : action === 'unfeature' ? false : (prod.destacado || false),
            visible: action === 'show' ? true : action === 'hide' ? false : (prod.visible !== false),
          };
          try {
            await fetch('/api/admin/products/update', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify(body),
            });
          } catch (err) { console.error(err); }
        }
        loadProducts(searchQuery);
        loadFeaturedProducts();
      },
      'primary', `Sí, ${actionLabel}`
    );
  };

  // ═══ Categorías ═══
  const loadCategories = async () => {
    setIsCatLoading(true);
    const token = localStorage.getItem('gloss_admin_token');
    try {
      const res = await fetch('/api/admin/categories', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setCategories(data.categories || []); }
    } catch (err) { console.error('Error cargando categorías:', err); }
    finally { setIsCatLoading(false); }
  };

  const toggleCategoryVisibility = (categoria) => {
    setCategories(prev => prev.map(c => c.categoria === categoria ? { ...c, visible: !c.visible } : c));
  };

  const saveCategories = async () => {
    setIsCatSaving(true);
    setCatMessage({ type: '', text: '' });
    const token = localStorage.getItem('gloss_admin_token');
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ categories })
      });
      const data = await res.json();
      if (res.ok && data.success) setCatMessage({ type: 'success', text: 'Categorías actualizadas correctamente.' });
      else setCatMessage({ type: 'error', text: data.error || 'Error al guardar.' });
    } catch (err) { setCatMessage({ type: 'error', text: 'Error de red.' }); }
    finally { setIsCatSaving(false); }
  };

  // ═══ Sedes ═══
  const loadWarehouses = async () => {
    setIsWhLoading(true);
    const token = localStorage.getItem('gloss_admin_token');
    try {
      const res = await fetch('/api/admin/warehouses', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setWarehouses(data.warehouses || []); }
    } catch (err) { console.error('Error cargando sedes:', err); }
    finally { setIsWhLoading(false); }
  };

  const toggleWarehouseVisibility = (codalm) => {
    setWarehouses(prev => prev.map(w => w.codalm === codalm ? { ...w, visible: !w.visible } : w));
  };

  const saveWarehouses = async () => {
    setIsWhSaving(true);
    setWhMessage({ type: '', text: '' });
    const token = localStorage.getItem('gloss_admin_token');
    try {
      const res = await fetch('/api/admin/warehouses', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ warehouses })
      });
      const data = await res.json();
      if (res.ok && data.success) setWhMessage({ type: 'success', text: 'Sedes actualizadas correctamente.' });
      else setWhMessage({ type: 'error', text: data.error || 'Error al guardar.' });
    } catch (err) { setWhMessage({ type: 'error', text: 'Error de red.' }); }
    finally { setIsWhSaving(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('gloss_admin_token');
    localStorage.removeItem('gloss_admin_user');
    router.push('/admin/login');
  };

  // ═══ RENDER ═══
  const bc = BREADCRUMBS[activeSection] || BREADCRUMBS['dashboard'];

  return (
    <div className="admin-layout">
      {/* ── Sidebar ── */}
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={(section) => { setActiveSection(section); setIsMobileSidebarOpen(false); }}
        adminUser={adminUser}
        onLogout={handleLogout}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* ── Main Content ── */}
      <div className="admin-main">
        {/* Mobile Header */}
        <div className="admin-mobile-header">
          <button className="admin-hamburger" onClick={() => setIsMobileSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} color="var(--accent-start)" />
            <span style={{ fontFamily: 'var(--font-logo)', fontWeight: '600', letterSpacing: '0.12em', fontSize: '1rem' }}>GLOSS ADMIN</span>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="admin-breadcrumb">
          <span>Admin</span>
          {bc.path.map((crumb, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={12} className="admin-breadcrumb-sep" />
              <span className={i === bc.path.length - 1 ? 'admin-breadcrumb-current' : ''}>{crumb}</span>
            </React.Fragment>
          ))}
        </div>

        {/* Section Header */}
        <div className="admin-section-header" style={{ marginTop: '12px' }}>
          <h1 className="admin-section-title">{bc.title}</h1>
          <p className="admin-section-desc">{bc.desc}</p>
        </div>

        {/* Content Area */}
        <div className="admin-main-content">

          {/* ══════ DASHBOARD ══════ */}
          {activeSection === 'dashboard' && (
            <AdminDashboard
              products={products}
              featuredProducts={featuredProducts}
              warehouses={warehouses}
              onNavigate={setActiveSection}
              adminUser={adminUser}
            />
          )}

          {/* ══════ PRODUCTOS ══════ */}
          {activeSection === 'products' && (
            <div className="admin-products-layout">
              {/* Panel Izquierdo: Buscador + Lista */}
              <div className="admin-products-left">
                <div className="admin-card-full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={s.panelTitle}>Catálogo Base</h3>
                    <button onClick={() => loadProducts(searchQuery)} style={s.refreshBtn} title="Refrescar">
                      <RefreshCw size={16} />
                    </button>
                  </div>
                  <AdminProductSearch
                    products={products}
                    isLoading={isLoading}
                    onSearch={(q) => { setSearchQuery(q); loadProducts(q); }}
                    onSelectProduct={handleSelectProduct}
                    selectedProduct={selectedProduct}
                    onBulkAction={handleBulkAction}
                  />
                </div>
              </div>

              {/* Panel Derecho: Editor */}
              <div className="admin-products-right">
                {selectedProduct ? (
                  <div className="admin-card-full">
                    <h3 style={s.panelTitle}>Editar Producto</h3>
                    <p style={s.panelSub}>Personaliza fotos y detalles para la web.</p>

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

                    {/* Ficha del producto */}
                    <div style={s.sourceGrid}>
                      <div style={s.sourceItem}>
                        <span style={s.sourceLabel}>Código</span>
                        <span style={s.sourceVal}>{selectedProduct.id}</span>
                      </div>
                      <div style={s.sourceItem}>
                        <span style={s.sourceLabel}>Nombre</span>
                        <span style={s.sourceVal}>{selectedProduct.name}</span>
                      </div>
                      <div style={s.sourceItem}>
                        <span style={s.sourceLabel}>Marca / Stock</span>
                        <span style={s.sourceVal}>{selectedProduct.brand} | {selectedProduct.stock} und.</span>
                      </div>
                      <div style={s.sourceItem}>
                        <span style={s.sourceLabel}>Precio</span>
                        <span style={s.sourceVal}>S/ {selectedProduct.price}</span>
                      </div>
                    </div>

                    <form onSubmit={handleSave} style={s.editorForm}>
                      {/* Switches */}
                      <div style={s.switchRow}>
                        <div
                          style={{ ...s.switchCard, borderColor: isVisible ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)' }}
                          onClick={() => setIsVisible(!isVisible)}
                        >
                          {isVisible ? <Eye size={18} color="#22C55E" /> : <EyeOff size={18} color="#EF4444" />}
                          <div>
                            <div style={s.switchTitle}>{isVisible ? 'Visible' : 'Oculto'}</div>
                            <div style={s.switchDesc}>Los clientes {isVisible ? 'pueden' : 'NO pueden'} ver este producto</div>
                          </div>
                          <div style={{ ...s.toggleTrack, backgroundColor: isVisible ? '#22C55E' : '#D1D5DB' }}>
                            <div style={{ ...s.toggleThumb, transform: isVisible ? 'translateX(20px)' : 'translateX(2px)' }} />
                          </div>
                        </div>
                        <div
                          style={{ ...s.switchCard, borderColor: isTrending ? 'rgba(255,46,147,0.3)' : 'rgba(142,154,167,0.1)' }}
                          onClick={() => setIsTrending(!isTrending)}
                        >
                          <Star size={18} color={isTrending ? 'var(--accent-start)' : 'var(--text-secondary)'} fill={isTrending ? 'var(--accent-start)' : 'none'} />
                          <div>
                            <div style={s.switchTitle}>Destacado</div>
                            <div style={s.switchDesc}>Aparece en el carrusel principal</div>
                          </div>
                          <div style={{ ...s.toggleTrack, backgroundColor: isTrending ? 'var(--accent-start)' : '#D1D5DB' }}>
                            <div style={{ ...s.toggleThumb, transform: isTrending ? 'translateX(20px)' : 'translateX(2px)' }} />
                          </div>
                        </div>
                      </div>

                      {/* Upload Zone */}
                      <div style={s.uploadSection}>
                        <label style={s.label}>Imágenes</label>
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
                              <span style={s.dropText}>Subiendo...</span>
                            </div>
                          ) : (
                            <>
                              <ImagePlus size={28} color={isDragOver ? 'var(--accent-start)' : '#9CA3AF'} />
                              <span style={s.dropText}>{isDragOver ? 'Suelta aquí' : 'Arrastra o haz clic'}</span>
                              <span style={s.dropHint}>JPEG, PNG, WebP — máx. 3MB</span>
                            </>
                          )}
                          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple style={{ display: 'none' }} onChange={(e) => handleFileSelect(e.target.files)} />
                        </div>
                        {uploadedImages.length > 0 && (
                          <div style={s.imageGrid}>
                            {uploadedImages.map((imgSrc, idx) => (
                              <div key={idx} style={s.imageThumb}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imgSrc} alt={`Imagen ${idx + 1}`} style={s.imageThumbImg} />
                                <button type="button" style={s.removeImgBtn} onClick={() => handleRemoveImage(idx)}>
                                  <X size={12} color="#FFF" />
                                </button>
                                {idx === 0 && <span style={s.mainBadge}>Principal</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Descripción */}
                      <div style={s.inputGroup}>
                        <label style={s.label}>Descripción de Venta</label>
                        <textarea
                          placeholder="Beneficios, ingredientes, modo de uso..."
                          rows={4}
                          value={richDescription}
                          onChange={(e) => setRichDescription(e.target.value)}
                          style={s.textarea}
                        />
                      </div>

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
                  <div className="admin-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 140px)', color: '#9CA3AF' }}>
                    <Package size={48} color="#D1D5DB" />
                    <h4 style={{ marginTop: '16px', color: 'var(--text-primary)' }}>Selecciona un producto</h4>
                    <p style={{ fontSize: '0.85rem', textAlign: 'center', maxWidth: '280px', marginTop: '8px' }}>
                      Elige un artículo de la lista para editar sus imágenes, descripción y visibilidad.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════ DESTACADOS ══════ */}
          {activeSection === 'featured' && (
            <div style={{ maxWidth: '900px' }}>
              <div className="admin-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <p style={s.panelSub}>Productos del carrusel principal "Destacados" con badge "Top".</p>
                  </div>
                  <span style={s.countBadge}>{featuredProducts.length} productos</span>
                </div>

                {isFeatLoading ? (
                  <div style={s.centerState}>
                    <Loader2 size={32} color="var(--accent-start)" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={s.stateText}>Cargando...</p>
                  </div>
                ) : featuredProducts.length === 0 ? (
                  <div style={{ ...s.centerState, padding: '40px 0' }}>
                    <Star size={48} color="#D1D5DB" />
                    <p style={{ ...s.stateText, marginTop: '16px' }}>No tienes productos destacados.</p>
                    <p style={{ fontSize: '0.8rem', color: '#9CA3AF', maxWidth: '300px', textAlign: 'center', marginTop: '4px' }}>
                      Ve a "Productos", selecciona un artículo y activa "Producto Destacado".
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {featuredProducts.map((prod) => (
                      <div key={prod.id} style={s.featuredItem}>
                        <div style={s.featuredThumb}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={prod.image} alt={prod.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{prod.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span>{prod.id}</span>
                            <span>|</span>
                            <span>{prod.brand || 'Gloss'}</span>
                            <span>|</span>
                            <span>S/ {prod.price}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <button onClick={() => handleToggleVisibilityFeatured(prod)} style={s.featuredActionBtn} title={prod.visible !== false ? 'Ocultar' : 'Mostrar'}>
                            {prod.visible !== false ? <Eye size={15} color="#22C55E" /> : <EyeOff size={15} color="#EF4444" />}
                          </button>
                          <button
                            onClick={() => showConfirm('Quitar de Destacados', `¿Remover "${prod.name}" de la sección de destacados?`, () => handleRemoveFeatured(prod))}
                            style={s.featuredActionBtn}
                            title="Quitar de destacados"
                          >
                            <Trash2 size={15} color="#EF4444" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════ CATEGORÍAS ══════ */}
          {activeSection === 'categories' && (
            <div style={{ maxWidth: '700px' }}>
              <div className="admin-card">
                {catMessage.text && (
                  <div style={{
                    ...s.alert,
                    backgroundColor: catMessage.type === 'success' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                    borderColor: catMessage.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
                  }}>
                    {catMessage.type === 'success' ? <CheckCircle size={16} color="#22C55E" /> : <AlertCircle size={16} color="#EF4444" />}
                    <span style={{ fontSize: '0.82rem', fontWeight: '600', color: catMessage.type === 'success' ? '#22C55E' : '#EF4444' }}>{catMessage.text}</span>
                  </div>
                )}
                {isCatLoading ? (
                  <div style={s.centerState}><Loader2 size={32} color="var(--accent-start)" style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {categories.map((cat) => (
                      <div key={cat.categoria} style={{ ...s.listItem, opacity: cat.visible ? 1 : 0.5, borderColor: cat.visible ? 'rgba(34,197,94,0.2)' : 'rgba(142,154,167,0.1)' }}>
                        <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>{CATEGORY_ICONS[cat.categoria] || '📦'}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.92rem', fontWeight: '600', fontFamily: 'var(--font-title)' }}>{CATEGORY_LABELS[cat.categoria] || cat.categoria}</div>
                          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '1px' }}>{cat.visible ? '✅ Visible' : '🚫 Oculta'}</div>
                        </div>
                        <div style={{ ...s.toggleTrack, backgroundColor: cat.visible ? '#22C55E' : '#D1D5DB' }} onClick={() => toggleCategoryVisibility(cat.categoria)}>
                          <div style={{ ...s.toggleThumb, transform: cat.visible ? 'translateX(20px)' : 'translateX(2px)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={saveCategories} disabled={isCatSaving} style={s.saveFullBtn} className="soft-button">
                  {isCatSaving ? (<><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>) : (<><Save size={18} /> Guardar Categorías</>)}
                </button>
              </div>
            </div>
          )}

          {/* ══════ SEDES ══════ */}
          {activeSection === 'warehouses' && (
            <div style={{ maxWidth: '700px' }}>
              <div className="admin-card">
                {whMessage.text && (
                  <div style={{
                    ...s.alert,
                    backgroundColor: whMessage.type === 'success' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                    borderColor: whMessage.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
                  }}>
                    {whMessage.type === 'success' ? <CheckCircle size={16} color="#22C55E" /> : <AlertCircle size={16} color="#EF4444" />}
                    <span style={{ fontSize: '0.82rem', fontWeight: '600', color: whMessage.type === 'success' ? '#22C55E' : '#EF4444' }}>{whMessage.text}</span>
                  </div>
                )}
                {isWhLoading ? (
                  <div style={s.centerState}><Loader2 size={32} color="var(--accent-start)" style={{ animation: 'spin 1s linear infinite' }} /></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {warehouses.map((wh) => (
                      <div key={wh.codalm} style={{ ...s.listItem, opacity: wh.visible ? 1 : 0.5, borderColor: wh.visible ? 'rgba(34,197,94,0.2)' : 'rgba(142,154,167,0.1)' }}>
                        <div style={{ fontSize: '1.6rem', lineHeight: 1 }}>🏢</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.92rem', fontWeight: '600', fontFamily: 'var(--font-title)' }}>{wh.nomalm}</div>
                          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '1px' }}>Código: <strong>{wh.codalm}</strong> | {wh.visible ? '✅ Activa' : '🚫 Inactiva'}</div>
                        </div>
                        <div style={{ ...s.toggleTrack, backgroundColor: wh.visible ? '#22C55E' : '#D1D5DB' }} onClick={() => toggleWarehouseVisibility(wh.codalm)}>
                          <div style={{ ...s.toggleThumb, transform: wh.visible ? 'translateX(20px)' : 'translateX(2px)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={saveWarehouses} disabled={isWhSaving} style={s.saveFullBtn} className="soft-button">
                  {isWhSaving ? (<><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>) : (<><Save size={18} /> Guardar Sedes</>)}
                </button>
              </div>
            </div>
          )}

          {/* ══════ INTELLIGENCE SUB-SECTIONS ══════ */}
          {activeSection.startsWith('intel-') && (
            <IntelligenceTab activeSubSection={activeSection} />
          )}
        </div>
      </div>

      {/* ── Confirm Modal ── */}
      <AdminConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        isProcessing={confirmModal.isProcessing}
        onConfirm={executeConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// ═══ ESTILOS ═══
// ═══════════════════════════════════════════
const s = {
  panelTitle: { fontSize: '1rem', fontWeight: '700', fontFamily: 'var(--font-title)', letterSpacing: '0.02em', color: 'var(--text-primary)' },
  panelSub: { fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '12px', marginTop: '-4px' },
  refreshBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '6px', borderRadius: '8px', transition: 'all 0.2s' },

  // Alert
  alert: { display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid', padding: '10px 14px', borderRadius: '12px', marginBottom: '12px' },

  // Source grid
  sourceGrid: { backgroundColor: '#F8F9FA', borderRadius: '12px', padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' },
  sourceItem: { display: 'flex', flexDirection: 'column' },
  sourceLabel: { fontSize: '0.62rem', color: '#9CA3AF', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.04em' },
  sourceVal: { fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },

  // Editor
  editorForm: { display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto', paddingRight: '4px' },

  // Switches
  switchRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  switchCard: {
    flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 12px', borderRadius: '12px', border: '1px solid',
    cursor: 'pointer', transition: 'all 0.2s', backgroundColor: '#FAFAFA',
  },
  switchTitle: { fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' },
  switchDesc: { fontSize: '0.65rem', color: '#9CA3AF', marginTop: '1px' },
  toggleTrack: {
    width: '42px', height: '22px', borderRadius: '11px', marginLeft: 'auto',
    position: 'relative', transition: 'background-color 0.2s', flexShrink: 0, cursor: 'pointer',
  },
  toggleThumb: {
    width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#FFFFFF',
    position: 'absolute', top: '2px', transition: 'transform 0.2s',
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
  },

  // Upload
  uploadSection: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' },
  dropZone: {
    border: '2px dashed', borderRadius: '14px', padding: '22px 16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '6px', cursor: 'pointer', transition: 'all 0.2s',
  },
  dropText: { fontSize: '0.82rem', color: '#9CA3AF', fontWeight: '500', textAlign: 'center' },
  dropHint: { fontSize: '0.68rem', color: '#D1D5DB', fontWeight: '500' },
  uploadingState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' },
  imageGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '6px' },
  imageThumb: {
    position: 'relative', borderRadius: '10px', overflow: 'hidden', aspectRatio: '1',
    backgroundColor: '#F5F5F5', border: '1px solid rgba(142,154,167,0.1)',
  },
  imageThumbImg: { width: '100%', height: '100%', objectFit: 'cover' },
  removeImgBtn: {
    position: 'absolute', top: '3px', right: '3px', width: '20px', height: '20px',
    borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.9)', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  mainBadge: {
    position: 'absolute', bottom: '3px', left: '3px', backgroundColor: 'var(--accent-start)',
    color: '#FFF', fontSize: '0.5rem', fontWeight: '700', padding: '2px 5px',
    borderRadius: '5px', textTransform: 'uppercase',
  },

  // Textarea
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  textarea: {
    width: '100%', padding: '10px 12px', border: '1px solid rgba(142,154,167,0.12)',
    borderRadius: '12px', fontFamily: 'var(--font-body)', fontSize: '0.82rem',
    outline: 'none', resize: 'none', backgroundColor: '#FAFAFA',
  },

  // Save
  saveBtn: { width: '100%', height: '44px', marginTop: '6px', flexShrink: 0, fontSize: '0.85rem' },
  saveFullBtn: { width: '100%', height: '46px', fontSize: '0.85rem' },

  // States
  centerState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' },
  stateText: { fontSize: '0.85rem', color: '#9CA3AF' },

  // Featured item
  featuredItem: {
    display: 'flex', gap: '12px', padding: '12px', alignItems: 'center',
    borderRadius: '12px', border: '1px solid rgba(255,46,147,0.12)',
    backgroundColor: '#FAFAFA', transition: 'all 0.2s',
  },
  featuredThumb: {
    width: '44px', height: '44px', borderRadius: '10px', overflow: 'hidden',
    backgroundColor: '#FFF', border: '1px solid rgba(142,154,167,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featuredActionBtn: {
    background: 'none', border: 'none', cursor: 'pointer', padding: '8px',
    borderRadius: '8px', transition: 'background 0.2s', display: 'flex',
  },
  countBadge: {
    fontSize: '0.78rem', backgroundColor: 'var(--accent-soft, rgba(255,46,147,0.06))',
    color: 'var(--accent-start)', padding: '4px 12px', borderRadius: '20px', fontWeight: '600',
  },

  // List item (categories, warehouses)
  listItem: {
    display: 'flex', alignItems: 'center', gap: '14px', padding: '14px',
    borderRadius: '14px', border: '1px solid', transition: 'all 0.2s',
    backgroundColor: '#FAFAFA',
  },
};
