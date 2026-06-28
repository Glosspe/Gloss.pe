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
    const { products } = body;

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

    return NextResponse.json({ 
      success: true, 
      message: `Sincronizados ${products.length} productos correctamente en la base de datos de la nube.` 
    });

  } catch (error) {
    console.error('[API Catalog Sync] Error crítico de sincronización:', error);
    return NextResponse.json({ error: 'Error interno de sincronización', details: error.message }, { status: 500 });
  }
}
