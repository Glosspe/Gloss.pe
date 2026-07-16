import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request) {
  try {
    const syncToken = request.headers.get('X-Sync-Token');
    const secretToken = process.env.SYNC_SECRET_TOKEN || 'default-sync-token-12345';

    if (!syncToken || syncToken !== secretToken) {
      return NextResponse.json({ error: 'No autorizado. Token de sincronización inválido.' }, { status: 401 });
    }

    const body = await request.json();
    const { products, brands, categoriesTree } = body;

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: 'Formato inválido. Se requiere un array de productos.' }, { status: 400 });
    }

    console.log(`[API Catalog Sync] Recibido lote de ${products.length} productos para sincronizar. Procesando transacción en lote...`);

    const validProducts = products.filter(prod => prod.id && prod.id.trim() !== '');

    if (validProducts.length > 0) {
      const upsertOperations = validProducts.map(prod => {
        const codartClean = prod.id.trim();
        return prisma.webProductoImagen.upsert({
          where: { codart: codartClean },
          update: {
            nombre: prod.name?.trim() || null,
            marca: prod.brand?.trim() || null,
            categoria: prod.category?.trim() || null,
            codbar: prod.barcode?.trim() || null,
            precio: parseFloat(prod.price || 0),
            stock: parseFloat(prod.stock || 0),
            hasEquivalents: !!prod.hasEquivalents,
            equivalentes: prod.equivalents ? JSON.stringify(prod.equivalents) : '[]',
            sincronizadoEn: new Date()
          },
          create: {
            codart: codartClean,
            nombre: prod.name?.trim() || null,
            marca: prod.brand?.trim() || null,
            categoria: prod.category?.trim() || null,
            codbar: prod.barcode?.trim() || null,
            precio: parseFloat(prod.price || 0),
            stock: parseFloat(prod.stock || 0),
            hasEquivalents: !!prod.hasEquivalents,
            equivalentes: prod.equivalents ? JSON.stringify(prod.equivalents) : '[]',
            imagenes: '[]',
            descripcionEnriquecida: null,
            destacado: false,
            visible: true,
            sincronizadoEn: new Date()
          }
        });
      });

      await prisma.$transaction(upsertOperations);
    }

    // Si vienen marcas en el payload (primer lote), las guardamos en web_global_config
    if (brands && Array.isArray(brands)) {
      console.log(`[API Catalog Sync] Guardando lista de ${brands.length} marcas en base de datos...`);
      await prisma.webGlobalConfig.upsert({
        where: { clave: 'BRANDS_LIST' },
        update: { valor: JSON.stringify(brands) },
        create: { clave: 'BRANDS_LIST', valor: JSON.stringify(brands) }
      });
    }

    // Si viene el árbol de categorías en el payload (primer lote), lo guardamos en web_global_config
    if (categoriesTree && Array.isArray(categoriesTree)) {
      console.log(`[API Catalog Sync] Guardando árbol de categorías en base de datos...`);
      await prisma.webGlobalConfig.upsert({
        where: { clave: 'CATEGORIES_TREE' },
        update: { valor: JSON.stringify(categoriesTree) },
        create: { clave: 'CATEGORIES_TREE', valor: JSON.stringify(categoriesTree) }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sincronizados ${products.length} productos correctamente en la base de datos de la nube.` 
    });

  } catch (error) {
    console.error('[API Catalog Sync] Error crítico de sincronización:', error);
    return NextResponse.json({ error: 'Error interno de sincronización', details: error.message }, { status: 500 });
  }
}
