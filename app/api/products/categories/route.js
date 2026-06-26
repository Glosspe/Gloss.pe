import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Modo Proxy: Si la variable de entorno LOCAL_API_URL está presente,
    // redirige la petición a la API local a través de ngrok/tunnel.
    const localApiUrl = process.env.LOCAL_API_URL;

    if (localApiUrl) {
      const cleanApiUrl = localApiUrl.replace(/\/$/, '');

      // --- INTENTO 1: Proxy directo a /api/products/categories ---
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s max

        const res = await fetch(`${cleanApiUrl}/api/products/categories`, {
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          next: { revalidate: 300 }
        });
        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return NextResponse.json(data);
          }
        }
      } catch (proxyErr) {
        console.warn('[API Categories - PROXY] Proxy de categorías no disponible:', proxyErr.message);
      }

      // --- INTENTO 2: Derivar categorías desde el proxy de búsqueda ---
      // El proxy de búsqueda (search) SÍ funciona. Pedimos todos los productos
      // y extraemos las categorías únicas que realmente tienen productos.
      try {
        console.log('[API Categories] Derivando categorías desde proxy de búsqueda...');
        const searchRes = await fetch(`${cleanApiUrl}/api/products/search?category=Todos`, {
          headers: { 'Content-Type': 'application/json' },
          next: { revalidate: 300 }
        });

        if (searchRes.ok) {
          const products = await searchRes.json();
          if (Array.isArray(products) && products.length > 0) {
            // Extraer categorías únicas con conteo de productos
            const catCount = new Map();
            products.forEach(p => {
              const cat = p.category;
              if (cat && cat !== 'Trending' && cat !== 'Otros') {
                catCount.set(cat, (catCount.get(cat) || 0) + 1);
              }
            });

            // Ordenar por cantidad de productos (más populares primero)
            const derivedCategories = Array.from(catCount.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([name]) => ({ id: name, name }));

            if (derivedCategories.length > 0) {
              console.log(`[API Categories] Derivadas ${derivedCategories.length} categorías desde productos:`, derivedCategories.map(c => c.name).join(', '));
              
              // Cruzar con PostgreSQL para respetar visibilidad del admin
              try {
                const catConfigs = await prisma.webCategoriaConfig.findMany();
                if (catConfigs.length > 0) {
                  const configMap = {};
                  catConfigs.forEach(c => { configMap[c.categoria] = c; });

                  const filtered = derivedCategories.filter(cat => {
                    const config = configMap[cat.id] || configMap[cat.name];
                    if (!config) return true;
                    return config.visible !== false;
                  });

                  if (filtered.length > 0) {
                    return NextResponse.json(filtered);
                  }
                }
              } catch (pgErr) {
                console.warn('[API Categories] No se pudo cruzar con PostgreSQL:', pgErr.message);
              }

              return NextResponse.json(derivedCategories);
            }
          }
        }
      } catch (searchErr) {
        console.warn('[API Categories] Error derivando desde búsqueda:', searchErr.message);
      }
    }

    // --- MODO LOCAL (sin proxy): Consulta directa al ERP ---
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
            INNER JOIN prd0101 p ON LTRIM(RTRIM(s.codsub)) = LEFT(p.codi, 2) + '-' + SUBSTRING(p.codi, 3, 2)
            WHERE p.estado = 1
            ORDER BY name ASC
          `);
        }

        if (result.recordset.length > 0) {
          let visibleCategories = result.recordset;

          // Cruzar con PostgreSQL para respetar visibilidad
          try {
            const catConfigs = await prisma.webCategoriaConfig.findMany();
            if (catConfigs.length > 0) {
              const configMap = {};
              catConfigs.forEach(c => { configMap[c.categoria] = c; });

              visibleCategories = result.recordset.filter(cat => {
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
      } catch (dbErr) {
        console.warn('[API Categories] ERP no accesible:', dbErr.message);
      }
    }

    // --- ÚLTIMO FALLBACK: PostgreSQL ---
    console.log('[API Categories] Usando categorías de PostgreSQL como último fallback');
    try {
      const pgCategories = await prisma.webCategoriaConfig.findMany({
        where: { visible: true },
        orderBy: { orden: 'asc' }
      });

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

    // Hardcoded de emergencia
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
