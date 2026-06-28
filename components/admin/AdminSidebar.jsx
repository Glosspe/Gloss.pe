'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, Package, Box, Star, Tags, LayoutGrid, Store,
  Brain, Settings, Zap, Tag, Shuffle, Wand2,
  ChevronDown, ChevronRight, LogOut, Sparkles, X, Menu
} from 'lucide-react';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, type: 'single' },
  { type: 'divider', label: 'GESTIÓN' },
  {
    id: 'catalog', label: 'Catálogo', icon: Package, type: 'group',
    children: [
      { id: 'products', label: 'Productos', icon: Box },
      { id: 'featured', label: 'Destacados', icon: Star },
    ]
  },
  {
    id: 'classification', label: 'Clasificación', icon: Tags, type: 'group',
    children: [
      { id: 'categories', label: 'Categorías', icon: LayoutGrid },
      { id: 'warehouses', label: 'Sedes', icon: Store },
    ]
  },
  { type: 'divider', label: 'INTELIGENCIA' },
  {
    id: 'intelligence', label: 'E-commerce IA', icon: Brain, type: 'group',
    children: [
      { id: 'intel-config', label: 'Configuración', icon: Settings },
      { id: 'intel-shortcuts', label: 'Atajos Búsqueda', icon: Zap },
      { id: 'intel-tags', label: 'Etiquetas', icon: Tag },
      { id: 'intel-crosssell', label: 'Venta Cruzada', icon: Shuffle },
      { id: 'intel-autotag', label: 'Procesos IA', icon: Wand2 },
    ]
  },
];

function getParentGroupId(activeSection) {
  for (const item of menuItems) {
    if (item.type === 'group' && item.children) {
      for (const child of item.children) {
        if (child.id === activeSection) return item.id;
      }
    }
  }
  return null;
}

export default function AdminSidebar({
  activeSection,
  onSectionChange,
  adminUser,
  onLogout,
  isMobileOpen,
  onMobileClose,
}) {
  const [isDesktop, setIsDesktop] = useState(true);
  const [openGroups, setOpenGroups] = useState(() => {
    const parentId = getParentGroupId(activeSection);
    return parentId ? { [parentId]: true } : {};
  });
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mql.matches);
    const handler = (e) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const parentId = getParentGroupId(activeSection);
    if (parentId && !openGroups[parentId]) {
      setOpenGroups((prev) => ({ ...prev, [parentId]: true }));
    }
  }, [activeSection]);

  const toggleGroup = useCallback((groupId) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const handleItemClick = useCallback((id) => {
    onSectionChange(id);
    if (!isDesktop) onMobileClose?.();
  }, [onSectionChange, isDesktop, onMobileClose]);

  const isActive = (id) => activeSection === id;

  const isGroupActive = (item) => {
    if (item.type !== 'group') return false;
    return item.children?.some((child) => child.id === activeSection);
  };

  // ── Render helpers ──

  const renderSingleItem = (item) => {
    const active = isActive(item.id);
    const hovered = hoveredItem === item.id;
    const Icon = item.icon;

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item.id)}
        onMouseEnter={() => setHoveredItem(item.id)}
        onMouseLeave={() => setHoveredItem(null)}
        style={{
          ...styles.menuButton,
          borderLeft: active ? '3px solid var(--accent-start)' : '3px solid transparent',
          background: active
            ? 'rgba(255,255,255,0.05)'
            : hovered
              ? 'rgba(255,255,255,0.04)'
              : 'transparent',
          color: active ? '#FFFFFF' : '#9CA3AF',
        }}
      >
        <Icon size={18} style={{ flexShrink: 0 }} />
        <span style={styles.menuLabel}>{item.label}</span>
      </button>
    );
  };

  const renderDivider = (item, idx) => (
    <div key={`div-${idx}`} style={styles.divider}>
      {item.label}
    </div>
  );

  const renderGroupItem = (item) => {
    const open = !!openGroups[item.id];
    const groupActive = isGroupActive(item);
    const hovered = hoveredItem === `group-${item.id}`;
    const Icon = item.icon;
    const Chevron = open ? ChevronDown : ChevronRight;

    return (
      <div key={item.id}>
        <button
          onClick={() => toggleGroup(item.id)}
          onMouseEnter={() => setHoveredItem(`group-${item.id}`)}
          onMouseLeave={() => setHoveredItem(null)}
          style={{
            ...styles.menuButton,
            borderLeft: '3px solid transparent',
            background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
            color: groupActive ? '#FFFFFF' : '#9CA3AF',
          }}
        >
          <Icon size={18} style={{ flexShrink: 0 }} />
          <span style={styles.menuLabel}>{item.label}</span>
          <Chevron
            size={14}
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              transition: 'transform 200ms ease',
            }}
          />
        </button>

        <div
          style={{
            overflow: 'hidden',
            maxHeight: open ? `${(item.children?.length || 0) * 42}px` : '0px',
            transition: 'max-height 200ms ease',
          }}
        >
          {item.children?.map((child) => {
            const childActive = isActive(child.id);
            const childHovered = hoveredItem === child.id;
            const ChildIcon = child.icon;

            return (
              <button
                key={child.id}
                onClick={() => handleItemClick(child.id)}
                onMouseEnter={() => setHoveredItem(child.id)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  ...styles.menuButton,
                  paddingLeft: 44,
                  fontSize: '0.82rem',
                  borderLeft: childActive ? '3px solid var(--accent-start)' : '3px solid transparent',
                  background: childActive
                    ? 'rgba(255,255,255,0.05)'
                    : childHovered
                      ? 'rgba(255,255,255,0.04)'
                      : 'transparent',
                  color: childActive ? '#FFFFFF' : '#9CA3AF',
                }}
              >
                <ChildIcon size={15} style={{ flexShrink: 0 }} />
                <span style={styles.menuLabel}>{child.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Sidebar content ──

  const sidebarContent = (
    <div style={styles.sidebar(isDesktop)}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logoRow}>
          <span style={styles.logoText}>GLOSS</span>
        </div>
        <span style={styles.subtitle}>Panel Administrativo</span>

        {!isDesktop && (
          <button onClick={onMobileClose} style={styles.closeBtn} aria-label="Cerrar menú">
            <X size={20} color="#9CA3AF" />
          </button>
        )}
      </div>

      {/* Menu */}
      <nav style={styles.nav}>
        {menuItems.map((item, idx) => {
          if (item.type === 'divider') return renderDivider(item, idx);
          if (item.type === 'group') return renderGroupItem(item);
          return renderSingleItem(item);
        })}
      </nav>

      {/* Footer */}
      <div style={styles.footer}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {(adminUser?.nombre || 'A').charAt(0).toUpperCase()}
          </div>
          <div style={styles.userText}>
            <span style={styles.userName}>{adminUser?.nombre || 'Admin'}</span>
            <span style={styles.userRole}>Administrador</span>
          </div>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn} aria-label="Cerrar sesión">
          <LogOut size={16} />
          <span>Salir</span>
        </button>
      </div>
    </div>
  );

  // ── Desktop: always visible ──
  if (isDesktop) {
    return sidebarContent;
  }

  // ── Mobile: drawer overlay ──
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onMobileClose}
        style={{
          ...styles.overlay,
          opacity: isMobileOpen ? 1 : 0,
          pointerEvents: isMobileOpen ? 'auto' : 'none',
        }}
      />
      {/* Drawer */}
      <div
        style={{
          ...styles.drawer,
          transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {sidebarContent}
      </div>
    </>
  );
}

// ── Styles ──

const styles = {
  sidebar: (isDesktop) => ({
    width: 260,
    height: '100vh',
    background: '#1A1D23',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'var(--font-body)',
    userSelect: 'none',
    position: isDesktop ? 'fixed' : 'relative',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: isDesktop ? 50 : 1001,
  }),

  // Header
  header: {
    position: 'relative',
    padding: '22px 20px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontFamily: 'var(--font-logo)',
    fontSize: '1.2rem',
    letterSpacing: '0.15em',
    color: '#FFFFFF',
    fontWeight: 600,
  },
  subtitle: {
    display: 'block',
    marginTop: 4,
    fontSize: '0.65rem',
    color: '#6B7280',
    letterSpacing: '0.04em',
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 14,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Nav
  nav: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },

  // Menu items
  menuButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '9px 16px',
    fontSize: '0.88rem',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'all 200ms ease',
    textAlign: 'left',
  },
  menuLabel: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  // Dividers
  divider: {
    padding: '20px 16px 6px',
    fontSize: '0.65rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: '#6B7280',
    fontFamily: 'var(--font-body)',
  },

  // Footer
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.06)',
    padding: '14px 16px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: '0.82rem',
    fontWeight: 600,
    flexShrink: 0,
  },
  userText: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  userName: {
    color: '#FFFFFF',
    fontSize: '0.82rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    color: '#6B7280',
    fontSize: '0.68rem',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '8px 10px',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: 6,
    color: '#EF4444',
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    transition: 'all 200ms ease',
  },

  // Mobile overlay & drawer
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 999,
    transition: 'opacity 200ms ease',
  },
  drawer: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 1000,
    transition: 'transform 200ms ease',
  },
};
