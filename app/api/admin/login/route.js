import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyGoogleToken, generateAdminToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { credentialToken, username, password } = body;

    // --- FLUJO A: Autenticación por Google OAuth (Flujo Principal Seguro) ---
    if (credentialToken) {
      console.log('[Admin Login API] Iniciando validación de Google ID Token...');
      const googleUser = await verifyGoogleToken(credentialToken);
      
      if (!googleUser) {
        return NextResponse.json({ error: 'Token de Google inválido o expirado' }, { status: 401 });
      }

      if (!googleUser.email_verified) {
        return NextResponse.json({ error: 'La cuenta de Google del usuario no está verificada' }, { status: 401 });
      }

      // Verificar si el correo electrónico está en la lista de administradores autorizados
      const allowedEmailsStr = process.env.ALLOWED_ADMIN_EMAILS || 'administrador@tiendagloss.com,gloss.pe.oficial@gmail.com,sistemas@gloss.pe,ventas@gloss.pe';
      const allowedEmails = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase());

      if (!allowedEmails.includes(googleUser.email.toLowerCase())) {
        console.warn(`[Admin Login API] Acceso denegado a Google Email: ${googleUser.email}`);
        return NextResponse.json({ error: 'Tu correo de Google no tiene permisos de administrador' }, { status: 403 });
      }

      // Generar token JWT firmado propio de Tienda Gloss
      const sessionPayload = {
        email: googleUser.email,
        nombre: googleUser.name,
        rol: 'ADMIN',
        picture: googleUser.picture
      };
      const signedToken = await generateAdminToken(sessionPayload);

      console.log(`[Admin Login API] Login exitoso vía Google para: ${googleUser.email}`);
      return NextResponse.json({
        success: true,
        user: { username: googleUser.email, nombre: googleUser.name, rol: 'ADMIN', picture: googleUser.picture },
        token: signedToken
      });
    }

    // --- FLUJO B: Autenticación Clásica (Solo permitido en desarrollo local) ---
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'En producción se requiere inicio de sesión con Google' }, { status: 403 });
    }

    if (!username || !password) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
    }

    console.log(`[Admin Login API - DEV MODE] Intento de login clásico para: ${username}`);
    const MASTER_USER = process.env.ADMIN_USER || 'admin';
    const MASTER_PASS = process.env.ADMIN_PASSWORD;

    if (!MASTER_PASS) {
      return NextResponse.json({ error: 'Clave maestra no configurada en variables de entorno' }, { status: 500 });
    }

    if (username === MASTER_USER && password === MASTER_PASS) {
      const sessionPayload = { email: 'admin@tiendagloss.com', nombre: 'Administrador Maestro', rol: 'ADMIN' };
      const signedToken = await generateAdminToken(sessionPayload);
      return NextResponse.json({
        success: true,
        user: { username, nombre: 'Administrador Maestro', rol: 'ADMIN' },
        token: signedToken
      });
    }

    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });

  } catch (error) {
    console.error('[Admin Login API] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno de inicio de sesión', details: error.message }, { status: 500 });
  }
}
