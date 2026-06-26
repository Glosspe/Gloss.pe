import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';

// Categorías fallback si el ERP no está accesible
const FALLBACK_CATEGORIES = [
  { id: 'UÑAS', name: 'UÑAS' },
  { id: 'PESTAÑAS', name: 'PESTAÑAS' },
  { id: 'DECOLORADOR', name: 'DECOLORADOR' },
  { id: 'ACCESORIOS', name: 'ACCESORIOS' },
  { id: 'HIDRATANTE', name: 'HIDRATANTE' },
];

export async function GET() {
  try {
    // Modo Proxy: Si la variable de entorno LOCAL_API_URL está presente,
    // redirige la petición a la API local a través de ngrok/tunnel.
    const localApiUrl = process.env.LOCAL_API_URL;

    if (localApiUrl) {
      try {
        const cleanApiUrl = localApiUrl.replace(/\/$/, '');
        const res = await fetch(`${cleanApiUrl}/api/products/categories`, {
          headers: { 'Content-Type': 'application/json' },
          next: { revalidate: 300 } // Cachear categorías por 5 minutos
        });

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        }
      } catch (proxyErr) {
        console.error('[API Categories - PROXY] Error:', proxyErr.message);
      }
    }

    // --- MODO LOCAL / API SERVER ---
    let pool;
    let useFallback = false;

    try {
      pool = await getErpConnection();
    } catch (dbErr) {
      console.warn('[API Categories] ERP no accesible, usando fallback:', dbErr.message);
      useFallback = true;
    }

    let erpCategories = [];

    if (!useFallback) {
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

      erpCategories = result.recordset;
    } else {
      erpCategories = FALLBACK_CATEGORIES;
    }

    // Cruzar con PostgreSQL para respetar visibilidad configurada en el admin
    let visibleCategories = erpCategories;
    try {
      const catConfigs = await prisma.webCategoriaConfig.findMany();

      if (catConfigs.length > 0) {
        // Crear mapa de configuraciones: key puede ser codsub o nombre de categoría
        const configMap = {};
        catConfigs.forEach(c => {
          configMap[c.categoria] = c;
        });

        // Filtrar: si una categoría tiene config y está oculta, excluirla
        visibleCategories = erpCategories.filter(cat => {
          const configById = configMap[cat.id];
          const configByName = configMap[cat.name];
          const config = configById || configByName;

          // Si no tiene config, mostrarla por defecto
          if (!config) return true;
          return config.visible !== false;
        });

        // Ordenar por el campo 'orden' si existe configuración
        visibleCategories.sort((a, b) => {
          const orderA = (configMap[a.id] || configMap[a.name])?.orden ?? 999;
          const orderB = (configMap[b.id] || configMap[b.name])?.orden ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });
      }
    } catch (pgErr) {
      console.warn('[API Categories] PostgreSQL no accesible, mostrando todas:', pgErr.message);
    }

    return NextResponse.json(visibleCategories);

  } catch (error) {
    console.error('[API Categories] ERROR CRÍTICO:', error);
    return NextResponse.json(
      { error: 'Error al obtener categorías', details: error.message },
      { status: 500 }
    );
  }
}
