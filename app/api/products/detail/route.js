import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';
import sql from 'mssql';

// Helper para formatear nombres de productos del ERP (todo mayúsculas a formato premium de mayúsculas y minúsculas)
function formatProductName(name) {
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

// Fallback mock database para consulta individual
const MOCK_SINGLE_PRODUCTS = {
  '0505-010288': {
    id: '0505-010288',
    userCode: '0505-010288',
    name: 'Shampoo Reparación Intensa Placenta Life 400ml',
    brand: 'Placenta Life',
    unit: 'UND',
    price: 49.90,
    stock: 25,
    category: 'CABELLO',
    image: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&auto=format&fit=crop&q=80'],
    description: 'Champú premium enriquecido con queratina y quinua para la reconstrucción total de cabellos dañados o quebradizos. Aporta brillo, suavidad y fuerza.',
    destacado: true,
    hasEquivalents: true,
    isMock: true
  },
  '0505-010287': {
    id: '0505-010287',
    userCode: '0505-010287',
    name: 'Acondicionador Placenta Life Quinua 400ml',
    brand: 'Placenta Life',
    unit: 'UND',
    price: 45.00,
    stock: 15,
    category: 'CABELLO',
    image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&auto=format&fit=crop&q=80'],
    description: 'Acondicionador premium para reparación profunda de cabellos dañados o procesados químicamente.',
    destacado: false,
    hasEquivalents: true,
    isMock: true
  },
  '0505-010340': {
    id: '0505-010340',
    userCode: '0505-010340',
    name: 'Ampollas Shock Reparación Placenta Life 15ml',
    brand: 'Placenta Life',
    unit: 'UND',
    price: 12.00,
    stock: 8,
    category: 'CABELLO',
    image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&auto=format&fit=crop&q=80',
    images: ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&auto=format&fit=crop&q=80'],
    description: 'Tratamiento intensivo en ampolla para nutrición y brillo inmediato.',
    destacado: false,
    hasEquivalents: true,
    isMock: true
  }
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id') || '';
    
    if (!productId) {
      return NextResponse.json({ error: 'Falta el parámetro id del producto' }, { status: 400 });
    }

    // Modo Proxy: Si la variable de entorno LOCAL_API_URL está presente, la nube (Railway)
    // redirige la petición a la API local que corre en la PC del usuario a través de ngrok.
    const localApiUrl = process.env.LOCAL_API_URL;
    
    if (localApiUrl) {
      console.log(`[API Product Detail - PROXY MODE] Redirigiendo a: ${localApiUrl}/api/products/detail`);
      try {
        const cleanApiUrl = localApiUrl.replace(/\/$/, ''); // Quitar barra diagonal al final si existe
        const targetUrl = `${cleanApiUrl}/api/products/detail?id=${encodeURIComponent(productId)}`;
        
        const res = await fetch(targetUrl, {
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        });
        
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        } else {
          console.warn(`[API Product Detail - PROXY MODE] La API local retornó status ${res.status}. Pasando a fallback local.`);
        }
      } catch (proxyErr) {
        console.error(`[API Product Detail - PROXY MODE] Error conectando a la API local de ngrok:`, proxyErr.message);
      }
    }

    // --- MODO LOCAL / API SERVER ---
    console.log(`[API Product Detail - LOCAL MODE] Consultando detalles para el producto: ${productId}`);

    let pool;
    let useFallback = false;
    try {
      pool = await getErpConnection();
    } catch (dbErr) {
      console.warn('[API Product Detail - LOCAL MODE] ERP no accesible, usando MOCKS como fallback:', dbErr.message);
      useFallback = true;
    }

    if (useFallback) {
      const mockProd = MOCK_SINGLE_PRODUCTS[productId];
      if (mockProd) return NextResponse.json(mockProd);
      
      // Fallback a mock general si no existe en los específicos
      return NextResponse.json({
        id: productId,
        userCode: productId,
        name: `Producto de Prueba (${productId})`,
        brand: 'Marca Importada',
        unit: 'UND',
        price: 99.90,
        stock: 5,
        category: 'Otros',
        image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="100%" height="100%" fill="%23FFF2F6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="600" fill="%23FF2E93">GLOSS</text></svg>',
        images: [],
        description: 'Descripción simulada de respaldo para desarrollo local.',
        destacado: false,
        hasEquivalents: false,
        isMock: true
      });
    }

    // Consultar directo a la base de datos Navasoft por ZeroTier / Conexión local
    let activeWarehouses = [];
    try {
      const dbAlmacenes = await prisma.webAlmacenConfig.findMany({
        where: { visible: true }
      });
      activeWarehouses = dbAlmacenes.map(a => a.codalm);
    } catch (err) {
      console.warn('[API Product Detail] Error fetching active warehouses from Postgres, falling back to 01:', err.message);
    }

    if (activeWarehouses.length === 0) {
      activeWarehouses = ['01'];
    }

    // Filtrar por sede si se recibe el parámetro en la URL
    const warehouseParam = request.nextUrl.searchParams.get('warehouse');
    if (warehouseParam && warehouseParam !== 'all' && warehouseParam !== 'null') {
      const cleanParam = warehouseParam.trim();
      if (activeWarehouses.includes(cleanParam)) {
        activeWarehouses = [cleanParam];
      } else {
        const WAREHOUSE_REGIONS = {
          'CHICLAYO': ['01', '02', '04', '06'],
          'JAÉN': ['05'],
          'JAEN': ['05']
        };
        const targetRegion = cleanParam.toUpperCase();
        if (WAREHOUSE_REGIONS[targetRegion]) {
          activeWarehouses = activeWarehouses.filter(wh => WAREHOUSE_REGIONS[targetRegion].includes(wh));
        }
      }
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
    sqlRequest.input('targetId', sql.Char(11), productId);

    const sqlQuery = `
      SELECT TOP 1
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
      LEFT JOIN tbl01sbf s WITH(nolock) ON LEFT(p01.codi, 2) + '-' + SUBSTRING(p01.codi, 3, 2) = s.codsub
      WHERE p01.codi = @targetId AND p01.estado = 1
    `;

    const result = await sqlRequest.query(sqlQuery);
    if (result.recordset.length === 0) {
      return NextResponse.json({ error: 'Producto no encontrado en el catálogo' }, { status: 404 });
    }

    const p = result.recordset[0];

    // Cruzar con PostgreSQL de Railway para jalar fotos, detalles y visibilidad
    let enrichment = {};
    try {
      const imgConfig = await prisma.webProductoImagen.findUnique({
        where: { codart: p.id }
      });
      
      if (imgConfig) {
        enrichment = {
          imagenes: JSON.parse(imgConfig.imagenes || '[]'),
          descripcionEnriquecida: imgConfig.descripcionEnriquecida,
          destacado: imgConfig.destacado,
          visible: imgConfig.visible
        };
      }
    } catch (pgErr) {
      console.warn('[API Product Detail] Error al conectar con PostgreSQL:', pgErr.message);
    }

    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="100%" height="100%" fill="%23FFF2F6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="600" fill="%23FF2E93">GLOSS</text></svg>';
    const imagesArray = enrichment.imagenes || [];
    const mainImage = imagesArray.length > 0 ? imagesArray[0] : PLACEHOLDER_IMAGE;
    
    let webCategory = p.categoryName?.trim() || 'Otros';
    if (enrichment.destacado) {
      webCategory = 'Trending';
    }

    return NextResponse.json({
      id: p.id,
      userCode: p.userCode,
      name: formatProductName(p.name),
      brand: p.brand?.trim() || 'Importado',
      unit: p.unit?.trim() || 'UND',
      price: parseFloat(p.price || 0),
      stock: parseFloat(p.stock || 0),
      category: webCategory,
      image: mainImage,
      images: imagesArray,
      description: enrichment.descripcionEnriquecida || p.observations?.trim() || null,
      destacado: !!enrichment.destacado,
      hasEquivalents: p.hasEquivalents === 1 || p.hasEquivalents === true,
      visible: enrichment.visible !== false,
      isMock: false
    });

  } catch (error) {
    console.error('[API Product Detail] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
