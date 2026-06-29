import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import cache from '@/lib/cache';

export async function POST(request) {
  try {
    // 1. Validar la sesión del administrador
    const token = request.headers.get('Authorization');
    if (!token || !token.startsWith('Bearer gloss-admin-')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { codart, imagenes, descripcionEnriquecida, destacado, visible, categoria } = await request.json();

    if (!codart) {
      return NextResponse.json({ error: 'Falta el código de artículo' }, { status: 400 });
    }

    console.log(`[Admin Update Product] Modificando enriquecimiento para artículo: ${codart}, categoria: ${categoria}`);

    // Construir objetos de actualización y creación de forma selectiva para no borrar
    // información existente (como imágenes, destacado, etc.) si no vienen en el request.
    const updateData = {};
    if (imagenes !== undefined) updateData.imagenes = JSON.stringify(imagenes || []);
    if (descripcionEnriquecida !== undefined) updateData.descripcionEnriquecida = descripcionEnriquecida;
    if (destacado !== undefined) updateData.destacado = !!destacado;
    if (visible !== undefined) updateData.visible = !!visible;
    if (categoria !== undefined) updateData.categoria = categoria;

    const createData = {
      codart,
      imagenes: imagenes !== undefined ? JSON.stringify(imagenes || []) : '[]',
      descripcionEnriquecida: descripcionEnriquecida || null,
      destacado: !!destacado,
      visible: visible !== undefined ? !!visible : true,
      categoria: categoria || null
    };

    // 2. Ejecutar Upsert (crear o actualizar) en PostgreSQL mediante Prisma
    const updatedProduct = await prisma.webProductoImagen.upsert({
      where: { codart },
      update: updateData,
      create: createData
    });

    // Invalidar activamente todo el caché de la tienda para que el cambio de precio/foto/oferta sea visible de inmediato
    await cache.clear();

    return NextResponse.json({
      success: true,
      product: updatedProduct
    });

  } catch (error) {
    console.error('[Admin Update Product API] ERROR:', error);
    return NextResponse.json({ error: 'Error interno al guardar los detalles en PostgreSQL', details: error.message }, { status: 500 });
  }
}
