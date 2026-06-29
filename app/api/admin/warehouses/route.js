import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getErpConnection } from '@/lib/db';
import { verifyAdminRequest } from '@/lib/auth';

// Almacenes por defecto como fallback en caso de que la DB ERP no esté accesible
const FALLBACK_ALMACENES = [
  { codalm: '01', nomalm: 'GLOSS ALFONSO HUGARTE 1339', visible: true },
  { codalm: '02', nomalm: 'GLOSS ARICA 870', visible: true },
  { codalm: '03', nomalm: 'ALMACEN ABASTECEDOR', visible: false },
  { codalm: '04', nomalm: 'GLOSS BALTA 1362', visible: true },
  { codalm: '05', nomalm: 'JAEN MESONES MURO', visible: true },
  { codalm: '06', nomalm: 'GLOSS ARICA 1114', visible: true }
];

// Fallback de regiones y direcciones por almacén si la DB ERP no está disponible
const WAREHOUSE_FALLBACK_INFO = {
  '01': { region: 'CHICLAYO', direccion: 'AV. ALFONSO UGARTE 1339' },
  '02': { region: 'CHICLAYO', direccion: 'CALLE ARICA 870' },
  '03': { region: 'CHICLAYO', direccion: 'ALMACEN ABASTECEDOR' },
  '04': { region: 'CHICLAYO', direccion: 'AV. JOSE BALTA NRO. 1362 CERCADO DE CHICLAYO' },
  '05': { region: 'JAÉN', direccion: 'AV. MESONES MURO NRO. 180 SEC. MORRO S.' },
  '06': { region: 'CHICLAYO', direccion: 'CALLE ARICA 1114' }
};

// GET: Obtener todas las sedes con su estado de visibilidad/activación, región y dirección
export async function GET(request) {
  try {
    // Validar token de administrador usando JWT criptográfico
    const admin = await verifyAdminRequest(request);
    const isAdmin = !!admin;

    // Consultar PostgreSQL
    let dbWarehouses = await prisma.webAlmacenConfig.findMany({
      orderBy: { codalm: 'asc' }
    });

    // Si no es petición de administrador, retornamos de inmediato basándonos en Postgres y el Fallback en memoria (cero impacto/timeouts con el ERP)
    if (!isAdmin) {
      console.log('[Admin Warehouses API] Petición pública. Devolviendo sedes desde base de datos local y fallback de memoria.');
      const publicWarehouses = dbWarehouses
        .filter(w => w.visible)
        .map(w => {
          const info = WAREHOUSE_FALLBACK_INFO[w.codalm] || { region: 'CHICLAYO', direccion: '' };
          return {
            id: w.id,
            codalm: w.codalm,
            nomalm: w.nomalm,
            visible: w.visible,
            region: info.region,
            direccion: info.direccion
          };
        });
      return NextResponse.json({ success: true, warehouses: publicWarehouses });
    }

    // Si es petición de administrador y está vacía la tabla, poblar
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
            visible: alm.codalm !== '03'
          }));
        }
      } catch (erpErr) {
        console.warn('[Admin Warehouses API] ERP no accesible para seed, usando fallback local:', erpErr.message);
      }

      const sourceList = erpWarehouses.length > 0 ? erpWarehouses : FALLBACK_ALMACENES;

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

      dbWarehouses = await prisma.webAlmacenConfig.findMany({
        orderBy: { codalm: 'asc' }
      });
    }

    // Enriquecer almacenes con regiones y direcciones para el administrador usando la info local
    // (Retirar llamada síncrona al ERP para evitar timeouts y esperas de 15 segundos en el panel administrador)
    let enrichedWarehouses = dbWarehouses.map(w => {
      const info = WAREHOUSE_FALLBACK_INFO[w.codalm] || { region: 'CHICLAYO', direccion: '' };
      return {
        id: w.id,
        codalm: w.codalm,
        nomalm: w.nomalm,
        visible: w.visible,
        region: info.region,
        direccion: info.direccion
      };
    });

    // Si es petición pública (no admin), solo retornar las que están visibles
    if (!isAdmin) {
      enrichedWarehouses = enrichedWarehouses.filter(w => w.visible);
    }

    return NextResponse.json({ success: true, warehouses: enrichedWarehouses });
  } catch (error) {
    console.error('[Admin Warehouses GET] ERROR:', error);
    return NextResponse.json({ error: 'Error al obtener almacenes', details: error.message }, { status: 500 });
  }
}

// POST: Actualizar visibilidad de sedes
export async function POST(request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado. Se requiere token de administrador válido.' }, { status: 401 });
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
