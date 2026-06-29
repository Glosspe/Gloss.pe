import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getErpConnection } from '@/lib/db';
import sql from 'mssql';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const warehouse = searchParams.get('warehouse') || '';

    if (!productId) {
      return NextResponse.json({ error: 'Falta el parámetro productId' }, { status: 400 });
    }

    // 1. Verificar si la venta cruzada del ERP está activa en WebGlobalConfig
    let erpActive = true;
    try {
      const config = await prisma.webGlobalConfig.findUnique({
        where: { clave: 'ERP_CROSS_SELLING_ACTIVE' }
      });
      if (config && config.valor === 'false') {
        erpActive = false;
      }
    } catch (e) {
      console.warn('[API Cross Selling] Error leyendo WebGlobalConfig, usando true por defecto:', e.message);
    }

    let topCodes = [];

    // 2. Si está activa la lógica del ERP, consultar dtl01fac
    if (erpActive) {
      try {
        const pool = await getErpConnection();
        const topSalesRequest = pool.request();
        topSalesRequest.input('productId', sql.VarChar, productId);
        
        // Consultar productos comprados juntos en las mismas boletas/facturas de los últimos 180 días
        const erpQuery = `
          SELECT TOP 4 
            RTRIM(d2.codi) as id, 
            COUNT(*) as coincidencia
          FROM dtl01fac d1 WITH(nolock)
          INNER JOIN dtl01fac d2 WITH(nolock) ON d1.ndocu = d2.ndocu AND d1.cdocu = d2.cdocu
          INNER JOIN prd0101 p01 WITH(nolock) ON p01.codi = d2.codi
          WHERE d1.codi = @productId
            AND d1.fecha >= DATEADD(day, -180, GETDATE())
            AND d2.codi <> @productId
            AND p01.estado = 1
            AND d1.cdocu IN ('01', '03', '65')
          GROUP BY d2.codi
          ORDER BY coincidencia DESC
        `;
        const res = await topSalesRequest.query(erpQuery);
        topCodes = res.recordset.map(r => r.id);
        console.log(`[API Cross Selling] ERP retornó ${topCodes.length} recomendaciones dinámicas para ${productId}`);
      } catch (erpErr) {
        console.warn('[API Cross Selling] Error consultando ERP local:', erpErr.message);
      }
    }

    // 3. Consultar recomendaciones manuales en PostgreSQL
    let manualCodes = [];
    try {
      const manualConfig = await prisma.webProductCrossSell.findUnique({
        where: { codart: productId }
      });
      if (manualConfig && manualConfig.productos) {
        manualCodes = JSON.parse(manualConfig.productos);
        console.log(`[API Cross Selling] Encontradas ${manualCodes.length} asociaciones manuales para ${productId}`);
      }
    } catch (pgErr) {
      console.warn('[API Cross Selling] Error consultando asociaciones manuales en Postgres:', pgErr.message);
    }

    // Combinar códigos: priorizar manuales del administrador, luego rellenar con dinámicos del ERP
    let finalCodes = [...manualCodes];
    topCodes.forEach(code => {
      if (!finalCodes.includes(code) && finalCodes.length < 4) {
        finalCodes.push(code);
      }
    });

    if (finalCodes.length === 0) {
      return NextResponse.json([]); // Retornar vacío de forma segura
    }

    // 4. Cargar la información detallada del catálogo para los finalCodes
    const pool = await getErpConnection();
    
    // Obtener sedes activas para calcular el stock en tiempo real
    let activeWarehouses = [];
    try {
      const dbAlmacenes = await prisma.webAlmacenConfig.findMany({
        where: { visible: true }
      });
      activeWarehouses = dbAlmacenes.map(a => a.codalm);
    } catch (err) {
      console.warn('[API Cross Selling] Error consultando almacenes activos, usando 01:', err.message);
    }
    if (activeWarehouses.length === 0) activeWarehouses = ['01'];

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

    // Construir consulta parametrizada de forma dinámica para evitar inyección SQL
    const requestSql = pool.request();
    const paramNames = [];
    finalCodes.forEach((code, index) => {
      const paramName = `code_${index}`;
      requestSql.input(paramName, sql.VarChar, code);
      paramNames.push(`@${paramName}`);
    });
    const codesList = paramNames.length > 0 ? paramNames.join(',') : "''";

    const detailQuery = `
      SELECT 
        RTRIM(p01.codi) as id,
        RTRIM(p01.codart) as userCode,
        RTRIM(p01.descr) as name,
        RTRIM(p01.marc) as brand,
        RTRIM(p01.umed) as unit,
        p01.pvns as price,
        ${stockExpression} as stock,
        RTRIM(p01.codcat) as categoryCode,
        RTRIM(s.nomsub) as categoryName,
        RTRIM(p01.obse) as observations,
        (SELECT COUNT(1) FROM prd0101_equivalente eq WITH(nolock) WHERE eq.codi = p01.codi) as hasEquivalents
      FROM prd0101 p01 WITH(nolock)
      LEFT JOIN tbl01sbf s WITH(nolock) ON (LEFT(p01.codi, 2) + '-' + LTRIM(RTRIM(p01.codcat))) = s.codsub
      ${joinsSql}
      WHERE p01.codi IN (${codesList}) AND p01.estado = 1
    `;

    const detailResult = await requestSql.query(detailQuery);
    const rawProducts = detailResult.recordset;

    // Obtener enriquecimiento de imágenes y visibilidad desde Postgres
    let enrichedMap = {};
    try {
      const enrichments = await prisma.webProductoImagen.findMany({
        where: { codart: { in: finalCodes } }
      });
      enrichments.forEach(e => {
        let imagenes = [];
        try {
          imagenes = JSON.parse(e.imagenes || '[]');
        } catch (errJson) {
          imagenes = [];
        }
        enrichedMap[e.codart] = {
          imagenes,
          descripcionEnriquecida: e.descripcionEnriquecida,
          destacado: e.destacado,
          visible: e.visible
        };
      });
    } catch (pgErr) {
      console.warn('[API Cross Selling] Error cargando fotos de Postgres:', pgErr.message);
    }

    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="46" font-weight="600" fill="%23FF2E93" opacity="0.12" letter-spacing="0.18em">GLOSS</text></svg>';

    // Mapear al formato estándar de producto del frontend
    const formattedProducts = rawProducts.map(p => {
      const enrichment = enrichedMap[p.id] || {};
      const imagesArray = enrichment.imagenes || [];
      const mainImage = imagesArray.length > 0 ? imagesArray[0] : PLACEHOLDER_IMAGE;

      return {
        id: p.id,
        userCode: p.userCode,
        name: p.name?.trim(),
        brand: p.brand?.trim() || 'Importado',
        unit: p.unit?.trim() || 'UND',
        price: parseFloat(p.price || 0),
        stock: parseFloat(p.stock || 0),
        category: p.categoryName?.trim() || 'Otros',
        image: mainImage,
        images: imagesArray,
        description: enrichment.descripcionEnriquecida || p.observations?.trim() || null,
        destacado: !!enrichment.destacado,
        hasEquivalents: p.hasEquivalents > 0
      };
    });

    // Ordenar de acuerdo a la lista de finalCodes
    const orderedProducts = finalCodes.map(code => {
      return formattedProducts.find(p => p.id === code);
    }).filter(Boolean);

    return NextResponse.json(orderedProducts);

  } catch (error) {
    console.error('[API Cross Selling] Error crítico:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
