'use client';

import React from 'react';
import { X, Home, Heart, User, Settings, Phone, Sparkles } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

export default function MenuDrawer() {
  const { isMenuOpen, setIsMenuOpen } = useCart();

  if (!isMenuOpen) return null;

  return (
    <div style={styles.overlay} onClick={() => setIsMenuOpen(false)}>
      <div style={styles.menuContainer} onClick={(e) => e.stopPropagation()}>
        {/* Encabezado del Menú */}
        <div style={styles.header}>
          <div style={styles.logoGroup}>
            <Sparkles size={18} color="var(--accent-start)" />
            <h3 style={styles.logoText}>GLOSS</h3>
          </div>
          <button style={styles.closeButton} onClick={() => setIsMenuOpen(false)}>
            <X size={20} color="var(--text-primary)" />
          </button>
        </div>

        {/* Enlaces de Navegación */}
        <div style={styles.linksContainer}>
          {/* Enlace Inicio */}
          <Link href="/" onClick={() => setIsMenuOpen(false)} style={styles.menuLink}>
            <div style={styles.iconBox}>
              <Home size={20} color="var(--accent-start)" />
            </div>
            <span style={styles.linkLabel}>Inicio / Catálogo</span>
          </Link>

          {/* Enlace Favoritos */}
          <Link href="/favorites" onClick={() => setIsMenuOpen(false)} style={styles.menuLink}>
            <div style={styles.iconBox}>
              <Heart size={20} color="var(--accent-start)" />
            </div>
            <span style={styles.linkLabel}>Mis Favoritos</span>
          </Link>

          {/* Enlace Mi Cuenta */}
          <Link href="/profile" onClick={() => setIsMenuOpen(false)} style={styles.menuLink}>
            <div style={styles.iconBox}>
              <User size={20} color="var(--accent-start)" />
            </div>
            <span style={styles.linkLabel}>Mi Cuenta</span>
          </Link>

          {/* Enlace Administración */}
          <Link href="/admin" onClick={() => setIsMenuOpen(false)} style={styles.menuLink}>
            <div style={styles.iconBox}>
              <Settings size={20} color="var(--accent-start)" />
            </div>
            <span style={styles.linkLabel}>Administrar Tienda</span>
          </Link>

          {/* Línea divisoria */}
          <div style={styles.divider} />

          {/* Contacto / Soporte por WhatsApp */}
          <a 
            href={`https://api.whatsapp.com/send?phone=51900000000&text=Hola%20Tienda%20Gloss,%20tengo%20una%20consulta.`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsMenuOpen(false)}
            style={styles.menuLink}
          >
            <div style={styles.iconBox}>
              <Phone size={20} color="var(--accent-start)" />
            </div>
            <span style={styles.linkLabel}>Contacto WhatsApp</span>
          </a>
        </div>

        {/* Footer del Menú */}
        <div style={styles.footer}>
          <span style={styles.footerText}>© 2026 Tienda Gloss. Todos los derechos reservados.</span>
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
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(28, 42, 56, 0.4)',
    backdropFilter: 'blur(4px)',
    zIndex: 2000,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    maxWidth: '320px',
    height: '100%',
    boxShadow: '-10px 0 40px rgba(165, 177, 194, 0.15)',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideIn 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
  },
  header: {
    padding: '24px 20px',
    borderBottom: '1px solid rgba(165, 177, 194, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logoGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoText: {
    fontFamily: 'var(--font-logo)',
    fontSize: '1.45rem',
    fontWeight: '700',
    color: 'var(--accent-start)',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    fontStyle: 'normal',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  linksContainer: {
    flex: 1,
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  menuLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '12px 16px',
    borderRadius: '16px',
    backgroundColor: '#FAF9F8',
    transition: 'background-color 0.2s ease, transform 0.2s ease',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 10px rgba(165, 177, 194, 0.05)',
  },
  linkLabel: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
  },
  divider: {
    height: '1px',
    backgroundColor: 'rgba(165, 177, 194, 0.1)',
    margin: '12px 0',
  },
  footer: {
    padding: '24px 20px',
    borderTop: '1px solid rgba(165, 177, 194, 0.08)',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '0.7rem',
    color: 'var(--text-secondary)',
  },
};
