import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Categorías por defecto que se sincronizan con el mapeo del ERP
const DEFAULT_CATEGORIES = [
  { categoria: 'Capilar', visible: true, orden: 1 },
  { categoria: 'Facial', visible: true, orden: 2 },
  { categoria: 'Cosmeticos', visible: true, orden: 3 },
  { categoria: 'Corporal', visible: true, orden: 4 },
];

// GET: Listar todas las categorías con su estado de visibilidad
export async function GET(request) {
  try {
    // Verificar sesión para admin
    const token = request.headers.get('Authorization');
    const isAdmin = token && token.startsWith('Bearer gloss-admin-');

    let categories = await prisma.webCategoriaConfig.findMany({
      orderBy: { orden: 'asc' }
    });

    // Si no hay categorías en la DB, crear las predeterminadas
    if (categories.length === 0) {
      await Promise.all(
        DEFAULT_CATEGORIES.map(cat =>
          prisma.webCategoriaConfig.create({ data: cat })
        )
      );
      categories = await prisma.webCategoriaConfig.findMany({
        orderBy: { orden: 'asc' }
      });
    }

    // Si es petición pública (no admin), solo retornar las visibles
    if (!isAdmin) {
      categories = categories.filter(c => c.visible);
    }

    return NextResponse.json({ success: true, categories });
  } catch (error) {
    console.error('[Admin Categories GET] ERROR:', error);
    return NextResponse.json({ error: 'Error al obtener categorías', details: error.message }, { status: 500 });
  }
}

// POST: Actualizar visibilidad de categorías
export async function POST(request) {
  try {
    const token = request.headers.get('Authorization');
    if (!token || !token.startsWith('Bearer gloss-admin-')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { categories } = await request.json();

    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: 'Se espera un array de categorías' }, { status: 400 });
    }

    // Actualizar cada categoría
    const updates = await Promise.all(
      categories.map(cat =>
        prisma.webCategoriaConfig.upsert({
          where: { categoria: cat.categoria },
          update: { visible: cat.visible, orden: cat.orden ?? 0 },
          create: { categoria: cat.categoria, visible: cat.visible, orden: cat.orden ?? 0 }
        })
      )
    );

    console.log(`[Admin Categories POST] Actualizadas ${updates.length} categorías`);

    return NextResponse.json({ success: true, categories: updates });
  } catch (error) {
    console.error('[Admin Categories POST] ERROR:', error);
    return NextResponse.json({ error: 'Error al actualizar categorías', details: error.message }, { status: 500 });
  }
}
