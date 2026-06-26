import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';
import sql from 'mssql';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || 'Trending';
    
    console.log(`[API Products] Búsqueda: "${query}", Categoría: "${category}"`);

    // 1. Conexión a la base de datos SQL Server del ERP Navasoft
    let pool;
    try {
      pool = await getErpConnection();
    } catch (dbErr) {
      console.error('[API Products] Error al conectar a SQL Server del ERP:', dbErr.message);
      return NextResponse.json({ error: 'Error de conexión con el ERP' }, { status: 503 });
    }

    // 2. Construir filtros SQL para Navasoft (prd0101)
    let filters = "p01.estado = 1"; // Solo productos activos
    
    // Si hay búsqueda por texto
    if (query.trim() !== '') {
      filters += ` AND (p01.descr LIKE '%${query}%' OR p01.codi LIKE '%${query}%' OR p01.codf LIKE '%${query}%' OR p01.marc LIKE '%${query}%')`;
    }

    // Filtro por categorías según la estructura de Navasoft
    // Las categorías en Navasoft suelen mapearse con codcat (familia/línea)
    // Para simplificar, mapearemos nombres comunes a los códigos de tu ERP
    if (category && category !== 'Trending' && category !== 'Todos') {
      let codcat = '';
      if (category === 'Capilar') codcat = '01'; // Ejemplo: 01 para Capilar
      if (category === 'Facial') codcat = '02';  // Ejemplo: 02 para Facial
      if (category === 'Cosmeticos') codcat = '03'; // Ejemplo: 03 para Cosméticos
      if (category === 'Corporal') codcat = '04';  // Ejemplo: 04 para Corporal
      
      if (codcat) {
        filters += ` AND LTRIM(RTRIM(p01.codcat)) = '${codcat}'`;
      }
    }

    // Consulta SQL en la tabla maestra prd0101 del ERP (Límite 100 productos)
    let sqlQuery = `
      SELECT TOP 100 
        RTRIM(p01.codi) as id, 
        RTRIM(p01.codf) as userCode, 
        RTRIM(p01.descr) as name, 
        RTRIM(p01.marc) as brand, 
        RTRIM(p01.umed) as unit, 
        p01.pvns as price, 
        p01.stoc as stock,
        RTRIM(p01.codcat) as categoryCode
      FROM prd0101 p01 WITH(nolock)
      WHERE ${filters}
      ORDER BY p01.descr ASC
    `;

    const result = await pool.request().query(sqlQuery);
    const erpProducts = result.recordset;

    // 3. Cruzar datos con la base de datos PostgreSQL de la web para jalar fotos y detalles
    // Envolvemos esto en un try-catch por si PostgreSQL aún no está configurado/migrado localmente.
    let enrichedMap = {};
    try {
      const productCodes = erpProducts.map(p => p.id);
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
    } catch (pgErr) {
      console.warn('[API Products] PostgreSQL no accesible o sin migrar. Usando fallbacks de imágenes:', pgErr.message);
    }

    // 4. Formatear la lista final enriquecida para el cliente
    const formattedProducts = erpProducts.map(p => {
      const enrichment = enrichedMap[p.id] || {};
      
      // Fallbacks de imágenes basados en categorías por si no hay foto en BD
      let defaultImage = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80';
      if (p.categoryCode === '01') { // Capilar
        defaultImage = 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80';
      } else if (p.categoryCode === '02') { // Facial
        defaultImage = 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&auto=format&fit=crop&q=80';
      } else if (p.categoryCode === '03') { // Cosméticos/Maquillaje
        defaultImage = 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&auto=format&fit=crop&q=80';
      } else if (p.id.startsWith('CC')) { // Perfumes Ccori
        defaultImage = 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&auto=format&fit=crop&q=80';
      }

      const imagesArray = enrichment.imagenes || [];
      const mainImage = imagesArray.length > 0 ? imagesArray[0] : defaultImage;

      // Mapear el código ERP a la categoría amigable de la web
      let webCategory = 'Otros';
      if (p.categoryCode === '01') webCategory = 'Capilar';
      else if (p.categoryCode === '02') webCategory = 'Facial';
      else if (p.categoryCode === '03') webCategory = 'Cosmeticos';
      else if (p.categoryCode === '04') webCategory = 'Corporal';
      
      // Si la categoría de la web es "Trending", verificamos si está marcado como destacado
      if (enrichment.destacado) {
        webCategory = 'Trending';
      }

      return {
        id: p.id,
        userCode: p.userCode,
        name: p.name,
        brand: p.brand || 'Importado',
        unit: p.unit || 'UND',
        price: parseFloat(p.price || 0),
        stock: parseFloat(p.stock || 0),
        category: webCategory,
        image: mainImage,
        images: imagesArray,
        description: enrichment.descripcionEnriquecida || p.name,
        destacado: !!enrichment.destacado
      };
    });

    // 5. Aplicar lógica adicional para "Trending" si es la categoría seleccionada
    let finalProducts = formattedProducts;
    if (category === 'Trending') {
      // Si se pide Trending, priorizamos productos marcados como destacados o con precio > 150 (gama alta)
      finalProducts = formattedProducts.filter(p => p.destacado || p.price > 100);
    }

    return NextResponse.json(finalProducts);

  } catch (error) {
    console.error('[API Products GET] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
