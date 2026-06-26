import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 });
    }

    console.log(`[Admin Login API] Intento de login para usuario: ${username}`);

    // Credenciales maestras fijas por defecto (en caso de que PostgreSQL esté vacío al inicio)
    const MASTER_USER = process.env.ADMIN_USER || 'admin';
    const MASTER_PASS = process.env.ADMIN_PASSWORD || 'Gloss2026';

    if (username === MASTER_USER && password === MASTER_PASS) {
      return NextResponse.json({
        success: true,
        user: { username, nombre: 'Administrador Maestro', rol: 'ADMIN' },
        token: 'gloss-admin-master-session-token'
      });
    }

    // Si no coincide con las maestras, buscar en la tabla WebUsuarioAdmin de PostgreSQL
    try {
      const user = await prisma.webUsuarioAdmin.findFirst({
        where: {
          usuario: username,
          password: password // En producción se recomienda usar hash de bcrypt
        }
      });

      if (user) {
        return NextResponse.json({
          success: true,
          user: { username: user.usuario, nombre: user.nombre, rol: user.rol },
          token: `gloss-admin-session-${user.id}`
        });
      }
    } catch (pgErr) {
      console.warn('[Admin Login API] PostgreSQL no accesible para verificar usuarios:', pgErr.message);
    }

    return NextResponse.json({ error: 'Usuario o contraseña incorrectos' }, { status: 401 });

  } catch (error) {
    console.error('[Admin Login API] ERROR:', error);
    return NextResponse.json({ error: 'Error interno de inicio de sesión' }, { status: 500 });
  }
}
