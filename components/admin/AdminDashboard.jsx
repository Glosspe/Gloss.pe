'use client'

import { useState, useEffect, useMemo } from 'react'
import { Package, Star, Image, ImageOff, EyeOff, Store, TrendingUp } from 'lucide-react'

function useBreakpoint() {
  const [columns, setColumns] = useState(3)

  useEffect(() => {
    function update() {
      const w = window.innerWidth
      if (w < 640) setColumns(1)
      else if (w < 1024) setColumns(2)
      else setColumns(3)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return columns
}

const styles = {
  wrapper: {
    padding: '0 0 40px 0',
    width: '100%',
  },
  headerSection: {
    marginBottom: '36px',
  },
  welcomeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '6px',
  },
  trendIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'var(--accent-gradient, linear-gradient(135deg, #8B5CF6, #EC4899))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  welcomeTitle: {
    fontSize: '1.65rem',
    fontWeight: 800,
    color: 'var(--text-primary, #111827)',
    fontFamily: 'var(--font-title, inherit)',
    margin: 0,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: '0.9rem',
    fontWeight: 400,
    color: 'var(--text-secondary, #6B7280)',
    fontFamily: 'var(--font-body, inherit)',
    margin: '4px 0 0 52px',
    lineHeight: 1.4,
  },
  grid: (columns) => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: '18px',
  }),
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
    border: '1px solid rgba(0, 0, 0, 0.04)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    position: 'relative',
    overflow: 'hidden',
  },
  iconCircle: (color) => ({
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color + '1A',
    flexShrink: 0,
  }),
  cardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  number: {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--text-primary, #111827)',
    fontFamily: 'var(--font-title, inherit)',
    margin: 0,
    lineHeight: 1.1,
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary, #374151)',
    fontFamily: 'var(--font-body, inherit)',
    margin: 0,
  },
  description: {
    fontSize: '0.78rem',
    fontWeight: 400,
    color: 'var(--text-secondary, #9CA3AF)',
    fontFamily: 'var(--font-body, inherit)',
    margin: '2px 0 0 0',
    lineHeight: 1.4,
  },
  decorStripe: (color) => ({
    position: 'absolute',
    top: 0,
    right: 0,
    width: '80px',
    height: '80px',
    background: `radial-gradient(circle at top right, ${color}08, transparent 70%)`,
    pointerEvents: 'none',
  }),
}

export default function AdminDashboard({
  products = [],
  featuredProducts = [],
  warehouses = [],
  onNavigate,
  adminUser = {},
}) {
  const columns = useBreakpoint()

  const metrics = useMemo(() => {
    const withImage = products.filter((p) => p.images?.length > 0).length
    const withoutImage = products.filter((p) => !p.images || p.images.length === 0).length
    const hidden = products.filter((p) => p.visible === false).length
    const activeWarehouses = warehouses.filter((w) => w.visible).length

    return [
      {
        key: 'products',
        icon: Package,
        color: '#3B82F6',
        value: products.length,
        label: 'Total Productos',
        description: 'Productos registrados en el catálogo',
        section: 'productos',
      },
      {
        key: 'featured',
        icon: Star,
        color: 'var(--accent-start, #EC4899)',
        value: featuredProducts.length,
        label: 'Destacados',
        description: 'Productos marcados como tendencia',
        section: 'destacados',
      },
      {
        key: 'withImage',
        icon: Image,
        color: '#22C55E',
        value: withImage,
        label: 'Con Imagen',
        description: 'Productos con al menos una foto',
        section: 'productos',
      },
      {
        key: 'withoutImage',
        icon: ImageOff,
        color: '#F59E0B',
        value: withoutImage,
        label: 'Sin Imagen',
        description: 'Productos que necesitan fotos',
        section: 'sin-imagen',
      },
      {
        key: 'hidden',
        icon: EyeOff,
        color: '#EF4444',
        value: hidden,
        label: 'Ocultos',
        description: 'Productos no visibles en la tienda',
        section: 'ocultos',
      },
      {
        key: 'warehouses',
        icon: Store,
        color: '#14B8A6',
        value: activeWarehouses,
        label: 'Sedes Activas',
        description: 'Almacenes visibles para clientes',
        section: 'sedes',
      },
    ]
  }, [products, featuredProducts, warehouses])

  return (
    <div style={styles.wrapper}>
      <div style={styles.headerSection}>
        <div style={styles.welcomeRow}>
          <div style={styles.trendIcon}>
            <TrendingUp size={20} color="#ffffff" strokeWidth={2.5} />
          </div>
          <h2 style={styles.welcomeTitle}>
            Bienvenido, {adminUser?.nombre || 'Admin'}
          </h2>
        </div>
        <p style={styles.subtitle}>Panel de Control — Tienda Gloss</p>
      </div>

      <div style={styles.grid(columns)}>
        {metrics.map((metric) => {
          const IconComponent = metric.icon
          return (
            <div
              key={metric.key}
              style={styles.card}
              onClick={() => onNavigate?.(metric.section)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow =
                  '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
                e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow =
                  '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)'
                e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.04)'
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onNavigate?.(metric.section)
                }
              }}
            >
              <div style={styles.decorStripe(metric.color)} />
              <div style={styles.iconCircle(metric.color)}>
                <IconComponent
                  size={24}
                  color={metric.color}
                  strokeWidth={2}
                />
              </div>
              <div style={styles.cardContent}>
                <p style={styles.number}>{metric.value}</p>
                <p style={styles.label}>{metric.label}</p>
                <p style={styles.description}>{metric.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
