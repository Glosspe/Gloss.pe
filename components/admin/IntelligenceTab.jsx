'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Save, Trash2, Plus, RefreshCw, 
  HelpCircle, Tag, Shuffle, CheckCircle, AlertCircle, Loader2 
} from 'lucide-react';
import AdminConfirmModal from './AdminConfirmModal';
import AdminTagProductsModal from './AdminTagProductsModal';

export default function IntelligenceTab({ activeSubSection }) {
  const [configs, setConfigs] = useState({ LOW_STOCK_THRESHOLD: '5' });
  const [shortcuts, setShortcuts] = useState([]);
  const [tags, setTags] = useState([]);
  const [crossSells, setCrossSells] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modal para ver productos asociados a las etiquetas
  const [tagProductsModal, setTagProductsModal] = useState({ isOpen: false, tag: null });

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
      const res = await fetch('/api/admin/intelligence?action=configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ clave: 'LOW_STOCK_THRESHOLD', valor: configs.LOW_STOCK_THRESHOLD })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Configuración de Stock Crítico guardada con éxito.' });
      } else {
        setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de red.' });
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

  const renderConfig = () => (
    <div style={styles.card} className="soft-card">
      <div style={styles.cardHeader}>
        <HelpCircle size={20} color="var(--accent-start)" />
        <h3 style={styles.cardTitle}>Alerta de Stock Crítico</h3>
      </div>
      <p style={styles.cardSub}>Configura el umbral mínimo bajo el cual se mostrará el banner de urgencia al cliente.</p>
      
      <form onSubmit={handleSaveConfig} style={styles.formRow}>
        <input 
          type="number"
          min="1"
          max="100"
          value={configs.LOW_STOCK_THRESHOLD}
          onChange={(e) => setConfigs({ ...configs, LOW_STOCK_THRESHOLD: e.target.value })}
          style={styles.input}
          required
        />
        <button type="submit" disabled={isSaving} style={styles.saveBtn} className="soft-button">
          <Save size={16} /> Guardar
        </button>
      </form>
    </div>
  );

  const renderShortcuts = () => (
    <div style={styles.card} className="soft-card">
      <div style={styles.cardHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="var(--accent-start)" />
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
              <div style={styles.inputWrapper}>
                <label style={styles.inputLabel}>Tipo de Atajo</label>
                <select 
                  value={newShortcut.tipo} 
                  onChange={(e) => setNewShortcut({ ...newShortcut, tipo: e.target.value })}
                  style={styles.select}
                >
                  <option value="QUERY">Consulta de Texto</option>
                  <option value="BRAND">Marca Directa</option>
                  <option value="CATEGORY">Categoría Directa</option>
                </select>
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

      <div style={styles.tableList}>
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

      <div style={styles.tableList}>
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
                <Sparkles size={12} />
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
          <h3 style={styles.cardTitle}>Venta Cruzada Manual</h3>
        </div>
        <button 
          onClick={() => setShowCrossSellForm(!showCrossSellForm)} 
          style={showCrossSellForm ? styles.cancelFormBtn : styles.openFormBtn}
        >
          {showCrossSellForm ? 'Cerrar Formulario' : '+ Configurar Venta'}
        </button>
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

      <div style={styles.tableList}>
        {crossSells.map((cs) => (
          <div key={cs.codart} style={styles.listItem}>
            <div>
              <strong style={{ fontSize: '0.85rem' }}>Base: {cs.codart}</strong>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                Recomendados: {cs.productos}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAutoTag = () => (
    <div style={styles.card} className="soft-card">
      <div style={styles.cardHeader}>
        <RefreshCw size={20} color="var(--accent-start)" />
        <h3 style={styles.cardTitle}>Auto-Etiquetado Inteligente (ERP)</h3>
      </div>
      <p style={styles.cardSub}>
        Gatilla el motor analítico de auto-etiquetado. Lee campos clave de la base de datos del ERP
        para emparejar de forma inteligente productos con preocupaciones como #ControlCaida, #AntiFrizz o #RizosDefinidos.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: '12px' }}>
        <button 
          onClick={handleRunAutoTagging} 
          style={{ 
            ...styles.autoTagBtn, 
            width: 'auto', 
            padding: '0 24px', 
            backgroundColor: 'var(--accent-start)', 
            color: '#FFFFFF',
            border: 'none'
          }} 
          className="soft-button"
          disabled={isSaving}
        >
          <RefreshCw size={16} /> Ejecutar Análisis e Indexación Automática
        </button>
        <span style={{ fontSize: '0.72rem', color: '#94A3B8', textAlign: 'center', maxWidth: '400px' }}>
          Este proceso corre sobre PostgreSQL local y sincroniza las clasificaciones del ERP. Toma unos segundos.
        </span>
      </div>
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
