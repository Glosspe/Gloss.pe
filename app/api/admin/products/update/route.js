import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    // 1. Validar la sesión del administrador
    // Por simplicidad de desarrollo, verificamos que tenga el header de autorización o token
    const token = request.headers.get('Authorization');
    if (!token || !token.startsWith('Bearer gloss-admin-')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { codart, imagenes, descripcionEnriquecida, destacado } = await request.json();

    if (!codart || !imagenes) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    console.log(`[Admin Update Product] Modificando enriquecimiento para artículo: ${codart}`);

    // Convertir array de imágenes a string JSON para guardarlo en la columna
    const imagenesString = JSON.stringify(imagenes);

    // 2. Ejecutar Upsert (crear o actualizar) en PostgreSQL mediante Prisma
    const updatedProduct = await prisma.webProductoImagen.upsert({
      where: { codart },
      update: {
        imagenes: imagenesString,
        descripcionEnriquecida,
        destacado: !!destacado
      },
      create: {
        codart,
        imagenes: imagenesString,
        descripcionEnriquecida,
        destacado: !!destacado
      }
    });

    return NextResponse.json({
      success: true,
      product: updatedProduct
    });

  } catch (error) {
    console.error('[Admin Update Product API] ERROR:', error);
    return NextResponse.json({ error: 'Error interno al guardar los detalles en PostgreSQL', details: error.message }, { status: 500 });
  }
}
