'use client'

import { useEffect, useCallback } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'

const variantColors = {
  danger: '#EF4444',
  warning: '#F59E0B',
  primary: 'var(--accent-start)',
}

const variantBg = {
  danger: 'rgba(239, 68, 68, 0.08)',
  warning: 'rgba(245, 158, 11, 0.08)',
  primary: 'var(--accent-soft, rgba(139, 92, 246, 0.08))',
}

const variantHover = {
  danger: '#DC2626',
  warning: '#D97706',
  primary: 'var(--accent-end, #7C3AED)',
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    padding: '16px',
    animation: 'adminModalOverlayIn 0.2s ease-out forwards',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '20px',
    padding: '32px 28px 24px',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08)',
    animation: 'adminModalCardIn 0.25s ease-out forwards',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '10px',
    color: '#9CA3AF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s, color 0.15s',
  },
  iconCircle: (variant) => ({
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: variantBg[variant],
    marginBottom: '18px',
    flexShrink: 0,
  }),
  title: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--text-primary, #111827)',
    fontFamily: 'var(--font-title, inherit)',
    margin: '0 0 8px 0',
    lineHeight: 1.3,
  },
  message: {
    fontSize: '0.9rem',
    fontWeight: 400,
    color: 'var(--text-secondary, #6B7280)',
    fontFamily: 'var(--font-body, inherit)',
    margin: '0 0 28px 0',
    lineHeight: 1.6,
    maxWidth: '340px',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    padding: '12px 20px',
    borderRadius: '12px',
    border: '1.5px solid #E5E7EB',
    backgroundColor: '#ffffff',
    color: 'var(--text-primary, #374151)',
    fontSize: '0.9rem',
    fontWeight: 600,
    fontFamily: 'var(--font-body, inherit)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
  },
  confirmButton: (variant) => ({
    flex: 1,
    padding: '12px 20px',
    borderRadius: '12px',
    border: 'none',
    backgroundColor: variantColors[variant],
    color: '#ffffff',
    fontSize: '0.9rem',
    fontWeight: 600,
    fontFamily: 'var(--font-body, inherit)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  }),
  spinner: {
    animation: 'adminModalSpin 0.8s linear infinite',
  },
}

const keyframesCSS = `
  @keyframes adminModalOverlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes adminModalCardIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  @keyframes adminModalSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`

export default function AdminConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
  isProcessing = false,
}) {
  const safeVariant = variantColors[variant] ? variant : 'danger'

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && !isProcessing) {
        onCancel?.()
      }
    },
    [onCancel, isProcessing]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !isProcessing) {
      onCancel?.()
    }
  }

  return (
    <>
      <style>{keyframesCSS}</style>
      <div style={styles.overlay} onClick={handleOverlayClick}>
        <div style={styles.card}>
          <button
            style={styles.closeButton}
            onClick={() => !isProcessing && onCancel?.()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F3F4F6'
              e.currentTarget.style.color = '#374151'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = '#9CA3AF'
            }}
            aria-label="Cerrar"
            disabled={isProcessing}
          >
            <X size={18} />
          </button>

          <div style={styles.iconCircle(safeVariant)}>
            <AlertTriangle
              size={26}
              color={variantColors[safeVariant]}
              strokeWidth={2.2}
            />
          </div>

          <h3 style={styles.title}>{title}</h3>
          <p style={styles.message}>{message}</p>

          <div style={styles.buttonRow}>
            <button
              style={styles.cancelButton}
              onClick={() => onCancel?.()}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB'
                e.currentTarget.style.borderColor = '#D1D5DB'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff'
                e.currentTarget.style.borderColor = '#E5E7EB'
              }}
              disabled={isProcessing}
            >
              {cancelText}
            </button>
            <button
              style={{
                ...styles.confirmButton(safeVariant),
                opacity: isProcessing ? 0.85 : 1,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
              }}
              onClick={() => !isProcessing && onConfirm?.()}
              onMouseEnter={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.backgroundColor = variantHover[safeVariant]
                  e.currentTarget.style.transform = 'translateY(-1px)'
                  e.currentTarget.style.boxShadow = `0 4px 14px ${variantColors[safeVariant]}40`
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = variantColors[safeVariant]
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
              disabled={isProcessing}
            >
              {isProcessing && (
                <Loader2 size={16} style={styles.spinner} />
              )}
              {isProcessing ? 'Procesando...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
