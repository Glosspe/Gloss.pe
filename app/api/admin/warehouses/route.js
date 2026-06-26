import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getErpConnection } from '@/lib/db';

// Almacenes por defecto como fallback en caso de que la DB ERP no esté accesible
const FALLBACK_ALMACENES = [
  { codalm: '01', nomalm: 'GLOSS ALFONSO HUGARTE 1339', visible: true },
  { codalm: '02', nomalm: 'GLOSS ARICA 870', visible: true },
  { codalm: '03', nomalm: 'ALMACEN ABASTECEDOR', visible: false },
  { codalm: '04', nomalm: 'GLOSS BALTA 1362', visible: true },
  { codalm: '05', nomalm: 'JAEN MESONES MURO', visible: true },
  { codalm: '06', nomalm: 'GLOSS ARICA 1114', visible: true }
];

// GET: Obtener todas las sedes con su estado de visibilidad/activación
export async function GET(request) {
  try {
    // Validar token de administrador
    const token = request.headers.get('Authorization');
    const isAdmin = token && token.startsWith('Bearer gloss-admin-');

    // Consultar PostgreSQL
    let dbWarehouses = await prisma.webAlmacenConfig.findMany({
      orderBy: { codalm: 'asc' }
    });

    // Si no hay sedes en Postgres, intentamos poblar desde el ERP o fallback
    if (dbWarehouses.length === 0) {
      console.log('[Admin Warehouses API] Base de datos vacía. Población inicial...');
      let erpWarehouses = [];

      try {
        const pool = await getErpConnection();
        const erpResult = await pool.request().query(
          "SELECT RTRIM(codalm) as codalm, RTRIM(nomalm) as nomalm FROM tbl01alm ORDER BY codalm ASC"
        );
        
        if (erpResult.recordset.length > 0) {
          erpWarehouses = erpResult.recordset.map(alm => ({
            codalm: alm.codalm,
            nomalm: alm.nomalm,
            visible: alm.codalm !== '03' // Deshabilitamos el almacén abastecedor por defecto
          }));
          console.log('[Admin Warehouses API] Sedes cargadas exitosamente del ERP:', erpWarehouses.length);
        }
      } catch (erpErr) {
        console.warn('[Admin Warehouses API] ERP no accesible para seed, usando fallback local:', erpErr.message);
      }

      // Si no pudimos cargar del ERP, usamos el fallback
      const sourceList = erpWarehouses.length > 0 ? erpWarehouses : FALLBACK_ALMACENES;

      // Guardar en Postgres
      await Promise.all(
        sourceList.map(alm =>
          prisma.webAlmacenConfig.create({
            data: {
              codalm: alm.codalm,
              nomalm: alm.nomalm,
              visible: alm.visible
            }
          })
        )
      );

      // Recargar de Postgres
      dbWarehouses = await prisma.webAlmacenConfig.findMany({
        orderBy: { codalm: 'asc' }
      });
    }

    // Si es petición pública (no admin), solo retornar las que están visibles
    if (!isAdmin) {
      dbWarehouses = dbWarehouses.filter(w => w.visible);
    }

    return NextResponse.json({ success: true, warehouses: dbWarehouses });
  } catch (error) {
    console.error('[Admin Warehouses GET] ERROR:', error);
    return NextResponse.json({ error: 'Error al obtener almacenes', details: error.message }, { status: 500 });
  }
}

// POST: Actualizar visibilidad de sedes
export async function POST(request) {
  try {
    const token = request.headers.get('Authorization');
    if (!token || !token.startsWith('Bearer gloss-admin-')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { warehouses } = await request.json();

    if (!Array.isArray(warehouses)) {
      return NextResponse.json({ error: 'Se espera un array de almacenes' }, { status: 400 });
    }

    // Actualizar cada almacén en la base de datos
    const updates = await Promise.all(
      warehouses.map(alm =>
        prisma.webAlmacenConfig.upsert({
          where: { codalm: alm.codalm },
          update: { visible: alm.visible },
          create: { codalm: alm.codalm, nomalm: alm.nomalm, visible: alm.visible }
        })
      )
    );

    console.log(`[Admin Warehouses POST] Actualizadas ${updates.length} sedes`);

    return NextResponse.json({ success: true, warehouses: updates });
  } catch (error) {
    console.error('[Admin Warehouses POST] ERROR:', error);
    return NextResponse.json({ error: 'Error al actualizar almacenes', details: error.message }, { status: 500 });
  }
}
