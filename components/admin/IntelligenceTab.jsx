'use client';

import React, { useState, useEffect } from 'react';
import { 
  Save, Trash2, Plus, RefreshCw, 
  HelpCircle, Tag, Shuffle, CheckCircle, AlertCircle, Loader2,
  ShieldAlert, Search, Package, Zap, Eye, Brain, Lightbulb, ChevronDown
} from 'lucide-react';
import AdminConfirmModal from './AdminConfirmModal';
import AdminTagProductsModal from './AdminTagProductsModal';

export default function IntelligenceTab({ activeSubSection }) {
  const [configs, setConfigs] = useState({ 
    LOW_STOCK_THRESHOLD: '5',
    CROSS_SELL_DAYS: '90',
    CROSS_SELL_MIN_ORDERS: '3',
    CROSS_SELL_LIMIT: '6'
  });
  const [shortcuts, setShortcuts] = useState([]);
  const [tags, setTags] = useState([]);
  const [crossSells, setCrossSells] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modal para ver productos asociados a las etiquetas
  const [tagProductsModal, setTagProductsModal] = useState({ isOpen: false, tag: null });

  // Estados para Auditoría de Categorías
  const [auditProducts, setAuditProducts] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilter, setAuditFilter] = useState('ALL'); // ALL, ALERT, CORRECT, UNASSIGNED
  const [openShortcutType, setOpenShortcutType] = useState(false);
  const [openAuditFilter, setOpenAuditFilter] = useState(false);

  // Estados para resultados de Procesos IA
  const [lastTagSummary, setLastTagSummary] = useState(null);
  const [lastCrossSellSummary, setLastCrossSellSummary] = useState(null);

  // Confirm Modal local
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    variant: 'danger',
    onConfirm: null
  });

  // Lógica de visualización colapsable de formularios
  const [showShortcutForm, setShowShortcutForm] = useState(false);
  const [showTagForm, setShowTagForm] = useState(false);
  const [showCrossSellForm, setShowCrossSellForm] = useState(false);

  // Inputs para atajos
  const [newShortcut, setNewShortcut] = useState({ texto: '', tipo: 'QUERY', enlace: '', orden: '0' });
  // Inputs para cross-sell
  const [newCrossSell, setNewCrossSell] = useState({ codart: '', productosStr: '' });
  // Inputs para tags
  const [newTag, setNewTag] = useState({ etiqueta: '', orden: '0', productosStr: '' });

  useEffect(() => {
    loadIntelData();
  }, []);

  const loadAuditData = async () => {
    setAuditLoading(true);
    try {
      const token = localStorage.getItem('gloss_admin_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const res = await fetch('/api/admin/intelligence?action=category-audit', { headers });
      if (res.ok) {
        const data = await res.json();
        setAuditProducts(data);
      }
    } catch (err) {
      console.error('[loadAuditData] Error:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubSection === 'intel-audit') {
      loadAuditData();
    }
  }, [activeSubSection]);

  const loadIntelData = async () => {
    setIsLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('gloss_admin_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Configs
      const cRes = await fetch('/api/admin/intelligence?action=configs', { headers });
      if (cRes.ok) {
        const cData = await cRes.json();
        const configMap = {};
        cData.forEach(c => { configMap[c.clave] = c.valor; });
        setConfigs(prev => ({ ...prev, ...configMap }));
      }

      // Shortcuts
      const sRes = await fetch('/api/admin/intelligence?action=shortcuts', { headers });
      if (sRes.ok) {
        const sData = await sRes.json();
        setShortcuts(sData);
      }

      // Tags
      const tRes = await fetch('/api/admin/intelligence?action=tags', { headers });
      if (tRes.ok) {
        const tData = await tRes.json();
        setTags(tData);
      }

      // Cross-sell
      const csRes = await fetch('/api/admin/intelligence?action=cross-sell', { headers });
      if (csRes.ok) {
        const csData = await csRes.json();
        setCrossSells(csData);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error al conectar con el servidor.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('gloss_admin_token');
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
      
      const keys = ['LOW_STOCK_THRESHOLD', 'CROSS_SELL_DAYS', 'CROSS_SELL_MIN_ORDERS', 'CROSS_SELL_LIMIT'];
      const requests = keys.map(key => 
        fetch('/api/admin/intelligence?action=configs', {
          method: 'POST',
          headers,
          body: JSON.stringify({ clave: key, valor: String(configs[key] || '') })
        })
      );
      
      const responses = await Promise.all(requests);
      const allOk = responses.every(res => res.ok);
      
      if (allOk) {
        setMessage({ type: 'success', text: 'Configuraciones del E-commerce guardadas con éxito.' });
      } else {
        setMessage({ type: 'error', text: 'Algunas configuraciones no pudieron ser guardadas.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Error de red al guardar las configuraciones.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddShortcut = async (e) => {
    e.preventDefault();
    if (!newShortcut.texto.trim()) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('gloss_admin_token');
      const res = await fetch('/api/admin/intelligence?action=shortcuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(newShortcut)
      });
      if (res.ok) {
        setNewShortcut({ texto: '', tipo: 'QUERY', enlace: '', orden: '0' });
        setShowShortcutForm(false);
        loadIntelData();
        setMessage({ type: 'success', text: 'Atajo rápido agregado correctamente.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de red.' });
    } finally {
      setIsSaving(false);
    }
  };

  const triggerConfirm = (title, message, variant, onConfirmCallback) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: 'Aceptar',
      variant,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isProcessing: true }));
        try {
          await onConfirmCallback();
        } finally {
          setConfirmModal({
            isOpen: false,
            title: '',
            message: '',
            confirmText: 'Confirmar',
            variant: 'danger',
            onConfirm: null,
            isProcessing: false
          });
        }
      }
    });
  };

  const handleDeleteShortcut = (id) => {
    triggerConfirm(
      '¿Eliminar este atajo?',
      'Se removerá la píldora de búsqueda sugerida del catálogo de forma permanente.',
      'danger',
      async () => {
        setIsSaving(true);
        try {
          const token = localStorage.getItem('gloss_admin_token');
          const res = await fetch(`/api/admin/intelligence?action=shortcuts&id=${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            loadIntelData();
            setMessage({ type: 'success', text: 'Atajo eliminado.' });
          }
        } catch (err) {
          setMessage({ type: 'error', text: 'Error al eliminar.' });
        } finally {
          setIsSaving(false);
        }
      }
    );
  };

  const handleAddCrossSell = async (e) => {
    e.preventDefault();
    if (!newCrossSell.codart.trim()) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('gloss_admin_token');
      const cleanProds = newCrossSell.productosStr
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
      
      const res = await fetch('/api/admin/intelligence?action=cross-sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ codart: newCrossSell.codart.trim(), productos: cleanProds })
      });
      if (res.ok) {
        setNewCrossSell({ codart: '', productosStr: '' });
        setShowCrossSellForm(false);
        loadIntelData();
        setMessage({ type: 'success', text: 'Venta cruzada manual registrada.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al registrar.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTag.etiqueta.trim()) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('gloss_admin_token');
      const cleanProds = newTag.productosStr
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      const res = await fetch('/api/admin/intelligence?action=tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          etiqueta: newTag.etiqueta.trim(),
          orden: parseInt(newTag.orden) || 0,
          productos: cleanProds
        })
      });
      if (res.ok) {
        setNewTag({ etiqueta: '', orden: '0', productosStr: '' });
        setShowTagForm(false);
        loadIntelData();
        setMessage({ type: 'success', text: 'Etiqueta de necesidad creada/actualizada.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al guardar etiqueta.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTag = (id) => {
    triggerConfirm(
      '¿Eliminar esta etiqueta?',
      'Esta acción removerá la etiqueta de necesidad y la asociación de productos del ERP de forma permanente.',
      'danger',
      async () => {
        setIsSaving(true);
        try {
          const token = localStorage.getItem('gloss_admin_token');
          const res = await fetch(`/api/admin/intelligence?action=tags&id=${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            loadIntelData();
            setMessage({ type: 'success', text: 'Etiqueta eliminada con éxito.' });
          }
        } catch (err) {
          setMessage({ type: 'error', text: 'Error de red.' });
        } finally {
          setIsSaving(false);
        }
      }
    );
  };

  const handleDeleteCrossSell = (codart) => {
    triggerConfirm(
      '¿Eliminar recomendación de venta cruzada?',
      'Esta acción removerá las recomendaciones de venta cruzada asociadas a este producto base de forma permanente.',
      'danger',
      async () => {
        setIsSaving(true);
        try {
          const token = localStorage.getItem('gloss_admin_token');
          const res = await fetch(`/api/admin/intelligence?action=cross-sell&id=${codart}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            loadIntelData();
            setMessage({ type: 'success', text: 'Recomendación de venta cruzada eliminada con éxito.' });
          }
        } catch (err) {
          setMessage({ type: 'error', text: 'Error de red.' });
        } finally {
          setIsSaving(false);
        }
      }
    );
  };

  const handleRunAutoTagging = () => {
    triggerConfirm(
      '¿Ejecutar Auto-Etiquetado?',
      'El motor inteligente analizará el detalle de productos en el ERP y creará las asociaciones de etiquetas automáticamente. Esto puede tomar unos segundos.',
      'primary',
      async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
          const token = localStorage.getItem('gloss_admin_token');
          const res = await fetch('/api/admin/intelligence?action=auto-tag', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            loadIntelData();
            setLastTagSummary(data.summary);
            setLastCrossSellSummary(null);
            setMessage({ 
              type: 'success', 
              text: `Auto-etiquetado completado. Resumen: ${data.summary.map(s => `${s.etiqueta} (${s.totalAsociados})`).join(', ')}` 
            });
          }
        } catch (err) {
          setMessage({ type: 'error', text: 'Error al procesar auto-etiquetado.' });
        } finally {
          setIsSaving(false);
        }
      }
    );
  };

  const handleRunAutoCrossSelling = () => {
    triggerConfirm(
      '¿Ejecutar Auto-Venta Cruzada?',
      'El motor inteligente analizará el historial de boletas y facturas de los últimos 180 días del ERP para calcular y generar las recomendaciones de venta cruzada automáticamente. Esto puede tomar unos segundos.',
      'primary',
      async () => {
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
          const token = localStorage.getItem('gloss_admin_token');
          const res = await fetch('/api/admin/intelligence?action=auto-cross-sell', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            loadIntelData();
            setLastCrossSellSummary({ totalProductosProcesados: data.totalProductosProcesados });
            setLastTagSummary(null);
            setMessage({ 
              type: 'success', 
              text: `Auto-venta cruzada completada. Se generaron sugerencias de venta cruzada automática para ${data.totalProductosProcesados} productos en base a su historial transaccional real del ERP.` 
            });
          }
        } catch (err) {
          setMessage({ type: 'error', text: 'Error al procesar auto-venta cruzada.' });
        } finally {
          setIsSaving(false);
        }
      }
    );
  };

  const renderConfig = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Cabecera del Panel */}
      <div style={styles.card} className="soft-card">
        <div style={styles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20} color="#475569" />
            <h3 style={styles.cardTitle}>Configuración del Motor de Inteligencia</h3>
          </div>
        </div>
        <p style={styles.cardSub}>
          Administra las reglas de negocio globales y los umbrales de procesamiento para el e-commerce de Tienda Gloss.
        </p>
      </div>

      {/* Formulario en Grilla */}
      <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          width: '100%'
        }}>
          {/* Configuración 1: Stock Crítico */}
          <div style={{ ...styles.card, padding: '20px' }} className="soft-card">
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: '0 0 4px 0' }}>Alerta de Stock Crítico</h4>
            <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '0 0 16px 0', lineHeight: '1.4' }}>
              Umbral mínimo de unidades bajo el cual se mostrará el banner de urgencia en la web para alertar al cliente.
            </p>
            <input 
              type="number"
              min="1"
              max="100"
              value={configs.LOW_STOCK_THRESHOLD || ''}
              onChange={(e) => setConfigs({ ...configs, LOW_STOCK_THRESHOLD: e.target.value })}
              style={{ ...styles.input, maxWidth: '140px' }}
              required
            />
          </div>

          {/* Configuración 2: Días Análisis Transaccional */}
          <div style={{ ...styles.card, padding: '20px' }} className="soft-card">
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: '0 0 4px 0' }}>Días Historial de Ventas (ERP)</h4>
            <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '0 0 16px 0', lineHeight: '1.4' }}>
              Días de antigüedad de facturas/boletas del ERP Navasoft para el cálculo automático de Venta Cruzada.
            </p>
            <input 
              type="number"
              min="30"
              max="720"
              value={configs.CROSS_SELL_DAYS || ''}
              onChange={(e) => setConfigs({ ...configs, CROSS_SELL_DAYS: e.target.value })}
              style={{ ...styles.input, maxWidth: '140px' }}
              required
            />
          </div>

          {/* Configuración 3: Coincidencia Mínima Boletas */}
          <div style={{ ...styles.card, padding: '20px' }} className="soft-card">
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: '0 0 4px 0' }}>Coincidencia Mínima en Ventas</h4>
            <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '0 0 16px 0', lineHeight: '1.4' }}>
              Número mínimo de pedidos distintos donde dos productos deben haberse comprado juntos para ser sugeridos.
            </p>
            <input 
              type="number"
              min="1"
              max="50"
              value={configs.CROSS_SELL_MIN_ORDERS || ''}
              onChange={(e) => setConfigs({ ...configs, CROSS_SELL_MIN_ORDERS: e.target.value })}
              style={{ ...styles.input, maxWidth: '140px' }}
              required
            />
          </div>

          {/* Configuración 4: Límite Recomendaciones */}
          <div style={{ ...styles.card, padding: '20px' }} className="soft-card">
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', margin: '0 0 4px 0' }}>Límite de Recomendaciones Web</h4>
            <p style={{ fontSize: '0.72rem', color: '#64748B', margin: '0 0 16px 0', lineHeight: '1.4' }}>
              Límite máximo de productos sugeridos a mostrar en el carrusel de recomendación en la ficha de detalle.
            </p>
            <input 
              type="number"
              min="1"
              max="20"
              value={configs.CROSS_SELL_LIMIT || ''}
              onChange={(e) => setConfigs({ ...configs, CROSS_SELL_LIMIT: e.target.value })}
              style={{ ...styles.input, maxWidth: '140px' }}
              required
            />
          </div>
        </div>

        {/* Botón Guardar */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '10px' }}>
          <button 
            type="submit" 
            disabled={isSaving} 
            style={{ 
              ...styles.saveBtn, 
              backgroundColor: '#1E293B', 
              color: '#FFFFFF',
              border: 'none',
              padding: '12px 24px',
              fontSize: '0.85rem',
              fontWeight: '600',
              height: 'auto',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer'
            }} 
            className="soft-button"
          >
            <Save size={16} /> Guardar Cambios de Configuración
          </button>
        </div>
      </form>
    </div>
  );

  const renderShortcuts = () => (
    <div style={styles.card} className="soft-card">
      <div style={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={18} color="#475569" />
          <h3 style={styles.cardTitle}>Atajos de Búsqueda Rápida</h3>
        </div>
        <button 
          onClick={() => setShowShortcutForm(!showShortcutForm)} 
          style={showShortcutForm ? styles.cancelFormBtn : styles.openFormBtn}
        >
          {showShortcutForm ? 'Cerrar Formulario' : '+ Configurar Atajo'}
        </button>
      </div>
      <p style={styles.cardSub}>Gestión de píldoras sugeridas para el modal de búsqueda rápida de cosméticos.</p>

      {showShortcutForm && (
        <div style={styles.formContainer}>
          <form onSubmit={handleAddShortcut} style={styles.shortcutForm}>
            <div style={styles.formGrid}>
              <div style={styles.inputWrapper}>
                <label style={styles.inputLabel}>Texto del atajo</label>
                <input 
                  type="text" 
                  placeholder="ej. Labiales Gloss" 
                  value={newShortcut.texto}
                  onChange={(e) => setNewShortcut({ ...newShortcut, texto: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={{ ...styles.inputWrapper, position: 'relative' }}>
                <label style={styles.inputLabel}>Tipo de Atajo</label>
                <button
                  type="button"
                  onClick={() => setOpenShortcutType(!openShortcutType)}
                  style={{
                    ...styles.input,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <span>
                    {newShortcut.tipo === 'QUERY' ? 'Consulta de Texto' :
                     newShortcut.tipo === 'BRAND' ? 'Marca Directa' :
                     'Categoría Directa'}
                  </span>
                  <ChevronDown size={14} color="#64748B" style={{ transform: openShortcutType ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                </button>
                
                {openShortcutType && (
                  <>
                    <div onClick={() => setOpenShortcutType(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
                    <div style={{
                      position: 'absolute',
                      top: '72px',
                      left: 0,
                      right: 0,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(142,154,167,0.18)',
                      borderRadius: '8px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                      zIndex: 1000,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {[
                        { value: 'QUERY', label: 'Consulta de Texto' },
                        { value: 'BRAND', label: 'Marca Directa' },
                        { value: 'CATEGORY', label: 'Categoría Directa' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setNewShortcut({ ...newShortcut, tipo: opt.value });
                            setOpenShortcutType(false);
                          }}
                          style={{
                            padding: '10px 14px',
                            fontSize: '0.82rem',
                            textAlign: 'left',
                            border: 'none',
                            backgroundColor: newShortcut.tipo === opt.value ? '#F1F5F9' : 'transparent',
                            color: newShortcut.tipo === opt.value ? '#1E293B' : '#475569',
                            cursor: 'pointer',
                            fontWeight: newShortcut.tipo === opt.value ? '600' : 'normal',
                            transition: 'all 0.1s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (newShortcut.tipo !== opt.value) {
                              e.currentTarget.style.backgroundColor = '#F8FAFC';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (newShortcut.tipo !== opt.value) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.inputLabel}>Enlace del atajo (opcional)</label>
                <input 
                  type="text" 
                  placeholder="ej: ?brand=Meybelline" 
                  value={newShortcut.enlace}
                  onChange={(e) => setNewShortcut({ ...newShortcut, enlace: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.inputLabel}>Orden de Visualización</label>
                <input 
                  type="number" 
                  placeholder="ej: 0" 
                  value={newShortcut.orden}
                  onChange={(e) => setNewShortcut({ ...newShortcut, orden: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="submit" disabled={isSaving} style={styles.addBtn} className="soft-button">
                <Plus size={14} /> Registrar Atajo
              </button>
              <button type="button" onClick={() => setShowShortcutForm(false)} style={styles.secondaryBtn} className="soft-button">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ ...styles.tableList, maxHeight: '550px' }}>
        {shortcuts.map((sh) => (
          <div key={sh.id} style={styles.listItem}>
            <div>
              <strong style={{ fontSize: '0.85rem' }}>{sh.texto}</strong>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                Tipo: {sh.tipo} | Orden: {sh.orden} | Enlace: {sh.enlace || 'No requiere'}
              </div>
            </div>
            <button onClick={() => handleDeleteShortcut(sh.id)} style={styles.deleteBtn}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTags = () => (
    <div style={styles.card} className="soft-card">
      <div style={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={18} color="var(--accent-start)" />
          <h3 style={styles.cardTitle}>Etiquetas de Necesidad (Filtros)</h3>
        </div>
        <button 
          onClick={() => setShowTagForm(!showTagForm)} 
          style={showTagForm ? styles.cancelFormBtn : styles.openFormBtn}
        >
          {showTagForm ? 'Cerrar Formulario' : '+ Configurar Filtro'}
        </button>
      </div>
      <p style={styles.cardSub}>Organiza filtros de belleza (#AntiFrizz, #ControlCaida) asociando códigos de productos del ERP.</p>

      {showTagForm && (
        <div style={styles.formContainer}>
          <form onSubmit={handleAddTag} style={styles.shortcutForm}>
            <div style={styles.formGrid}>
              <div style={styles.inputWrapper}>
                <label style={styles.inputLabel}>Etiqueta de belleza</label>
                <input 
                  type="text" 
                  placeholder="ej. #ControlCaida" 
                  value={newTag.etiqueta}
                  onChange={(e) => setNewTag({ ...newTag, etiqueta: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputWrapper}>
                <label style={styles.inputLabel}>Orden de Visualización</label>
                <input 
                  type="number" 
                  placeholder="ej: 0" 
                  value={newTag.orden}
                  onChange={(e) => setNewTag({ ...newTag, orden: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={{ ...styles.inputWrapper, gridColumn: 'span 2' }}>
                <label style={styles.inputLabel}>Códigos del ERP asociados</label>
                <textarea 
                  placeholder="Códigos del ERP separados por comas (ej. 0101.00245, 0102.00142)" 
                  value={newTag.productosStr}
                  onChange={(e) => setNewTag({ ...newTag, productosStr: e.target.value })}
                  style={{ ...styles.input, minHeight: '80px', padding: '10px 12px', resize: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="submit" disabled={isSaving} style={styles.addBtn} className="soft-button">
                <Plus size={14} /> Registrar Filtro
              </button>
              <button type="button" onClick={() => setShowTagForm(false)} style={styles.secondaryBtn} className="soft-button">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ ...styles.tableList, maxHeight: '550px' }}>
        {tags.map((tg) => (
          <div key={tg.id} style={styles.listItem}>
            <div>
              <strong style={{ fontSize: '0.85rem', color: 'var(--accent-start)' }}>{tg.etiqueta}</strong>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                {tg.productos.length} producto{tg.productos.length !== 1 ? 's' : ''} asociado{tg.productos.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => setTagProductsModal({ isOpen: true, tag: tg })} 
                style={{
                  ...styles.deleteBtn,
                  color: 'var(--accent-start)',
                  backgroundColor: 'rgba(255, 46, 147, 0.05)',
                  borderColor: 'rgba(255, 46, 147, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid transparent',
                  cursor: 'pointer'
                }}
                title="Ver Productos Asociados"
              >
                <Eye size={12} />
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Ver Lista</span>
              </button>
              <button onClick={() => handleDeleteTag(tg.id)} style={styles.deleteBtn} title="Eliminar Etiqueta">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCrossSell = () => (
    <div style={styles.card} className="soft-card">
      <div style={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shuffle size={18} color="var(--accent-start)" />
          <h3 style={styles.cardTitle}>Venta Cruzada</h3>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button"
            onClick={handleRunAutoCrossSelling}
            style={{
              ...styles.openFormBtn,
              backgroundColor: 'rgba(139, 92, 246, 0.08)',
              color: '#8B5CF6',
              borderColor: 'rgba(139, 92, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.08)';
            }}
          >
            <RefreshCw size={14} /> Auto-Venta Cruzada (ERP)
          </button>
          <button 
            onClick={() => setShowCrossSellForm(!showCrossSellForm)} 
            style={showCrossSellForm ? styles.cancelFormBtn : styles.openFormBtn}
          >
            {showCrossSellForm ? 'Cerrar Formulario' : '+ Configurar Venta'}
          </button>
        </div>
      </div>
      <p style={styles.cardSub}>Configura qué productos sugerir al cliente en el carrusel de la ficha de detalle.</p>

      {showCrossSellForm && (
        <div style={styles.formContainer}>
          <form onSubmit={handleAddCrossSell} style={styles.shortcutForm}>
            <div style={styles.formGrid}>
              <div style={styles.inputWrapper}>
                <label style={styles.inputLabel}>Código Producto Base (ERP)</label>
                <input 
                  type="text" 
                  placeholder="ej. 0505.010369" 
                  value={newCrossSell.codart}
                  onChange={(e) => setNewCrossSell({ ...newCrossSell, codart: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>
              <div style={{ ...styles.inputWrapper, gridColumn: 'span 2' }}>
                <label style={styles.inputLabel}>Códigos Recomendados asociados</label>
                <textarea 
                  placeholder="Códigos recomendados separados por comas (ej: 0505.010002, 0502.000105)" 
                  value={newCrossSell.productosStr}
                  onChange={(e) => setNewCrossSell({ ...newCrossSell, productosStr: e.target.value })}
                  style={{ ...styles.input, minHeight: '80px', padding: '10px 12px', resize: 'none' }}
                  required
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button type="submit" disabled={isSaving} style={styles.addBtn} className="soft-button">
                <Plus size={14} /> Guardar Venta Cruzada
              </button>
              <button type="button" onClick={() => setShowCrossSellForm(false)} style={styles.secondaryBtn} className="soft-button">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ ...styles.tableList, maxHeight: '550px' }}>
        {crossSells
          .filter(cs => cs.codart && cs.codart.trim() !== '')
          .map((cs) => (
            <div key={cs.codart} style={styles.listItem}>
              <div>
                <strong style={{ fontSize: '0.85rem' }}>Base: {cs.codart}</strong>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                  Recomendados: {cs.productos}
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => handleDeleteCrossSell(cs.codart)} 
                style={styles.deleteBtn}
                title="Eliminar recomendación"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
      </div>
    </div>
  );

  const filteredAudit = React.useMemo(() => {
    return auditProducts.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(auditSearch.toLowerCase()) || 
                          p.id.toLowerCase().includes(auditSearch.toLowerCase()) ||
                          (p.userCode && p.userCode.toLowerCase().includes(auditSearch.toLowerCase()));
      
      const matchFilter = auditFilter === 'ALL' || 
                          (auditFilter === 'ALERT' && (p.status === 'INCONSISTENT' || p.status === 'UNASSIGNED')) ||
                          p.status === auditFilter;
      
      return matchSearch && matchFilter;
    });
  }, [auditProducts, auditSearch, auditFilter]);

  const auditStats = React.useMemo(() => {
    const stats = { total: 0, inconsistent: 0, unassigned: 0, correct: 0 };
    auditProducts.forEach(p => {
      stats.total++;
      if (p.status === 'INCONSISTENT') stats.inconsistent++;
      else if (p.status === 'UNASSIGNED') stats.unassigned++;
      else if (p.status === 'CORRECT') stats.correct++;
    });
    return stats;
  }, [auditProducts]);

  const renderCategoryAudit = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Cabecera & Controles de Auditoría */}
      <div style={styles.card} className="soft-card">
        <div style={styles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} color="var(--accent-start)" />
            <h3 style={styles.cardTitle}>Auditoría de Categorías e Inconsistencias</h3>
          </div>
          <button 
            onClick={loadAuditData} 
            disabled={auditLoading}
            style={{
              ...styles.openFormBtn,
              backgroundColor: 'rgba(255, 46, 147, 0.05)',
              color: 'var(--accent-start)',
              borderColor: 'rgba(255, 46, 147, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 46, 147, 0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 46, 147, 0.05)'; }}
          >
            <RefreshCw size={14} style={{ animation: auditLoading ? 'spin 1s linear infinite' : 'none' }} /> 
            {auditLoading ? 'Analizando ERP...' : 'Refrescar Auditoría'}
          </button>
        </div>
        <p style={styles.cardSub}>
          Esta herramienta analiza de forma pasiva el catálogo de productos del ERP local (Navasoft) buscando discrepancias lógicas de clasificación (ej: un shampoo clasificado en la categoría "Rostro"). Corrige la subfamilia en tu ERP para resolver las alertas.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        width: '100%'
      }}>
        {/* KPI 1: Total */}
        <div style={{ ...styles.card, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }} className="soft-card">
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(59, 130, 246, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', flexShrink: 0 }}>
            <Package size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Productos ERP</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{auditStats.total}</span>
          </div>
        </div>
        
        {/* KPI 2: Inconsistentes */}
        <div style={{ ...styles.card, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }} className="soft-card">
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444', flexShrink: 0 }}>
            <ShieldAlert size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inconsistentes</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>{auditStats.inconsistent}</span>
          </div>
        </div>

        {/* KPI 3: Sin Categoría */}
        <div style={{ ...styles.card, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }} className="soft-card">
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(245, 158, 11, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B', flexShrink: 0 }}>
            <HelpCircle size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoría Genérica</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F59E0B', lineHeight: 1 }}>{auditStats.unassigned}</span>
          </div>
        </div>

        {/* KPI 4: Correctos */}
        <div style={{ ...styles.card, padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }} className="soft-card">
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', flexShrink: 0 }}>
            <CheckCircle size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Correctos</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10B981', lineHeight: 1 }}>{auditStats.correct}</span>
          </div>
        </div>
      </div>

      {/* Filtros e Inputs de Búsqueda */}
      <div style={{
        ...styles.card,
        padding: '14px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'space-between'
      }} className="soft-card">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: '#94A3B8' }} />
          <input 
            type="text"
            placeholder="Buscar por ID de producto o nombre..."
            value={auditSearch}
            onChange={(e) => setAuditSearch(e.target.value)}
            style={{
              ...styles.input,
              paddingLeft: '38px',
              margin: 0,
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Filtro de Estado:</span>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setOpenAuditFilter(!openAuditFilter)}
              style={{
                ...styles.input,
                margin: 0,
                width: '180px',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                padding: '0 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: '#FFFFFF',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span>
                {auditFilter === 'ALL' ? 'Todos los Productos' :
                 auditFilter === 'ALERT' ? 'Solo Alertas (Todas)' :
                 auditFilter === 'INCONSISTENT' ? 'Solo Inconsistentes' :
                 auditFilter === 'UNASSIGNED' ? 'Categoría Genérica' :
                 'Solo Correctos'}
              </span>
              <ChevronDown size={14} color="#64748B" style={{ transform: openAuditFilter ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>
            
            {openAuditFilter && (
              <>
                <div onClick={() => setOpenAuditFilter(false)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
                <div style={{
                  position: 'absolute',
                  top: '42px',
                  right: 0,
                  width: '180px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(142,154,167,0.18)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                  zIndex: 1000,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {[
                    { value: 'ALL', label: 'Todos los Productos' },
                    { value: 'ALERT', label: 'Solo Alertas (Todas)' },
                    { value: 'INCONSISTENT', label: 'Solo Inconsistentes' },
                    { value: 'UNASSIGNED', label: 'Categoría Genérica' },
                    { value: 'CORRECT', label: 'Solo Correctos' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setAuditFilter(opt.value);
                        setOpenAuditFilter(false);
                      }}
                      style={{
                        padding: '10px 14px',
                        fontSize: '0.78rem',
                        textAlign: 'left',
                        border: 'none',
                        backgroundColor: auditFilter === opt.value ? '#F1F5F9' : 'transparent',
                        color: auditFilter === opt.value ? '#1E293B' : '#475569',
                        cursor: 'pointer',
                        fontWeight: auditFilter === opt.value ? '600' : 'normal',
                        transition: 'all 0.1s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (auditFilter !== opt.value) {
                          e.currentTarget.style.backgroundColor = '#F8FAFC';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (auditFilter !== opt.value) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Auditoría */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
        {auditLoading ? (
          <div style={{ ...styles.card, padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }} className="soft-card">
            <Loader2 size={32} color="var(--accent-start)" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Analizando consistencia del catálogo en el ERP local...</span>
          </div>
        ) : filteredAudit.length === 0 ? (
          <div style={{ ...styles.card, padding: '50px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', textAlign: 'center' }} className="soft-card">
            <CheckCircle size={36} color="#10B981" />
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', margin: 0 }}>¡Todo Correcto!</h4>
            <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0, maxWidth: '300px' }}>
              No se encontraron discrepancias con los filtros y la búsqueda aplicados.
            </p>
          </div>
        ) : (
          filteredAudit.map(p => (
            <div 
              key={p.id}
              style={{
                ...styles.card,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                transition: 'all 0.15s ease'
              }}
              className="soft-card"
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Imagen */}
              {p.image ? (
                <img src={p.image} alt={p.name} style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #F1F5F9' }} />
              ) : (
                <div style={{ width: '42px', height: '42px', borderRadius: '8px', backgroundColor: 'rgba(255, 46, 147, 0.03)', border: '1px dashed rgba(255, 46, 147, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-start)' }}>
                  <Package size={16} />
                </div>
              )}

              {/* Detalles */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.68rem', color: '#64748B' }}>
                  <span>ID: {p.id}</span>
                  <div style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
                  <span>ERP: <strong style={{ color: '#475569' }}>{p.categoryName}</strong></span>
                </div>
              </div>

              {/* Explicación / Alerta IA */}
              <div style={{ flex: 1.2, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {p.status !== 'CORRECT' ? (
                  <>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 600, 
                      color: p.status === 'INCONSISTENT' ? '#C5221F' : '#B06000',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {p.status === 'INCONSISTENT' ? (
                        <>
                          <AlertCircle size={12} color="#C5221F" />
                          <span>Anomalía Detectada:</span>
                        </>
                      ) : (
                        <>
                          <HelpCircle size={12} color="#B06000" />
                          <span>Categoría Genérica:</span>
                        </>
                      )}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#475569', lineHeight: '1.3' }}>
                      {p.alertMessage}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#137333', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} color="#10B981" /> Categorización Óptima
                  </span>
                )}
              </div>

              {/* Propuesta IA */}
              <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '3px', flexShrink: 0 }}>
                {p.status !== 'CORRECT' && p.suggestedCategory && (
                  <>
                    <span style={{ 
                      fontSize: '0.65rem', 
                      fontWeight: 600, 
                      color: '#1E3A8A',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Lightbulb size={12} color="#1E3A8A" />
                      <span>Sugerencia Web:</span>
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#1E3A8A', fontWeight: 600, backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '6px', border: '1px solid #DBEAFE', display: 'inline-block', width: 'fit-content' }}>
                      {p.suggestedCategory} &gt; {p.suggestedSubcategory}
                    </span>
                  </>
                )}
              </div>

              {/* Estado */}
              <div style={{ flexShrink: 0 }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  backgroundColor: p.status === 'INCONSISTENT' 
                    ? '#FCE8E6' 
                    : p.status === 'UNASSIGNED' 
                    ? '#FEF3C7' 
                    : '#E6F4EA',
                  color: p.status === 'INCONSISTENT' 
                    ? '#C5221F' 
                    : p.status === 'UNASSIGNED' 
                    ? '#D97706' 
                    : '#137333',
                }}>
                  {p.status === 'INCONSISTENT' 
                    ? 'Inconsistente' 
                    : p.status === 'UNASSIGNED' 
                    ? 'Sin Categoría' 
                    : 'Correcto'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderAutoTag = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Cabecera de Procesos */}
      <div style={styles.card} className="soft-card">
        <div style={styles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={20} color="#475569" />
            <h3 style={styles.cardTitle}>Automatizaciones e Inteligencia (IA)</h3>
          </div>
        </div>
        <p style={styles.cardSub}>
          Gatilla los motores analíticos de sincronización del ERP. Procesan grandes volúmenes de datos del ERP local y de transacciones reales para actualizar de forma automatizada las clasificaciones y recomendaciones en la nube.
        </p>
      </div>

      {/* Grilla de Acciones */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        width: '100%'
      }}>
        {/* Tarjeta 1: Auto-Etiquetado */}
        <div style={styles.card} className="soft-card">
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={18} color="#475569" />
              <h3 style={{ ...styles.cardTitle, fontSize: '0.95rem' }}>Auto-Etiquetado de Productos</h3>
            </div>
          </div>
          <p style={{ ...styles.cardSub, minHeight: '60px' }}>
            Escanea descripciones de productos en la base de datos del ERP para clasificarlos automáticamente con etiquetas de belleza (#AntiFrizz, #ControlCaida, #UñasFuertes).
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <button 
              onClick={handleRunAutoTagging} 
              style={{ 
                ...styles.autoTagBtn, 
                width: '100%', 
                backgroundColor: '#1E293B', 
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: '600'
              }} 
              className="soft-button"
              disabled={isSaving}
            >
              <RefreshCw size={14} /> Ejecutar Análisis de Etiquetas
            </button>
            <span style={{ fontSize: '0.68rem', color: '#94A3B8', textAlign: 'center' }}>
              Empareja por palabras clave en observaciones del ERP.
            </span>
          </div>
        </div>

        {/* Tarjeta 2: Auto-Venta Cruzada */}
        <div style={styles.card} className="soft-card">
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shuffle size={18} color="#475569" />
              <h3 style={{ ...styles.cardTitle, fontSize: '0.95rem' }}>Auto-Venta Cruzada Transaccional</h3>
            </div>
          </div>
          <p style={{ ...styles.cardSub, minHeight: '60px' }}>
            Analiza el historial de ventas (boletas y facturas) de los últimos 180 días del ERP para calcular qué productos se compran juntos con frecuencia y crear recomendaciones de venta cruzada reales.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <button 
              onClick={handleRunAutoCrossSelling} 
              style={{ 
                ...styles.autoTagBtn, 
                width: '100%', 
                backgroundColor: '#1E293B', 
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }} 
              className="soft-button"
              disabled={isSaving}
            >
              <RefreshCw size={14} /> Ejecutar Análisis de Ventas (ERP)
            </button>
            <span style={{ fontSize: '0.68rem', color: '#94A3B8', textAlign: 'center' }}>
              Genera recomendaciones basadas en datos reales de facturación.
            </span>
          </div>
        </div>
      </div>

      {/* 📊 Resultados del Auto-Etiquetado */}
      {lastTagSummary && (
        <div style={styles.card} className="soft-card">
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} color="#10B981" />
              <h3 style={styles.cardTitle}>Resultados del Auto-Etiquetado</h3>
            </div>
          </div>
          <p style={styles.cardSub}>El motor analizó todo tu catálogo e indexó con éxito las siguientes etiquetas de belleza:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '10px' }}>
            {lastTagSummary.map((s, idx) => {
              // Buscar el tag completo en la lista de tags para poder pasarle el objeto completo a Ver Lista
              const fullTag = tags.find(t => t.etiqueta === s.etiqueta) || { etiqueta: s.etiqueta, productos: [] };
              return (
                <div key={idx} style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid #F1F5F9', backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--accent-start)' }}>{s.etiqueta}</strong>
                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{s.totalAsociados} productos</span>
                  <button 
                    onClick={() => {
                      // Construir el objeto tag compatible
                      const mockTagForModal = {
                        etiqueta: s.etiqueta,
                        // Si no lo encuentra en la base de datos (por retraso de refresco),
                        // al menos intentamos simular un array de códigos vacíos o podemos buscar los códigos después
                        productos: fullTag.productos.length > 0 ? fullTag.productos : []
                      };
                      setTagProductsModal({ isOpen: true, tag: mockTagForModal });
                    }}
                    style={{
                      marginTop: '4px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'rgba(255, 46, 147, 0.05)',
                      color: 'var(--accent-start)',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: 'fit-content'
                    }}
                  >
                    Ver Productos
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 📊 Resultados del Auto-Cross Selling */}
      {lastCrossSellSummary && (
        <div style={styles.card} className="soft-card">
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle size={18} color="#10B981" />
              <h3 style={styles.cardTitle}>Resultados de la Venta Cruzada</h3>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981', flexShrink: 0 }}>
              <Shuffle size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <strong style={{ fontSize: '0.88rem', color: '#1E293B' }}>Sincronización Exitosa</strong>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
                Se generaron sugerencias de venta cruzada para <strong style={{ color: 'var(--accent-start)' }}>{lastCrossSellSummary.totalProductosProcesados} productos</strong> en base al historial de ventas de boletas y facturas reales del ERP en los últimos 90 días.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ ...styles.tabContainer, backgroundColor: activeSubSection ? 'transparent' : '#F8F9FA', padding: activeSubSection ? '0' : '24px' }}>
      {/* Mensaje global */}
      {message.text && (
        <div style={{
          ...styles.alert,
          backgroundColor: message.type === 'success' ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          borderColor: message.type === 'success' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
        }}>
          {message.type === 'success' ? <CheckCircle size={18} color="#22C55E" /> : <AlertCircle size={18} color="#EF4444" />}
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: message.type === 'success' ? '#22C55E' : '#EF4444' }}>
            {message.text}
          </span>
        </div>
      )}

      {isLoading ? (
        <div style={styles.centerState}>
          <Loader2 size={32} color="var(--accent-start)" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px', fontSize: '0.88rem', color: '#94A3B8' }}>Cargando panel...</p>
        </div>
      ) : (
        activeSubSection ? (
          <div style={{ width: '100%' }}>
            {activeSubSection === 'intel-config' && renderConfig()}
            {activeSubSection === 'intel-shortcuts' && renderShortcuts()}
            {activeSubSection === 'intel-tags' && renderTags()}
            {activeSubSection === 'intel-crosssell' && renderCrossSell()}
            {activeSubSection === 'intel-audit' && renderCategoryAudit()}
            {activeSubSection === 'intel-autotag' && renderAutoTag()}
          </div>
        ) : (
          <div style={styles.grid}>
            {/* Columna Izquierda: Configs y Shortcuts */}
            <div style={styles.col}>
              {renderConfig()}
              {renderShortcuts()}
            </div>

            {/* Columna Derecha: Tags & Cross-sells */}
            <div style={styles.col}>
              {renderTags()}
              {renderCrossSell()}
            </div>
          </div>
        )
      )}

      {/* ── Confirm Modal ── */}
      <AdminConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        isProcessing={confirmModal.isProcessing}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* ── Modal de Productos Asociados a Etiquetas ── */}
      <AdminTagProductsModal
        isOpen={tagProductsModal.isOpen}
        tag={tagProductsModal.tag}
        onClose={() => setTagProductsModal({ isOpen: false, tag: null })}
      />
    </div>
  );
}

const styles = {
  tabContainer: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    flex: 1,
    fontFamily: 'var(--font-body)'
  },
  alert: {
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '24px',
  },
  col: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '20px',
    border: '1px solid rgba(142,154,167,0.06)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    marginBottom: '8px'
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#1E293B',
    margin: 0
  },
  cardSub: {
    fontSize: '0.8rem',
    color: '#64748B',
    marginBottom: '16px',
    lineHeight: '1.4'
  },
  formRow: {
    display: 'flex',
    gap: '12px'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    height: '42px',
    padding: '0 12px',
    borderRadius: '8px',
    border: '1px solid rgba(142,154,167,0.18)',
    fontSize: '0.85rem',
    outline: 'none',
    backgroundColor: '#FAFBFD',
    fontFamily: 'var(--font-body)',
  },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    height: '42px',
    padding: '0 12px',
    paddingRight: '36px',
    borderRadius: '8px',
    border: '1px solid rgba(142,154,167,0.18)',
    fontSize: '0.85rem',
    outline: 'none',
    backgroundColor: '#FAFBFD',
    fontFamily: 'var(--font-body)',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '16px',
    cursor: 'pointer'
  },
  saveBtn: {
    height: '40px',
    padding: '0 20px',
    fontSize: '0.85rem',
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  shortcutForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px'
  },
  addBtn: {
    height: '40px',
    backgroundColor: 'var(--accent-start)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  autoTagBtn: {
    width: '100%',
    height: '40px',
    backgroundColor: '#F1F5F9',
    border: '1px solid #E2E8F0',
    color: '#475569',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  tableList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '260px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#F8FAFC',
    border: '1px solid #F1F5F9',
    borderRadius: '10px'
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#EF4444',
    cursor: 'pointer',
    padding: '4px'
  },
  centerState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 0'
  },
  openFormBtn: {
    height: '32px',
    padding: '0 12px',
    fontSize: '0.78rem',
    fontWeight: '600',
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    border: '1px solid rgba(37,99,235,0.15)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.2s',
  },
  cancelFormBtn: {
    height: '32px',
    padding: '0 12px',
    fontSize: '0.78rem',
    fontWeight: '600',
    backgroundColor: '#FEF2F2',
    color: '#EF4444',
    border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'all 0.2s',
  },
  formContainer: {
    backgroundColor: '#FAFAFA',
    border: '1px solid rgba(142,154,167,0.08)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
    maxWidth: '680px',
    width: '100%',
  },
  inputWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  inputLabel: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'left',
  },
  secondaryBtn: {
    height: '40px',
    padding: '0 16px',
    fontSize: '0.85rem',
    fontWeight: '500',
    backgroundColor: '#FFFFFF',
    color: '#475569',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
  }
};
