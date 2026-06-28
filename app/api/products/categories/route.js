import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    console.log('[API Categories] Consultando categorías en PostgreSQL...');

    // 1. Intentar obtener las categorías configuradas por el administrador en WebCategoriaConfig
    try {
      const pgCategories = await prisma.webCategoriaConfig.findMany({
        where: { visible: true },
        orderBy: { orden: 'asc' }
      });

      if (pgCategories.length > 0) {
        const formatted = pgCategories.map(c => ({
          id: c.categoria,
          name: c.categoria
        }));
        console.log(`[API Categories] Retornando ${formatted.length} categorías de web_categorias_config.`);
        return NextResponse.json(formatted);
      }
    } catch (pgErr) {
      console.warn('[API Categories] Error leyendo web_categorias_config:', pgErr.message);
    }

    // 2. Fallback: Extraer las categorías planas de la clave 'CATEGORIES_TREE' en WebGlobalConfig
    try {
      const treeConfig = await prisma.webGlobalConfig.findUnique({
        where: { clave: 'CATEGORIES_TREE' }
      });

      if (treeConfig && treeConfig.valor) {
        const categoriesTree = JSON.parse(treeConfig.valor);
        if (Array.isArray(categoriesTree) && categoriesTree.length > 0) {
          // Extraer todas las subcategorías de las familias
          const flatCategoriesMap = new Map();
          categoriesTree.forEach(fam => {
            if (fam.subcategories && Array.isArray(fam.subcategories)) {
              fam.subcategories.forEach(sub => {
                if (sub.name) {
                  const cleanedName = sub.name.trim();
                  flatCategoriesMap.set(cleanedName, {
                    id: cleanedName,
                    name: cleanedName
                  });
                }
              });
            }
          });

          const derivedList = Array.from(flatCategoriesMap.values())
            .sort((a, b) => a.name.localeCompare(b.name));

          if (derivedList.length > 0) {
            console.log(`[API Categories] Retornando ${derivedList.length} categorías derivadas de CATEGORIES_TREE.`);
            return NextResponse.json(derivedList);
          }
        }
      }
    } catch (treeErr) {
      console.warn('[API Categories] Error derivando de CATEGORIES_TREE:', treeErr.message);
    }

    // 3. Fallback dinámico secundario: Agrupar directamente desde productos en base de datos
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
        const formatted = distinctCategories
          .map(c => ({ id: c.categoria.trim(), name: c.categoria.trim() }))
          .filter(c => c.name !== '' && c.name !== 'Otros')
          .sort((a, b) => a.name.localeCompare(b.name));

        if (formatted.length > 0) {
          console.log(`[API Categories] Retornando ${formatted.length} categorías leídas dinámicamente de productos.`);
          return NextResponse.json(formatted);
        }
      }
    } catch (dynErr) {
      console.warn('[API Categories] Error en consulta dinámica de categorías:', dynErr.message);
    }

    // 4. Hardcoded de emergencia
    console.log('[API Categories] Usando fallback mock de categorías de emergencia');
    return NextResponse.json([
      { id: 'UÑAS', name: 'UÑAS' },
      { id: 'PESTAÑAS', name: 'PESTAÑAS' },
      { id: 'DECOLORADOR', name: 'DECOLORADOR' },
      { id: 'ACCESORIOS', name: 'ACCESORIOS' },
      { id: 'HIDRATANTE', name: 'HIDRATANTE' },
    ]);

  } catch (error) {
    console.error('[API Categories] ERROR CRÍTICO:', error);
    return NextResponse.json(
      { error: 'Error al obtener categorías', details: error.message },
      { status: 500 }
    );
  }
}
