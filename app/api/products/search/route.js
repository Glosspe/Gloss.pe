import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';
import { MOCK_PRODUCTS } from '@/lib/mocks';
import sql from 'mssql';
import { getStockColumnName, getStockTableName } from '@/lib/erp-utils';

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
    
    // Modo Proxy: Si la variable de entorno LOCAL_API_URL está presente, la nube (Railway)
    // redirige la petición a la API local que corre en la PC del usuario a través de ngrok.
    const localApiUrl = process.env.LOCAL_API_URL;
    
    if (localApiUrl) {
      console.log(`[API Products Search - PROXY MODE] Redirigiendo a: ${localApiUrl}/api/products/search`);
      try {
        const cleanApiUrl = localApiUrl.replace(/\/$/, ''); // Quitar barra diagonal al final si existe
        const targetUrl = `${cleanApiUrl}/api/products/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}&brand=${encodeURIComponent(brand)}`;
        
        const res = await fetch(targetUrl, {
          headers: { 'Content-Type': 'application/json' },
          next: { revalidate: 60 } // Cachear por 60 segundos
        });
        
        if (res.ok) {
          const data = await res.json();
          return NextResponse.json(data);
        } else {
          console.warn(`[API Products Search - PROXY MODE] La API local retornó status ${res.status}. Pasando a fallback local.`);
        }
      } catch (proxyErr) {
        console.error(`[API Products Search - PROXY MODE] Error conectando a la API local de ngrok:`, proxyErr.message);
        // Continuar al fallback de mocks locales para mantener la tienda activa
      }
    }

    // --- MODO LOCAL / API SERVER ---
    // Si LOCAL_API_URL no está definida (o el proxy falló), procesamos directamente contra la DB ERP local.
    console.log(`[API Products Search - LOCAL MODE] Ejecutando consulta de base de datos local...`);

    let pool;
    let useFallback = false;
    try {
      pool = await getErpConnection();
    } catch (dbErr) {
      console.warn('[API Products Search - LOCAL MODE] ERP no accesible, usando MOCK_PRODUCTS como fallback:', dbErr.message);
      useFallback = true;
    }

    let productsList = [];

    if (useFallback) {
      // MOCK_PRODUCTS locales
      productsList = MOCK_PRODUCTS.map(p => {
        let categoryCode = '05-05';
        if (p.category === 'Facial') categoryCode = '04-04';
        else if (p.category === 'Cosmeticos') categoryCode = '04-01';
        else if (p.category === 'Corporal') categoryCode = '06-03';

        return {
          id: p.id,
          userCode: p.id,
          name: p.name,
          brand: p.brand,
          unit: 'UND',
          price: p.price,
          stock: p.stock,
          categoryCode: categoryCode,
          categoryName: p.category
        };
      });

      if (query.trim() !== '') {
        const q = query.toLowerCase();
        productsList = productsList.filter(
          p => p.name.toLowerCase().includes(q) || 
               p.id.toLowerCase().includes(q) || 
               p.brand.toLowerCase().includes(q)
        );
      }

      if (category && category !== 'Trending' && category !== 'Todos') {
        if (/^\d{2}-\d{2,}$/.test(category)) {
          // Filtrar por codsub del mock
          productsList = productsList.filter(p => p.categoryCode === category);
        } else {
          productsList = productsList.filter(p => mapSubfamilyToWebCategory(p.categoryCode, p.categoryName) === category);
        }
      }
      
      if (brand && brand.trim() !== '') {
        productsList = productsList.filter(p => p.brand && p.brand.toLowerCase() === brand.toLowerCase());
      }
    } else {
      // Consultar directo a la base de datos Navasoft por ZeroTier
      const warehouse = process.env.ERP_DEFAULT_WAREHOUSE || '01';
      const stockField = getStockColumnName(warehouse);
      const prdTable = getStockTableName(warehouse);
      
      const sqlRequest = pool.request();
      
      let brandFilter = "";
      if (brand && brand.trim() !== '') {
        sqlRequest.input('brandFilterName', sql.VarChar, brand);
        brandFilter = ` AND LTRIM(RTRIM(p01.marc)) = @brandFilterName`;
      }
      
      let queryFilter = "";
      if (query.trim() !== '') {
        sqlRequest.input('searchQuery', sql.VarChar, `%${query}%`);
        queryFilter = ` AND (p01.descr LIKE @searchQuery OR p01.codi LIKE @searchQuery OR p01.codf LIKE @searchQuery OR p01.marc LIKE @searchQuery)`;
      }

      let categoryFilter = "";
      if (category && category !== 'Trending' && category !== 'Todos') {
        // Detectar si es un ID de subfamilia (formato XX-YY como '01-03') o un nombre
        if (/^\d{2}-\d{2,}$/.test(category)) {
          // Filtrar por codsub (mismo patrón que el POS Syscom.click)
          sqlRequest.input('catRight', sql.VarChar, category.split('-')[1]);
          sqlRequest.input('catLeft', sql.VarChar, category.split('-')[0]);
          categoryFilter = ` AND LTRIM(RTRIM(p01.codcat)) = @catRight AND LEFT(p01.codi, 2) = @catLeft`;
        } else {
          // Filtrar por nombre de subfamilia (legacy/fallback)
          sqlRequest.input('categoryFilterName', sql.VarChar, category);
          categoryFilter = ` AND s.nomsub = @categoryFilterName`;
        }
      }

      let sqlQuery = "";
      if (warehouse === '01') {
        sqlQuery = `
          SELECT TOP 100 
            RTRIM(p01.codi) as id, 
            RTRIM(p01.codf) as userCode, 
            RTRIM(p01.descr) as name, 
            RTRIM(p01.marc) as brand, 
            RTRIM(p01.umed) as unit, 
            p01.pvns as price, 
            p01.stoc as stock,
            RTRIM(p01.obse) as observations,
            RTRIM(s.codsub) as categoryCode,
            RTRIM(s.nomsub) as categoryName
          FROM prd0101 p01 WITH(nolock)
          LEFT JOIN tbl01sbf s WITH(nolock) ON LEFT(p01.codi, 2) + '-' + LTRIM(RTRIM(p01.codcat)) = s.codsub
          WHERE p01.estado = 1 ${categoryFilter} ${queryFilter} ${brandFilter}
          ORDER BY p01.descr ASC
        `;
      } else {
        sqlQuery = `
          DECLARE @table_exists INT;
          SELECT @table_exists = COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${prdTable}';

          IF @table_exists > 0
            BEGIN
              SELECT TOP 100 
                RTRIM(p01.codi) as id, 
                RTRIM(p01.codf) as userCode, 
                RTRIM(p01.descr) as name, 
                RTRIM(p01.marc) as brand, 
                RTRIM(p01.umed) as unit, 
                CASE WHEN ISNULL(p02.pvns, 0) = 0 THEN p01.pvns ELSE p02.pvns END as price, 
                ISNULL(p02.stoc, 0) as stock, 
                RTRIM(p01.obse) as observations,
                RTRIM(s.codsub) as categoryCode,
                RTRIM(s.nomsub) as categoryName
              FROM ${prdTable} p02 WITH(nolock)
              INNER JOIN prd0101 p01 WITH(nolock) ON p01.codi = p02.codi
              LEFT JOIN tbl01sbf s WITH(nolock) ON LEFT(p01.codi, 2) + '-' + LTRIM(RTRIM(p01.codcat)) = s.codsub
              WHERE p01.estado = 1 ${categoryFilter} ${queryFilter} ${brandFilter}
              ORDER BY p01.descr ASC
            END
          ELSE
            BEGIN
              SELECT TOP 100 
                RTRIM(p01.codi) as id, 
                RTRIM(p01.codf) as userCode, 
                RTRIM(p01.descr) as name, 
                RTRIM(p01.marc) as brand, 
                RTRIM(p01.umed) as unit, 
                p01.pvns as price, 
                ISNULL(p01.${stockField}, 0) as stock, 
                RTRIM(p01.obse) as observations,
                RTRIM(s.codsub) as categoryCode,
                RTRIM(s.nomsub) as categoryName
              FROM prd0101 p01 WITH(nolock)
              LEFT JOIN tbl01sbf s WITH(nolock) ON LEFT(p01.codi, 2) + '-' + LTRIM(RTRIM(p01.codcat)) = s.codsub
              WHERE p01.estado = 1 ${categoryFilter} ${queryFilter} ${brandFilter}
              ORDER BY p01.descr ASC
            END
        `;
      }

      const result = await sqlRequest.query(sqlQuery);
      productsList = result.recordset;
    }

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

    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="100%" height="100%" fill="%23FFF2F6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="600" fill="%23FF2E93">GLOSS</text></svg>';

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
        isMock: useFallback
      };
    });

    // Filtrar productos ocultos (visible=false en PostgreSQL)
    let visibleProducts = formattedProducts.filter(p => {
      const enrichment = enrichedMap[p.id];
      // Si el producto tiene config y está marcado como oculto, excluirlo
      if (enrichment && enrichment.visible === false) return false;
      // Si la categoría del producto está deshabilitada, excluirlo
      if (disabledCategories.includes(p.category)) return false;
      return true;
    });

    let finalProducts = visibleProducts;
    if (category === 'Trending') {
      finalProducts = visibleProducts.filter(p => p.destacado || p.price > 80);
      if (finalProducts.length === 0) {
        finalProducts = visibleProducts.slice(0, 12);
      }
    }

    return NextResponse.json(finalProducts);

  } catch (error) {
    console.error('[API Products Search] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
