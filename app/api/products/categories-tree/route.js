import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import cache from '@/lib/cache';

export async function GET() {
  try {
    const cacheKey = 'categories-tree';
    
    // 1. Intentar servir desde el caché en memoria
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      console.log('[API Categories Tree] Sirviendo desde caché.');
      return NextResponse.json(cachedData);
    }

    // 2. Intentar cargar el árbol jerárquico guardado en PostgreSQL
    console.log('[API Categories Tree] Consultando árbol en PostgreSQL...');
    try {
      const treeConfig = await prisma.webGlobalConfig.findUnique({
        where: { clave: 'CATEGORIES_TREE' }
      });

      if (treeConfig && treeConfig.valor) {
        const categoriesTree = JSON.parse(treeConfig.valor);
        if (Array.isArray(categoriesTree) && categoriesTree.length > 0) {
          console.log(`[API Categories Tree] Retornando árbol de categorías leído de base de datos.`);
          await cache.set(cacheKey, categoriesTree, 300); // Guardar en caché por 5 minutos
          return NextResponse.json(categoriesTree);
        }
      }
    } catch (pgErr) {
      console.warn('[API Categories Tree] Error leyendo CATEGORIES_TREE de PostgreSQL:', pgErr.message);
    }

    // 3. Fallback dinámico: Generar árbol plano desde productos sincronizados en base de datos
    try {
      const distinctCategories = await prisma.webProductoImagen.findMany({
        select: { categoria: true },
        where: {
          visible: true,
          categoria: { not: null }
        },
        distinct: ['categoria']
      });

      if (distinctCategories.length > 0) {
        const subcategories = distinctCategories
          .map(c => c.categoria.trim())
          .filter(c => c !== '' && c !== 'Otros')
          .map(c => ({ id: `05-${c.substring(0,2).toUpperCase()}`, name: c }));

        const flatTree = [
          {
            id: 'CATALOGO',
            name: 'CATÁLOGO',
            subcategories: subcategories
          }
        ];

        console.log('[API Categories Tree] Retornando árbol de categorías generado dinámicamente.');
        await cache.set(cacheKey, flatTree, 180);
        return NextResponse.json(flatTree);
      }
    } catch (dynErr) {
      console.warn('[API Categories Tree] Error en generación dinámica:', dynErr.message);
    }

    // 4. Fallback Mock de emergencia de último nivel
    console.log('[API Categories Tree] Usando fallback mock de categorías de emergencia');
    const mockTree = [
      {
        id: '05',
        name: 'CABELLO',
        subcategories: [
          { id: '05-01', name: 'SHAMPOO' },
          { id: '05-02', name: 'ACONDICIONADOR' },
          { id: '05-05', name: 'MASCARILLAS' }
        ]
      },
      {
        id: '04',
        name: 'ROSTRO',
        subcategories: [
          { id: '04-01', name: 'COSMETICOS' },
          { id: '04-04', name: 'HIDRATACION' }
        ]
      },
      {
        id: '06',
        name: 'CUERPO',
        subcategories: [
          { id: '06-03', name: 'CREMAS' }
        ]
      }
    ];

    await cache.set(cacheKey, mockTree, 60);
    return NextResponse.json(mockTree);

  } catch (error) {
    console.error('[API Categories Tree] ERROR CRÍTICO:', error);
    return NextResponse.json(
      { error: 'Error al obtener árbol de categorías', details: error.message },
      { status: 500 }
    );
  }
}
