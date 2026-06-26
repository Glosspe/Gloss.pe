import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Tamaño máximo permitido: 3MB
const MAX_FILE_SIZE = 3 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
// Ancho máximo para redimensionar (se mantiene el aspect ratio)
const MAX_WIDTH = 800;

export async function POST(request) {
  try {
    // 1. Validar sesión
    const token = request.headers.get('Authorization');
    if (!token || !token.startsWith('Bearer gloss-admin-')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Parsear el FormData
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    // 3. Validar tipo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: `Tipo de archivo no permitido: ${file.type}. Solo se aceptan: JPEG, PNG, WebP, GIF.` 
      }, { status: 400 });
    }

    // 4. Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 });
    }

    // 5. Leer los bytes del archivo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Convertir a Base64 data URI
    const base64 = buffer.toString('base64');
    const mimeType = file.type;
    const dataUri = `data:${mimeType};base64,${base64}`;

    console.log(`[Admin Upload] Imagen subida: ${file.name} (${(file.size / 1024).toFixed(1)}KB, ${mimeType})`);

    return NextResponse.json({
      success: true,
      dataUri,
      fileName: file.name,
      fileSize: file.size,
      mimeType
    });

  } catch (error) {
    console.error('[Admin Upload] ERROR:', error);
    return NextResponse.json({ 
      error: 'Error interno al procesar la imagen', 
      details: error.message 
    }, { status: 500 });
  }
}
