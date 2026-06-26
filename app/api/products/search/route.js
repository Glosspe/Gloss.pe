import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';
import { MOCK_PRODUCTS } from '@/lib/mocks';
import sql from 'mssql';
import { getStockColumnName, getStockTableName } from '@/lib/erp-utils';

// Helper de mapeo de subfamilias de Navasoft a categorías de la tienda virtual
export function mapSubfamilyToWebCategory(codsub) {
  if (!codsub) return 'Otros';
  
  const capilarCodes = ['05-01', '05-02', '05-03', '05-04', '05-05', '01-01'];
  const facialCodes = ['03-01', '04-04'];
  const cosmeticosCodes = ['02-01', '02-02', '04-01', '04-02', '04-03', '09-01', '07-01', '10-01'];
  const corporalCodes = ['06-01', '06-02', '06-03', '08-01'];

  if (capilarCodes.includes(codsub)) return 'Capilar';
  if (facialCodes.includes(codsub)) return 'Facial';
  if (cosmeticosCodes.includes(codsub)) return 'Cosmeticos';
  if (corporalCodes.includes(codsub)) return 'Corporal';
  
  if (codsub.startsWith('05')) return 'Capilar';
  if (codsub.startsWith('02')) return 'Cosmeticos';
  if (codsub.startsWith('06')) return 'Corporal';
  
  return 'Otros';
}

// Obtener los códigos de subfamilia SQL correspondientes a una categoría web
function getSubfamilyCodesForCategory(category) {
  if (category === 'Capilar') return ["'05-01'", "'05-02'", "'05-03'", "'05-04'", "'05-05'", "'01-01'"];
  if (category === 'Facial') return ["'03-01'", "'04-04'"];
  if (category === 'Cosmeticos') return ["'02-01'", "'02-02'", "'04-01'", "'04-02'", "'04-03'", "'09-01'", "'07-01'", "'10-01'"];
  if (category === 'Corporal') return ["'06-01'", "'06-02'", "'06-03'", "'08-01'"];
  return [];
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || 'Trending';
    
    // Modo Proxy: Si la variable de entorno LOCAL_API_URL está presente, la nube (Railway)
    // redirige la petición a la API local que corre en la PC del usuario a través de ngrok.
    const localApiUrl = process.env.LOCAL_API_URL;
    
    if (localApiUrl) {
      console.log(`[API Products Search - PROXY MODE] Redirigiendo a: ${localApiUrl}/api/products/search`);
      try {
        const cleanApiUrl = localApiUrl.replace(/\/$/, ''); // Quitar barra diagonal al final si existe
        const targetUrl = `${cleanApiUrl}/api/products/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`;
        
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
        productsList = productsList.filter(p => mapSubfamilyToWebCategory(p.categoryCode) === category);
      }
    } else {
      // Consultar directo a la base de datos Navasoft por ZeroTier
      const warehouse = process.env.ERP_DEFAULT_WAREHOUSE || '01';
      const stockField = getStockColumnName(warehouse);
      const prdTable = getStockTableName(warehouse);
      
      const sqlRequest = pool.request();
      
      let queryFilter = "";
      if (query.trim() !== '') {
        sqlRequest.input('searchQuery', sql.VarChar, `%${query}%`);
        queryFilter = ` AND (p01.descr LIKE @searchQuery OR p01.codi LIKE @searchQuery OR p01.codf LIKE @searchQuery OR p01.marc LIKE @searchQuery)`;
      }

      let categoryFilter = "";
      if (category && category !== 'Trending' && category !== 'Todos') {
        const subfamilies = getSubfamilyCodesForCategory(category);
        if (subfamilies.length > 0) {
          categoryFilter = ` AND s.codsub IN (${subfamilies.join(',')})`;
        } else {
          categoryFilter = " AND 1=0";
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
            RTRIM(s.codsub) as categoryCode,
            RTRIM(s.nomsub) as categoryName
          FROM prd0101 p01 WITH(nolock)
          LEFT JOIN tbl01sbf s WITH(nolock) ON LEFT(p01.codi, 2) + '-' + LTRIM(RTRIM(p01.codcat)) = s.codsub
          WHERE p01.estado = 1 ${categoryFilter} ${queryFilter}
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
                RTRIM(s.codsub) as categoryCode,
                RTRIM(s.nomsub) as categoryName
              FROM ${prdTable} p02 WITH(nolock)
              INNER JOIN prd0101 p01 WITH(nolock) ON p01.codi = p02.codi
              LEFT JOIN tbl01sbf s WITH(nolock) ON LEFT(p01.codi, 2) + '-' + LTRIM(RTRIM(p01.codcat)) = s.codsub
              WHERE p01.estado = 1 ${categoryFilter} ${queryFilter}
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
                RTRIM(s.codsub) as categoryCode,
                RTRIM(s.nomsub) as categoryName
              FROM prd0101 p01 WITH(nolock)
              LEFT JOIN tbl01sbf s WITH(nolock) ON LEFT(p01.codi, 2) + '-' + LTRIM(RTRIM(p01.codcat)) = s.codsub
              WHERE p01.estado = 1 ${categoryFilter} ${queryFilter}
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

    // Formatear la lista
    const formattedProducts = productsList.map(p => {
      const enrichment = enrichedMap[p.id] || {};
      
      let defaultImage = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80';
      const webCat = mapSubfamilyToWebCategory(p.categoryCode);
      
      if (useFallback) {
        const originalMock = MOCK_PRODUCTS.find(m => m.id === p.id);
        defaultImage = originalMock ? originalMock.image : defaultImage;
      } else {
        if (webCat === 'Capilar') defaultImage = 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80';
        else if (webCat === 'Facial') defaultImage = 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&auto=format&fit=crop&q=80';
        else if (webCat === 'Cosmeticos') defaultImage = 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&auto=format&fit=crop&q=80';
        else if (webCat === 'Corporal') defaultImage = 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&auto=format&fit=crop&q=80';
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
        name: p.name,
        brand: p.brand?.trim() || 'Importado',
        unit: p.unit?.trim() || 'UND',
        price: parseFloat(p.price || 0),
        stock: parseFloat(p.stock || 0),
        category: finalCategory,
        image: mainImage,
        images: imagesArray,
        description: enrichment.descripcionEnriquecida || p.name,
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
