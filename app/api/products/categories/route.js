import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Modo Proxy: Si la variable de entorno LOCAL_API_URL está presente,
    // redirige la petición a la API local a través de ngrok/tunnel.
    const localApiUrl = process.env.LOCAL_API_URL;

    if (localApiUrl) {
      try {
        const cleanApiUrl = localApiUrl.replace(/\/$/, '');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s max para proxy

        const res = await fetch(`${cleanApiUrl}/api/products/categories`, {
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          next: { revalidate: 300 }
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        }
      } catch (proxyErr) {
        console.warn('[API Categories - PROXY] Proxy no disponible, usando fallback PostgreSQL:', proxyErr.message);
      }
    }

    // --- INTENTO DIRECTO AL ERP (solo si NO estamos en modo proxy) ---
    // Si estamos en modo proxy y falló, NO intentamos ERP directo (tomaría 90s en timeout).
    // En su lugar, vamos directo al fallback de PostgreSQL.
    let erpCategories = null;

    if (!localApiUrl) {
      try {
        const pool = await getErpConnection();

        // Estrategia 1: Subfamilias marcadas para POS/Web (restpos = 'S' o '1')
        let result = await pool.request().query(`
          SELECT DISTINCT 
            LTRIM(RTRIM(codsub)) as id, 
            LTRIM(RTRIM(nomsub)) as name 
          FROM tbl01sbf 
          WHERE LTRIM(RTRIM(CAST(restpos AS VARCHAR))) IN ('S', '1')
          ORDER BY name ASC
        `);

        // Estrategia 2 (fallback): Todas las subfamilias que tengan productos activos
        if (result.recordset.length === 0) {
          result = await pool.request().query(`
            SELECT DISTINCT 
              LTRIM(RTRIM(s.codsub)) as id, 
              LTRIM(RTRIM(s.nomsub)) as name 
            FROM tbl01sbf s
            INNER JOIN prd0101 p ON LTRIM(RTRIM(s.codsub)) = LEFT(p.codi, 2) + '-' + LTRIM(RTRIM(p.codcat))
            WHERE p.estado = 1
            ORDER BY name ASC
          `);
        }

        if (result.recordset.length > 0) {
          erpCategories = result.recordset;
        }
      } catch (dbErr) {
        console.warn('[API Categories] ERP no accesible:', dbErr.message);
      }
    }

    // Si obtuvimos categorías del ERP, cruzar con PostgreSQL para visibilidad
    if (erpCategories && erpCategories.length > 0) {
      let visibleCategories = erpCategories;
      try {
        const catConfigs = await prisma.webCategoriaConfig.findMany();
        if (catConfigs.length > 0) {
          const configMap = {};
          catConfigs.forEach(c => { configMap[c.categoria] = c; });

          visibleCategories = erpCategories.filter(cat => {
            const config = configMap[cat.id] || configMap[cat.name];
            if (!config) return true;
            return config.visible !== false;
          });

          visibleCategories.sort((a, b) => {
            const orderA = (configMap[a.id] || configMap[a.name])?.orden ?? 999;
            const orderB = (configMap[b.id] || configMap[b.name])?.orden ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
          });
        }
      } catch (pgErr) {
        console.warn('[API Categories] PostgreSQL no accesible para visibilidad:', pgErr.message);
      }

      return NextResponse.json(visibleCategories);
    }

    // --- FALLBACK: Usar categorías de PostgreSQL (mismo origen que el admin) ---
    // Esto garantiza respuesta instantánea en Railway cuando el ERP no está accesible.
    console.log('[API Categories] Usando categorías de PostgreSQL como fallback');
    try {
      let pgCategories = await prisma.webCategoriaConfig.findMany({
        where: { visible: true },
        orderBy: { orden: 'asc' }
      });

      // Formatear al mismo shape que las categorías del ERP: { id, name }
      const formatted = pgCategories.map(c => ({
        id: c.categoria,
        name: c.categoria
      }));

      if (formatted.length > 0) {
        return NextResponse.json(formatted);
      }
    } catch (pgErr) {
      console.warn('[API Categories] PostgreSQL fallback también falló:', pgErr.message);
    }

    // Último recurso: categorías hardcodeadas
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
