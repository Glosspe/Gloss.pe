'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isDev, setIsDev] = useState(false);
  const router = useRouter();

  // Si ya tiene sesión, redirigir al panel
  useEffect(() => {
    const token = localStorage.getItem('gloss_admin_token');
    if (token) {
      router.push('/admin');
    }
    
    // Detectar si estamos en local/desarrollo
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        setIsDev(true);
      }
    }
  }, [router]);

  // Cargar Google Identity Services SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '343548222295-12oqv1f8f7l654645tsmms7habkh63dr.apps.googleusercontent.com';
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleLogin
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          { 
            theme: 'outline', 
            size: 'large', 
            width: 348,
            shape: 'pill',
            text: 'continue_with',
            logo_alignment: 'left'
          }
        );
      } catch (err) {
        console.error('Error inicializando Google Identity:', err);
      }
    };

    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleGoogleLogin = async (googleResponse) => {
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialToken: googleResponse.credential })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem('gloss_admin_token', data.token);
        localStorage.setItem('gloss_admin_user', JSON.stringify(data.user));
        router.push('/admin');
      } else {
        setError(data.error || 'No tienes acceso de administrador con esta cuenta.');
      }
    } catch (err) {
      console.error('Error en Google Login:', err);
      setError('Error de conexión al validar con Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor, ingresa todos los campos.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('gloss_admin_token', data.token);
        localStorage.setItem('gloss_admin_user', JSON.stringify(data.user));
        router.push('/admin');
      } else {
        setError(data.error || 'Credenciales incorrectas.');
      }
    } catch (err) {
      console.error('Error en login:', err);
      setError('Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card} className="soft-card">
        <div style={styles.header}>
          <h2 style={styles.title}>Panel Administrativo</h2>
          <p style={styles.subtitle}>Inicia sesión de forma segura para gestionar el catálogo.</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={18} color="#EB5E55" />
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        <div style={styles.googleContainer}>
          {/* Botón oficial de Google Renderizado por la SDK */}
          <div id="google-signin-btn" style={styles.googleButtonWrapper} />
          {isSubmitting && (
            <div style={styles.verifyingOverlay}>
              <Loader2 size={20} className="spinner" color="var(--accent-start)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Validando credenciales...
              </span>
            </div>
          )}
        </div>

        {/* Formulario clásico solo visible en desarrollo local */}
        {isDev && (
          <div style={styles.devSection}>
            <div style={styles.divider}>
              <span style={styles.dividerText}>o usar acceso local (Dev Only)</span>
            </div>
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label} htmlFor="username">Usuario</label>
                <div style={styles.inputWrapper}>
                  <User size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                  <input
                    type="text"
                    id="username"
                    placeholder="Ej. admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label} htmlFor="password">Contraseña</label>
                <div style={styles.inputWrapper}>
                  <Lock size={18} color="var(--text-secondary)" style={styles.inputIcon} />
                  <input
                    type="password"
                    id="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={styles.submitButton}
                className="soft-button"
              >
                Ingresar localmente
              </button>
            </form>
          </div>
        )}

        <div style={styles.footer}>
          <Link href="/" style={styles.backLink}>
            ← Volver a la Tienda
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '85vh',
    padding: '20px',
    backgroundColor: 'var(--bg-primary)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    padding: '36px',
    backgroundColor: 'var(--bg-card)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  title: {
    fontFamily: 'var(--font-title)',
    fontSize: '1.4rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
  },
  input: {
    width: '100%',
    height: '48px',
    paddingLeft: '48px',
    paddingRight: '16px',
    border: '1px solid rgba(142, 154, 167, 0.15)',
    borderRadius: '16px',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    outline: 'none',
    color: 'var(--text-primary)',
  },
  submitButton: {
    width: '100%',
    height: '50px',
    marginTop: '8px',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(235, 94, 85, 0.08)',
    border: '1px solid rgba(235, 94, 85, 0.15)',
    padding: '12px 16px',
    borderRadius: '16px',
    marginBottom: '20px',
  },
  errorText: {
    fontSize: '0.85rem',
    color: '#EB5E55',
    fontWeight: '600',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  backLink: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  googleContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    width: '100%',
    padding: '12px 0',
    position: 'relative'
  },
  googleButtonWrapper: {
    minHeight: '44px',
    display: 'flex',
    justifyContent: 'center',
    width: '100%'
  },
  verifyingOverlay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '6px'
  },
  devSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    textAlign: 'center',
    margin: '16px 0',
    color: 'var(--text-secondary)'
  },
  dividerText: {
    width: '100%',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: '#94A3B8'
  }
};
