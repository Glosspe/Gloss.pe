import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth';
import sharp from 'sharp';

export const runtime = 'nodejs';

// Tamaño máximo permitido: 10MB (el backend lo comprimirá eficientemente a menos de 100KB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request) {
  try {
    // 1. Validar sesión usando JWT criptográfico
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado. Se requiere token de administrador válido.' }, { status: 401 });
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

    // 4. Validar tamaño original
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `El archivo excede el tamaño máximo permitido.` 
      }, { status: 400 });
    }

    // 5. Leer los bytes del archivo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Redimensionar y comprimir la imagen en caliente con sharp para ahorrar RAM y almacenamiento
    console.log(`[Admin Upload] Procesando compresión de imagen: ${file.name} (Original: ${(file.size / 1024).toFixed(1)}KB)`);
    
    let compressedBuffer;
    try {
      compressedBuffer = await sharp(buffer)
        .resize({ width: 800, withoutEnlargement: true }) // Máximo 800px de ancho para web móvil
        .jpeg({ quality: 70, progressive: true, mozjpeg: true }) // Compresión agresiva JPEG progresiva
        .toBuffer();
    } catch (sharpErr) {
      console.warn('[Admin Upload] Sharp falló al procesar. Guardando archivo original como fallback:', sharpErr.message);
      compressedBuffer = buffer;
    }

    const base64 = compressedBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64}`;

    console.log(`[Admin Upload] Compresión exitosa: ${(compressedBuffer.length / 1024).toFixed(1)}KB (Reducción: ${(((file.size - compressedBuffer.length) / file.size) * 100).toFixed(1)}%)`);

    return NextResponse.json({
      success: true,
      dataUri,
      fileName: file.name,
      fileSize: compressedBuffer.length,
      mimeType: 'image/jpeg'
    });

  } catch (error) {
    console.error('[Admin Upload API] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno de subida', details: error.message }, { status: 500 });
  }
}
