import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';
import { MOCK_PRODUCTS } from '@/lib/mocks';
import sql from 'mssql';
import { getStockColumnName, getStockTableName } from '@/lib/erp-utils';
import cache from '@/lib/cache';

// Helper para retornar el nombre de categoría web del producto (nombre de subfamilia del ERP)
export function mapSubfamilyToWebCategory(codsub, categoryName) {
  if (categoryName) return categoryName.trim();
  return 'Otros';
}

// Helper para formatear nombres de productos del ERP (todo mayúsculas a formato premium de mayúsculas y minúsculas)
export function formatProductName(name) {
  if (!name) return '';
  
  const cleaned = name.trim().replace(/\s+/g, ' ');
  const lower = cleaned.toLowerCase();
  const words = lower.split(' ');
  const connectors = ['de', 'con', 'y', 'el', 'la', 'para', 'en', 'al', 'del', 'los', 'las', 'un', 'una'];
  const uppercaseUnits = ['ml', 'gr', 'kg', 'fps', 'uv', '3d', 'pz', 'pza', 'pzas'];
  
  const formattedWords = words.map((word, index) => {
    if (!word) return '';
    
    // Conectores en minúsculas (a menos que sea la primera palabra)
    if (connectors.includes(word) && index !== 0) {
      return word;
    }
    
    // Unidades de medida en mayúsculas
    if (uppercaseUnits.includes(word)) {
      return word.toUpperCase();
    }
    
    // Números compuestos con unidades (ej: 30ml -> 30ML, fps50 -> 50FPS)
    if (/^\d+(ml|gr|g|kg|oz|pz|pza|pzas|fps)$/i.test(word)) {
      const numberPart = word.match(/^\d+/)[0];
      const unitPart = word.match(/[a-z]+$/i)[0].toUpperCase();
      return numberPart + unitPart;
    }
    
    // Guiones (ej: anti-arrugas -> Anti-Arrugas)
    if (word.includes('-')) {
      return word.split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-');
    }
    
    // Capitalizar por defecto
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  
  return formattedWords.join(' ');
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || 'Trending';
    const brand = searchParams.get('brand') || '';
    const warehouse = searchParams.get('warehouse') || '';
    const limitParam = searchParams.get('limit') || '';
    const includeHidden = searchParams.get('includeHidden') === 'true';
    
    let topLimit = 100;
    if (limitParam === 'all') {
      topLimit = 15000;
    } else if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        topLimit = Math.min(parsed, 15000);
      }
    }
    
    // 1. Intentar servir desde el caché en memoria (asíncronamente)
    const cacheKey = `search-${query}-${category}-${brand}-${warehouse || 'all'}-${topLimit}-${includeHidden}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      console.log(`[API Products Search] Sirviendo desde caché para: ${cacheKey}`);
      return NextResponse.json(cachedData);
    }

    // Calcular el TTL dinámico para maximizar el aprovechamiento de Redis
    let cacheTtl = 15; // 15 segundos por defecto para búsquedas de texto dinámicas (q)
    if (query.trim() === '') {
      if (category === 'Trending') {
        cacheTtl = 180; // 3 minutos para productos destacados de la Home
      } else if (category && category !== 'Todos') {
        cacheTtl = 60; // 1 minuto para categorías fijas
      } else {
        cacheTtl = 45; // 45 segundos para el catálogo completo sin búsquedas
      }
    }

    // Modo Proxy: Si la variable de entorno LOCAL_API_URL está presente, la nube (Railway)
    // redirige la petición a la API local que corre en la PC del usuario a través de ngrok.
    const localApiUrl = process.env.LOCAL_API_URL;
    
    if (localApiUrl) {
      console.log(`[API Products Search - PROXY MODE] Redirigiendo a: ${localApiUrl}/api/products/search?warehouse=${warehouse}`);
      try {
        const cleanApiUrl = localApiUrl.replace(/\/$/, ''); // Quitar barra diagonal al final si existe
        const targetUrl = `${cleanApiUrl}/api/products/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&brand=${encodeURIComponent(brand)}&warehouse=${encodeURIComponent(warehouse)}&limit=${encodeURIComponent(limitParam)}&includeHidden=${includeHidden}`;
        
        const res = await fetch(targetUrl, {
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        });
        
        if (res.ok) {
          const data = await res.json();
          // Guardar en caché de la nube usando el TTL dinámico optimizado
          await cache.set(cacheKey, data, cacheTtl);
          return NextResponse.json(data);
        } else {
          console.warn(`[API Products Search - PROXY MODE] La API local retornó status ${res.status}.`);
          return NextResponse.json(
            { error: 'El almacén central no está disponible en este momento', erpUnavailable: true },
            { status: 503 }
          );
        }
      } catch (proxyErr) {
        console.error(`[API Products Search - PROXY MODE] Error conectando a la API local de ngrok:`, proxyErr.message);
        return NextResponse.json(
          { error: 'El almacén central no está disponible en este momento', erpUnavailable: true },
          { status: 503 }
        );
      }
    }

    // --- MODO LOCAL / API SERVER ---
    // Si LOCAL_API_URL no está definida, procesamos directamente contra la DB ERP local.
    console.log(`[API Products Search - LOCAL MODE] Executing query on local database...`);

    let pool;
    try {
      pool = await getErpConnection();
    } catch (dbErr) {
      console.warn('[API Products Search - LOCAL MODE] ERP no accesible:', dbErr.message);
      return NextResponse.json(
        { error: 'La base de datos del almacén no está accesible en este momento', erpUnavailable: true },
        { status: 503 }
      );
    }

    let useFallback = false; // Mantenido por compatibilidad de tipos en la compilación
    let productsList = [];

    // Consultar directo a la base de datos Navasoft por ZeroTier
    // 1. Obtener los códigos destacados de Postgres si la pestaña es Trending
    let featuredCodes = [];
    let topCodes = []; // Códigos de más vendidos (Trending) del ERP
    if (category === 'Trending') {
      try {
        const featuredConfigs = await prisma.webProductoImagen.findMany({
          where: { destacado: true },
          select: { codart: true }
        });
        featuredCodes = featuredConfigs.map(c => c.codart);
      } catch (pgErr) {
        console.warn('[API Products Search] Error fetching featured codes from Postgres:', pgErr.message);
      }
    }

    // Obtener las sedes activas desde Postgres
    let activeWarehouses = [];
    try {
      const dbAlmacenes = await prisma.webAlmacenConfig.findMany({
        where: { visible: true }
      });
      activeWarehouses = dbAlmacenes.map(a => a.codalm);
    } catch (err) {
      console.warn('[API Products Search] Error fetching active warehouses from Postgres, falling back to 01:', err.message);
    }

    // Si por alguna razón no hay almacenes activos configurados, usar por defecto '01'
    if (activeWarehouses.length === 0) {
      activeWarehouses = ['01'];
    }

    // Si el cliente solicita filtrar por un almacén o región específica
    const warehouseParam = request.nextUrl.searchParams.get('warehouse');
    if (warehouseParam && warehouseParam !== 'all' && warehouseParam !== 'null') {
      const cleanParam = warehouseParam.trim();
      // Verificar si es un almacén activo directo
      if (activeWarehouses.includes(cleanParam)) {
        activeWarehouses = [cleanParam];
      } else {
        // Si el parámetro corresponde a una región
        const WAREHOUSE_REGIONS = {
          'CHICLAYO': ['01', '02', '04', '06'],
          'JAÉN': ['05'],
          'JAEN': ['05']
        };
        const targetRegion = cleanParam.toUpperCase();
        if (WAREHOUSE_REGIONS[targetRegion]) {
          // Filtrar para quedarse solo con los almacenes activos de esa región
          activeWarehouses = activeWarehouses.filter(wh => WAREHOUSE_REGIONS[targetRegion].includes(wh));
        }
      }
      
      // Si después de filtrar la región no quedaron almacenes, forzar fallback
      if (activeWarehouses.length === 0) {
        activeWarehouses = ['01'];
      }
    }

    // Construir la consulta SQL dinámica para consolidar el stock de las sedes activas
    let selectStockParts = [];
    let joinParts = [];

    activeWarehouses.forEach(wh => {
      const alias = `p${wh}`;
      if (wh === '01') {
        selectStockParts.push(`ISNULL(p01.stoc, 0)`);
      } else {
        selectStockParts.push(`ISNULL(${alias}.stoc, 0)`);
        joinParts.push(`LEFT JOIN prd01${wh} ${alias} WITH(nolock) ON p01.codi = ${alias}.codi`);
      }
    });

    const stockExpression = `(${selectStockParts.join(' + ')})`;
    const joinsSql = joinParts.join('\n          ');

    const sqlRequest = pool.request();
    
    let brandFilter = "";
    if (brand && brand.trim() !== '') {
      sqlRequest.input('brandFilterName', sql.VarChar, brand);
      brandFilter = ` AND LTRIM(RTRIM(p01.marc)) = @brandFilterName`;
    }
    
    let queryFilter = "";
    if (query.trim() !== '') {
      // Separar el término de búsqueda por palabras individuales para un buscador inteligente
      const words = query.trim().split(/\s+/).filter(w => w.length > 0);
      if (words.length > 0) {
        let conditions = [];
        words.forEach((word, idx) => {
          const paramName = `searchWord_${idx}`;
          // Forzar a mayúsculas y envolver en comodines %
          sqlRequest.input(paramName, sql.VarChar, `%${word.toUpperCase()}%`);
          // Aplicar UPPER en la consulta SQL para garantizar case-insensitivity absoluto en cualquier colación
          conditions.push(`(UPPER(p01.descr) LIKE @${paramName} OR UPPER(p01.codi) LIKE @${paramName} OR UPPER(p01.codf) LIKE @${paramName} OR UPPER(p01.marc) LIKE @${paramName})`);
        });
        queryFilter = ` AND ` + conditions.join(' AND ');
      }
    }

    let categoryFilter = "";
    if (category === 'Trending') {
      if (query.trim() !== '') {
        categoryFilter = "";
      } else {
        // Consultar dinámicamente los productos más vendidos en el ERP en los últimos 90 días
        // Balanceando la landing: 10 productos de Bajo Precio (< S/ 15) y 10 de Alto Precio (>= S/ 15)
        try {
          const topSalesRequest = pool.request();
          const targetWarehouse = activeWarehouses.length === 1 ? activeWarehouses[0] : '';
          
          let warehouseFilter = "";
          if (targetWarehouse) {
            topSalesRequest.input('topSalesWarehouse', sql.VarChar, targetWarehouse);
            warehouseFilter = ` AND d.Codalm = @topSalesWarehouse`;
          }
          
          const topSalesQuery = `
            SELECT id, tier, unidades_vendidas FROM (
              SELECT TOP 10 
                RTRIM(d.codi) as id,
                'LOW' as tier,
                SUM(d.cant) as unidades_vendidas
              FROM dtl01fac d WITH(nolock)
              INNER JOIN prd0101 p01 WITH(nolock) ON p01.codi = d.codi
              WHERE d.fecha >= DATEADD(day, -90, GETDATE())
                AND p01.estado = 1
                AND p01.pvns < 15
                AND d.cdocu IN ('01', '03', '65') -- Filtrar estrictamente por Facturas, Boletas y Notas de Venta (excluye traslados logísticos y devoluciones)
                ${warehouseFilter}
              GROUP BY d.codi
              ORDER BY unidades_vendidas DESC
            ) lowTier
            
            UNION ALL
            
            SELECT id, tier, unidades_vendidas FROM (
              SELECT TOP 10 
                RTRIM(d.codi) as id,
                'HIGH' as tier,
                SUM(d.cant) as unidades_vendidas
              FROM dtl01fac d WITH(nolock)
              INNER JOIN prd0101 p01 WITH(nolock) ON p01.codi = d.codi
              WHERE d.fecha >= DATEADD(day, -90, GETDATE())
                AND p01.estado = 1
                AND p01.pvns >= 15
                AND d.cdocu IN ('01', '03', '65') -- Filtrar estrictamente por Facturas, Boletas y Notas de Venta (excluye traslados logísticos y devoluciones)
                ${warehouseFilter}
              GROUP BY d.codi
              ORDER BY unidades_vendidas DESC
            ) highTier
          `;
          
          const topSalesResult = await topSalesRequest.query(topSalesQuery);
          const records = topSalesResult.recordset;
          
          const lowTier = records.filter(r => r.tier === 'LOW').map(r => r.id);
          const highTier = records.filter(r => r.tier === 'HIGH').map(r => r.id);
          
          // Entrelazar alternadamente: [high[0], low[0], high[1], low[1]...]
          const maxLen = Math.max(lowTier.length, highTier.length);
          topCodes = [];
          for (let i = 0; i < maxLen; i++) {
            if (i < highTier.length) topCodes.push(highTier[i]);
            if (i < lowTier.length) topCodes.push(lowTier[i]);
          }
          
          console.log(`[API Products Search - MAS VENDIDOS] Sede: ${targetWarehouse || 'GLOBAL'}. Balanceados del ERP (Alto: ${highTier.length}, Bajo: ${lowTier.length})`);
        } catch (errTopSales) {
          console.error('[API Products Search - MAS VENDIDOS] Error consultando más vendidos del ERP:', errTopSales.message);
        }

        // Si obtuvimos más vendidos del ERP, los usamos
        if (topCodes.length > 0) {
          categoryFilter = ` AND p01.codi IN (${topCodes.map(c => `'${c}'`).join(',')})`;
        } else if (featuredCodes.length > 0) {
          // Fallback a los destacados de Postgres si el ERP no tiene registros de ventas o falla la consulta
          categoryFilter = ` AND p01.codi IN (${featuredCodes.map(c => `'${c}'`).join(',')})`;
        } else {
          // Si no hay nada, no retornar nada
          categoryFilter = ` AND 1 = 0`;
        }
      }
    } else if (category && category !== 'Todos') {
      if (category.startsWith('#')) {
        // Filtrar por etiqueta de preocupación/necesidad de PostgreSQL
        let tagCodes = [];
        try {
          const dbTag = await prisma.webProductTag.findUnique({
            where: { etiqueta: category.trim() }
          });
          if (dbTag && dbTag.productos) {
            tagCodes = JSON.parse(dbTag.productos);
          }
        } catch (e) {
          console.warn('[API Products Search] Error consultando códigos de tag:', e.message);
        }

        if (tagCodes.length > 0) {
          categoryFilter = ` AND p01.codi IN (${tagCodes.map(c => `'${c}'`).join(',')})`;
        } else {
          categoryFilter = ` AND 1 = 0`; // Forzar respuesta vacía si no hay productos
        }
      } else if (category.startsWith('FAM:')) {
        // Filter by entire family (e.g., FAM:05 = all products in CABELLO)
        const familyCode = category.replace('FAM:', '');
        sqlRequest.input('familyCode', sql.VarChar, familyCode);
        categoryFilter = ` AND p01.codi LIKE @familyCode + '%'`;
      } else if (/^\d{2}-\d{2,}$/.test(category)) {
        // Filtrar por codsub (mismo patrón que el POS Syscom.click)
        // Optimizamos de SUBSTRING a un prefijo LIKE sargable
        const family = category.split('-')[0];
        const sub = category.split('-')[1];
        sqlRequest.input('subfamilyPrefix', sql.VarChar, `${family}${sub}`);
        categoryFilter = ` AND p01.codi LIKE @subfamilyPrefix + '%'`;
      } else {
        // Filtrar por nombre de subfamilia (legacy/fallback)
        sqlRequest.input('categoryFilterName', sql.VarChar, category);
        categoryFilter = ` AND s.nomsub = @categoryFilterName`;
      }
    }

    // Consulta SQL Server con optimizaciones sargables y EXISTS
    const sqlQuery = `
      SELECT TOP ${topLimit} 
        RTRIM(p01.codi) as id, 
        RTRIM(p01.codf) as userCode, 
        RTRIM(p01.descr) as name, 
        RTRIM(p01.marc) as brand, 
        RTRIM(p01.umed) as unit, 
        p01.pvns as price, 
        ${stockExpression} as stock,
        RTRIM(p01.obse) as observations,
        RTRIM(s.codsub) as categoryCode,
        RTRIM(s.nomsub) as categoryName,
        CASE WHEN EXISTS (
          SELECT 1 FROM dtl_item_equivalente eq WITH(nolock) WHERE eq.codi = p01.codi
        ) THEN 1 ELSE 0 END as hasEquivalents
      FROM prd0101 p01 WITH(nolock)
      ${joinsSql}
      LEFT JOIN tbl01sbf s WITH(nolock) ON s.codsub = LEFT(p01.codi, 2) + '-' + SUBSTRING(p01.codi, 3, 2)
      WHERE p01.estado = 1 ${categoryFilter} ${queryFilter} ${brandFilter}
      ORDER BY p01.descr ASC
    `;

    console.log(`[DEPURACIÓN BÚSQUEDA] Query: "${query}", Category: "${category}"`);
    console.log(`[DEPURACIÓN BÚSQUEDA] Filtro SQL queryFilter: ${queryFilter}`);
    console.log(`[DEPURACIÓN BÚSQUEDA] Filtro SQL categoryFilter: ${categoryFilter}`);
    
    const result = await sqlRequest.query(sqlQuery);
    productsList = result.recordset;
    
    console.log(`[DEPURACIÓN BÚSQUEDA] Resultados de SQL Server del ERP: ${productsList.length}`);

    // Cruzar con PostgreSQL de Railway para jalar fotos, detalles y visibilidad
    let enrichedMap = {};
    let disabledCategories = [];
    try {
      const productCodes = productsList.map(p => p.id);
      if (productCodes.length > 0) {
        const webImages = await prisma.webProductoImagen.findMany({
          where: {
            codart: { in: productCodes }
          }
        });
        
        webImages.forEach(img => {
          enrichedMap[img.codart] = {
            imagenes: JSON.parse(img.imagenes || '[]'),
            descripcionEnriquecida: img.descripcionEnriquecida,
            destacado: img.destacado,
            visible: img.visible
          };
        });
      }

      // Obtener categorías deshabilitadas
      const catConfigs = await prisma.webCategoriaConfig.findMany({
        where: { visible: false }
      });
      disabledCategories = catConfigs.map(c => c.categoria);
    } catch (pgErr) {
      console.warn('[API Products Search - LOCAL MODE] PostgreSQL no accesible, usando imágenes por defecto:', pgErr.message);
    }

    // 1. Obtener la configuración global de Stock Crítico
    let lowStockThreshold = 5;
    try {
      const thresholdConfig = await prisma.webGlobalConfig.findUnique({
        where: { clave: 'LOW_STOCK_THRESHOLD' }
      });
      if (thresholdConfig && thresholdConfig.valor) {
        lowStockThreshold = parseInt(thresholdConfig.valor || '5');
      }
    } catch (e) {
      console.warn('[API Products Search] Error cargando LOW_STOCK_THRESHOLD:', e.message);
    }

    // 2. Obtener etiquetas asociadas a los productos
    let productTagsMap = {};
    try {
      const dbTags = await prisma.webProductTag.findMany({
        where: { visible: true }
      });
      dbTags.forEach(t => {
        let prods = [];
        try {
          prods = JSON.parse(t.productos || '[]');
        } catch (errJson) {
          prods = [];
        }
        prods.forEach(prodId => {
          if (!productTagsMap[prodId]) {
            productTagsMap[prodId] = [];
          }
          productTagsMap[prodId].push(t.etiqueta);
        });
      });
    } catch (e) {
      console.warn('[API Products Search] Error cargando etiquetas en el buscador:', e.message);
    }

    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="46" font-weight="600" fill="%23FF2E93" opacity="0.12" letter-spacing="0.18em">GLOSS</text></svg>';

    const formattedProducts = productsList.map(p => {
      const enrichment = enrichedMap[p.id] || {};
      
      let defaultImage = PLACEHOLDER_IMAGE;
      const webCat = mapSubfamilyToWebCategory(p.categoryCode, p.categoryName);
      
      if (useFallback) {
        const originalMock = MOCK_PRODUCTS.find(m => m.id === p.id);
        defaultImage = originalMock ? originalMock.image : PLACEHOLDER_IMAGE;
      }

      const imagesArray = enrichment.imagenes || [];
      const mainImage = imagesArray.length > 0 ? imagesArray[0] : defaultImage;

      let finalCategory = webCat;
      if (enrichment.destacado) {
        finalCategory = 'Trending';
      }

      return {
        id: p.id,
        userCode: p.userCode,
        name: formatProductName(p.name),
        brand: p.brand?.trim() || 'Importado',
        unit: p.unit?.trim() || 'UND',
        price: parseFloat(p.price || 0),
        stock: parseFloat(p.stock || 0),
        category: finalCategory,
        image: mainImage,
        images: imagesArray,
        description: enrichment.descripcionEnriquecida || p.observations?.trim() || null,
        destacado: !!enrichment.destacado,
        visible: enrichment.visible !== false,
        hasEquivalents: useFallback 
          ? (p.id === '0505-010288' || p.id === '0505-010340' || p.id === '0505-010287') 
          : (p.hasEquivalents === 1 || p.hasEquivalents === true),
        isMock: useFallback,
        lowStockThreshold,
        tags: productTagsMap[p.id] || []
      };
    });

    // Filtrar productos ocultos (visible=false en PostgreSQL)
    let visibleProducts = formattedProducts.filter(p => {
      const enrichment = enrichedMap[p.id];
      console.log(`[DEPURACIÓN FILTRADO] Evaluando producto: ${p.id} (${p.name}), Categoría: ${p.category}`);
      if (enrichment) {
        console.log(`[DEPURACIÓN FILTRADO] Encontrado en Postgres. visible: ${enrichment.visible}, destacado: ${enrichment.destacado}`);
      } else {
        console.log(`[DEPURACIÓN FILTRADO] No configurado en Postgres.`);
      }
      console.log(`[DEPURACIÓN FILTRADO] Categorías deshabilitadas en Postgres:`, disabledCategories);

      // Si el producto tiene config y está marcado como oculto, excluirlo (a menos que se pida incluirlos)
      if (!includeHidden && enrichment && enrichment.visible === false) {
        console.log(`[DEPURACIÓN FILTRADO] EXCLUIDO: Marcado como visible=false en Postgres.`);
        return false;
      }
      // Si la categoría del producto está deshabilitada, excluirlo
      if (disabledCategories.includes(p.category)) {
        console.log(`[DEPURACIÓN FILTRADO] EXCLUIDO: Categoría "${p.category}" deshabilitada.`);
        return false;
      }
      console.log(`[DEPURACIÓN FILTRADO] APROBADO: Producto visible.`);
      return true;
    });

    let finalProducts = visibleProducts;
    if (category === 'Trending') {
      if (useFallback) {
        // Si el ERP local no está conectado y estamos en desarrollo local/fallback de mocks,
        // filtramos la lista de mocks por los destacados reales del mock data
        finalProducts = visibleProducts.filter(p => {
          const originalMock = MOCK_PRODUCTS.find(m => m.id === p.id);
          return originalMock?.destacado || originalMock?.category === 'Trending';
        });
      } else if (topCodes && topCodes.length > 0) {
        // Ordenar en memoria respetando el orden alternado (entrelazado) de Alto y Bajo precio
        finalProducts = topCodes.map(code => {
          return visibleProducts.find(p => p.id === code);
        }).filter(Boolean);
      }
    }

    // Guardar en caché en la DB local usando el TTL dinámico optimizado
    await cache.set(cacheKey, finalProducts, cacheTtl);
    return NextResponse.json(finalProducts);

  } catch (error) {
    console.error('[API Products Search] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
