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
  
  // Agrupamiento por prefijo como fallback
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
    
    console.log(`[API Products Search] Parámetros: q="${query}", category="${category}"`);

    // 1. Intentar conexión a la base de datos SQL Server del ERP Navasoft
    let pool;
    let useFallback = false;
    try {
      pool = await getErpConnection();
    } catch (dbErr) {
      console.warn('[API Products Search] SQL Server del ERP no disponible, usando MOCK_PRODUCTS como fallback:', dbErr.message);
      useFallback = true;
    }

    let productsList = [];

    if (useFallback) {
      // MOCK_PRODUCTS locales
      productsList = MOCK_PRODUCTS.map(p => {
        // Asignar códigos de categoría ficticios para el mapeo local
        let categoryCode = '05-05'; // Cabello/Capilar por defecto
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

      // Filtrar por query de texto
      if (query.trim() !== '') {
        const q = query.toLowerCase();
        productsList = productsList.filter(
          p => p.name.toLowerCase().includes(q) || 
               p.id.toLowerCase().includes(q) || 
               p.brand.toLowerCase().includes(q)
        );
      }

      // Filtrar por categoría
      if (category && category !== 'Trending' && category !== 'Todos') {
        productsList = productsList.filter(p => mapSubfamilyToWebCategory(p.categoryCode) === category);
      }
    } else {
      // 2. Construir la consulta SQL parametrizada de forma robusta y segura
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
          // Si es una categoría no soportada, forzar a que no devuelva nada
          categoryFilter = " AND 1=0";
        }
      }

      console.log(`[API Products Search] Resolviendo stock en Almacén: ${warehouse}, Tabla: ${prdTable}, Col: ${stockField}`);

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

    // 3. Cruzar datos con PostgreSQL para inyectar fotos y descripciones enriquecidas
    let enrichedMap = {};
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
            destacado: img.destacado
          };
        });
      }
    } catch (pgErr) {
      console.warn('[API Products Search] PostgreSQL no accesible, usando imágenes por defecto:', pgErr.message);
    }

    // 4. Formatear y enriquecer los productos finales
    const formattedProducts = productsList.map(p => {
      const enrichment = enrichedMap[p.id] || {};
      
      // Asignar imagen por defecto según la categoría si no hay fotos en PostgreSQL
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
        destacado: !!enrichment.destacado
      };
    });

    let finalProducts = formattedProducts;
    // Si la categoría web es 'Trending', priorizar destacados o artículos caros/premium
    if (category === 'Trending') {
      finalProducts = formattedProducts.filter(p => p.destacado || p.price > 80);
      // Si la lista de Trending queda vacía, devolver los primeros 12 de forma genérica
      if (finalProducts.length === 0) {
        finalProducts = formattedProducts.slice(0, 12);
      }
    }

    return NextResponse.json(finalProducts);

  } catch (error) {
    console.error('[API Products Search] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
