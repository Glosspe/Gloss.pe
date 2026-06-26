import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';
import { MOCK_PRODUCTS } from '@/lib/mocks';
import sql from 'mssql';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || 'Trending';
    
    console.log(`[API Products] Búsqueda: "${query}", Categoría: "${category}"`);

    // 1. Intentar conexión a la base de datos SQL Server del ERP Navasoft
    let pool;
    let useFallback = false;
    try {
      pool = await getErpConnection();
    } catch (dbErr) {
      console.warn('[API Products] SQL Server del ERP no disponible, usando MOCK_PRODUCTS como fallback local:', dbErr.message);
      useFallback = true;
    }

    let productsList = [];

    if (useFallback) {
      // Procesar con MOCK_PRODUCTS locales
      productsList = MOCK_PRODUCTS.map(p => ({
        id: p.id,
        userCode: p.id,
        name: p.name,
        brand: p.brand,
        unit: 'UND',
        price: p.price,
        stock: p.stock,
        categoryCode: p.category === 'Capilar' ? '01' : p.category === 'Facial' ? '02' : p.category === 'Cosmeticos' ? '03' : p.category === 'Corporal' ? '04' : '05'
      }));

      // Filtrar por query de texto
      if (query.trim() !== '') {
        const q = query.toLowerCase();
        productsList = productsList.filter(
          p => p.name.toLowerCase().includes(q) || 
               p.id.toLowerCase().includes(q) || 
               p.brand.toLowerCase().includes(q)
        );
      }

      // Filtrar por categoría en el mock si no es "Todos" ni "Trending"
      if (category && category !== 'Trending' && category !== 'Todos') {
        const catMap = { 'Capilar': '01', 'Facial': '02', 'Cosmeticos': '03', 'Corporal': '04' };
        const code = catMap[category];
        if (code) {
          productsList = productsList.filter(p => p.categoryCode === code);
        }
      }
    } else {
      // 2. Construir filtros SQL para Navasoft (prd0101)
      let filters = "p01.estado = 1"; // Solo productos activos
      
      if (query.trim() !== '') {
        filters += ` AND (p01.descr LIKE '%${query}%' OR p01.codi LIKE '%${query}%' OR p01.codf LIKE '%${query}%' OR p01.marc LIKE '%${query}%')`;
      }

      if (category && category !== 'Trending' && category !== 'Todos') {
        let codcat = '';
        if (category === 'Capilar') codcat = '01';
        if (category === 'Facial') codcat = '02';
        if (category === 'Cosmeticos') codcat = '03';
        if (category === 'Corporal') codcat = '04';
        
        if (codcat) {
          filters += ` AND LTRIM(RTRIM(p01.codcat)) = '${codcat}'`;
        }
      }

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
      productsList = result.recordset;
    }

    // 3. Cruzar datos con PostgreSQL para jalar fotos y detalles
    let enrichedMap = {};
    try {
      const productCodes = productsList.map(p => p.id);
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
      console.warn('[API Products] PostgreSQL no accesible. Usando fallbacks de imágenes:', pgErr.message);
    }

    // 4. Formatear la lista final enriquecida
    const formattedProducts = productsList.map(p => {
      const enrichment = enrichedMap[p.id] || {};
      
      // Imagen predeterminada (del Mock o fallback)
      let defaultImage = '';
      if (useFallback) {
        const originalMock = MOCK_PRODUCTS.find(m => m.id === p.id);
        defaultImage = originalMock ? originalMock.image : 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80';
      } else {
        defaultImage = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80';
        if (p.categoryCode === '01') defaultImage = 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80';
        else if (p.categoryCode === '02') defaultImage = 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&auto=format&fit=crop&q=80';
        else if (p.categoryCode === '03') defaultImage = 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&auto=format&fit=crop&q=80';
        else if (p.id.startsWith('CC')) defaultImage = 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&auto=format&fit=crop&q=80';
      }

      const imagesArray = enrichment.imagenes || [];
      const mainImage = imagesArray.length > 0 ? imagesArray[0] : defaultImage;

      let webCategory = 'Otros';
      if (p.categoryCode === '01') webCategory = 'Capilar';
      else if (p.categoryCode === '02') webCategory = 'Facial';
      else if (p.categoryCode === '03') webCategory = 'Cosmeticos';
      else if (p.categoryCode === '04') webCategory = 'Corporal';
      
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

    let finalProducts = formattedProducts;
    if (category === 'Trending') {
      finalProducts = formattedProducts.filter(p => p.destacado || p.price > 100);
    }

    return NextResponse.json(finalProducts);

  } catch (error) {
    console.error('[API Products GET] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
