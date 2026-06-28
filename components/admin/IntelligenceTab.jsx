'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Save, Trash2, Plus, RefreshCw, 
  HelpCircle, Tag, Shuffle, CheckCircle, AlertCircle, Loader2 
} from 'lucide-react';

export default function IntelligenceTab() {
  const [configs, setConfigs] = useState({ LOW_STOCK_THRESHOLD: '5' });
  const [shortcuts, setShortcuts] = useState([]);
  const [tags, setTags] = useState([]);
  const [crossSells, setCrossSells] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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
        loadIntelData();
        setMessage({ type: 'success', text: 'Atajo rápido agregado correctamente.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de red.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteShortcut = async (id) => {
    if (!confirm('¿Seguro de eliminar este atajo?')) return;
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
        loadIntelData();
        setMessage({ type: 'success', text: 'Venta cruzada manual registrada.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al guardar venta cruzada.' });
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
          orden: parseInt(newTag.orden || '0'), 
          productos: cleanProds 
        })
      });
      if (res.ok) {
        setNewTag({ etiqueta: '', orden: '0', productosStr: '' });
        loadIntelData();
        setMessage({ type: 'success', text: 'Etiqueta de necesidad creada/actualizada.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al guardar la etiqueta.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTag = async (id) => {
    if (!confirm('¿Seguro de eliminar esta etiqueta?')) return;
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
  };

  const handleRunAutoTagging = async () => {
    if (!confirm('¿Deseas gatillar el Auto-Etiquetado Inteligente? Analizará la descripción de los productos en el ERP y asociará etiquetas #AntiFrizz, #ControlCaida, #UñasFuertes, etc.')) return;
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
  };

  return (
    <div style={styles.tabContainer}>
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
          <p style={{ marginTop: '12px', fontSize: '0.88rem', color: '#94A3B8' }}>Cargando panel de Inteligencia comercial...</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {/* Columna Izquierda: Configs y Shortcuts */}
          <div style={styles.col}>
            {/* Tarjeta 1: Alerta de Stock Crítico */}
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

            {/* Tarjeta 2: Atajos de Búsqueda Rápida */}
            <div style={styles.card} className="soft-card">
              <div style={styles.cardHeader}>
                <Sparkles size={20} color="var(--accent-start)" />
                <h3 style={styles.cardTitle}>Atajos de Búsqueda Rápida</h3>
              </div>
              <p style={styles.cardSub}>Gestión de píldoras sugeridas para el modal de búsqueda rápida de cosméticos.</p>

              <form onSubmit={handleAddShortcut} style={styles.shortcutForm}>
                <div style={styles.formGrid}>
                  <input 
                    type="text" 
                    placeholder="Texto (ej. Base Gloss)" 
                    value={newShortcut.texto}
                    onChange={(e) => setNewShortcut({ ...newShortcut, texto: e.target.value })}
                    style={styles.input}
                    required
                  />
                  <select 
                    value={newShortcut.tipo} 
                    onChange={(e) => setNewShortcut({ ...newShortcut, tipo: e.target.value })}
                    style={styles.select}
                  >
                    <option value="QUERY">Consulta de Texto</option>
                    <option value="BRAND">Marca Directa</option>
                    <option value="CATEGORY">Categoría Directa</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Enlace (ej: ?brand=Meybelline)" 
                    value={newShortcut.enlace}
                    onChange={(e) => setNewShortcut({ ...newShortcut, enlace: e.target.value })}
                    style={styles.input}
                  />
                  <input 
                    type="number" 
                    placeholder="Orden (0, 1...)" 
                    value={newShortcut.orden}
                    onChange={(e) => setNewShortcut({ ...newShortcut, orden: e.target.value })}
                    style={styles.input}
                  />
                </div>
                <button type="submit" disabled={isSaving} style={styles.addBtn} className="soft-button">
                  <Plus size={16} /> Agregar Atajo
                </button>
              </form>

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
          </div>

          {/* Columna Derecha: Tags & Cross-sells */}
          <div style={styles.col}>
            {/* Tarjeta 3: Etiquetas de Necesidad */}
            <div style={styles.card} className="soft-card">
              <div style={styles.cardHeader}>
                <Tag size={20} color="var(--accent-start)" />
                <h3 style={styles.cardTitle}>Etiquetas de Necesidad (Filtros)</h3>
              </div>
              <p style={styles.cardSub}>Organiza filtros de belleza (#AntiFrizz, #ControlCaida) asociando códigos de productos del ERP.</p>

              {/* Botón Auto-Tagging */}
              <button 
                onClick={handleRunAutoTagging} 
                style={styles.autoTagBtn} 
                className="soft-button"
                disabled={isSaving}
              >
                <RefreshCw size={16} /> Auto-Etiquetar Catálogo (ERP)
              </button>

              <form onSubmit={handleAddTag} style={styles.shortcutForm}>
                <div style={styles.formGrid}>
                  <input 
                    type="text" 
                    placeholder="Etiqueta (ej. #ControlCaida)" 
                    value={newTag.etiqueta}
                    onChange={(e) => setNewTag({ ...newTag, etiqueta: e.target.value })}
                    style={styles.input}
                    required
                  />
                  <input 
                    type="number" 
                    placeholder="Orden (0, 1...)" 
                    value={newTag.orden}
                    onChange={(e) => setNewTag({ ...newTag, orden: e.target.value })}
                    style={styles.input}
                  />
                  <textarea 
                    placeholder="Códigos del ERP separados por comas (ej. 0101-1, 0101-2)" 
                    value={newTag.productosStr}
                    onChange={(e) => setNewTag({ ...newTag, productosStr: e.target.value })}
                    style={{ ...styles.input, gridColumn: 'span 2', minHeight: '60px' }}
                  />
                </div>
                <button type="submit" disabled={isSaving} style={styles.addBtn} className="soft-button">
                  <Plus size={16} /> Crear/Guardar Etiqueta
                </button>
              </form>

              <div style={styles.tableList}>
                {tags.map((tg) => (
                  <div key={tg.id} style={styles.listItem}>
                    <div>
                      <strong style={{ fontSize: '0.85rem', color: 'var(--accent-start)' }}>{tg.etiqueta}</strong>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', maxWidth: '300px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        Productos asociados: {tg.productos}
                      </div>
                    </div>
                    <button onClick={() => handleDeleteTag(tg.id)} style={styles.deleteBtn}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tarjeta 4: Venta Cruzada Manual */}
            <div style={styles.card} className="soft-card">
              <div style={styles.cardHeader}>
                <Shuffle size={20} color="var(--accent-start)" />
                <h3 style={styles.cardTitle}>Venta Cruzada Manual</h3>
              </div>
              <p style={styles.cardSub}>Configura qué productos sugerir al cliente en el carrusel de la ficha de detalle.</p>

              <form onSubmit={handleAddCrossSell} style={styles.shortcutForm}>
                <div style={styles.formGrid}>
                  <input 
                    type="text" 
                    placeholder="Código Producto Base (ERP)" 
                    value={newCrossSell.codart}
                    onChange={(e) => setNewCrossSell({ ...newCrossSell, codart: e.target.value })}
                    style={styles.input}
                    required
                  />
                  <textarea 
                    placeholder="Códigos de productos complementarios (separados por comas)" 
                    value={newCrossSell.productosStr}
                    onChange={(e) => setNewCrossSell({ ...newCrossSell, productosStr: e.target.value })}
                    style={{ ...styles.input, minHeight: '60px' }}
                    required
                  />
                </div>
                <button type="submit" disabled={isSaving} style={styles.addBtn} className="soft-button">
                  <Plus size={16} /> Guardar Venta Cruzada
                </button>
              </form>

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
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  tabContainer: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    backgroundColor: '#F8F9FA',
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
    border: '1px solid rgba(0,0,0,0.03)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.01)'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
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
    flex: 1,
    height: '40px',
    padding: '0 12px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    fontSize: '0.85rem',
    outline: 'none',
    backgroundColor: '#FAFBFD'
  },
  select: {
    height: '40px',
    padding: '0 12px',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    fontSize: '0.85rem',
    outline: 'none',
    backgroundColor: '#FAFBFD'
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
    marginBottom: '20px',
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
  }
};
