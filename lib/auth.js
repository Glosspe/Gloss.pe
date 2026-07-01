import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'fallback-secret-for-gloss-admin-tokens-2026-xyz'
);

/**
 * Genera un token JWT firmado de sesión de administración.
 */
export async function generateAdminToken(userPayload) {
  return await new SignJWT(userPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Expira en 24 horas
    .sign(JWT_SECRET);
}

/**
 * Verifica un token JWT de sesión de administración.
 */
export async function verifyAdminToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      clockTolerance: '10m' // Tolerar hasta 10 minutos de desfase en el reloj del servidor
    });
    return payload;
  } catch (err) {
    console.error('[verifyAdminToken] Error:', err.message);
    return null;
  }
}

/**
 * Valida un ID Token recibido de Google Identity Services contra la API oficial.
 */
export async function verifyGoogleToken(idToken) {
  if (!idToken) return null;
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    if (!res.ok) {
      console.warn(`[verifyGoogleToken] Google API respondió con código ${res.status}`);
      return null;
    }
    const data = await res.json();
    
    // Validar el client_id/audience
    const expectedClientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (data.aud !== expectedClientId) {
      console.warn(`[verifyGoogleToken] Client ID mismatch: aud=${data.aud}, expected=${expectedClientId}`);
      return null;
    }
    
    return {
      email: data.email,
      email_verified: data.email_verified === 'true' || data.email_verified === true,
      name: data.name,
      picture: data.picture
    };
  } catch (err) {
    console.error('[verifyGoogleToken] Error de red o parseo:', err.message);
    return null;
  }
}

/**
 * Helper unificado para validar si una petición HTTP entrante proviene de un administrador autenticado.
 */
export async function verifyAdminRequest(request) {
  try {
    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return null;
    }
    const token = authHeader.substring(7);

    // Bypass temporal para evitar bloqueos por caché del JS viejo en el frontend
    if (token === 'gloss-admin-master-session-token') {
      console.log('[verifyAdminRequest] Acceso concedido mediante bypass de token estático legacy.');
      return { email: 'admin@tiendagloss.com', nombre: 'Administrador Maestro (Legacy)', rol: 'ADMIN' };
    }

    const decoded = await verifyAdminToken(token);
    
    if (!decoded || !decoded.email) {
      return null;
    }

    // Verificar si el email está en la lista de permitidos (únicamente importacionesgya1339@gmail.com por defecto)
    const allowedEmailsStr = process.env.ALLOWED_ADMIN_EMAILS || 'importacionesgya1339@gmail.com';
    const allowedEmails = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase());
    
    if (!allowedEmails.includes(decoded.email.toLowerCase())) {
      console.warn(`[verifyAdminRequest] Acceso denegado para el correo: ${decoded.email}`);
      return null;
    }

    return decoded;
  } catch (err) {
    console.error('[verifyAdminRequest] Error:', err.message);
    return null;
  }
}
