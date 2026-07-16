import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import cache from '@/lib/cache';

// Helper para formatear nombres de productos del ERP
function formatProductName(name) {
  if (!name) return '';
  
  const cleaned = name.trim().replace(/\s+/g, ' ');
  const lower = cleaned.toLowerCase();
  const words = lower.split(' ');
  const connectors = ['de', 'con', 'y', 'el', 'la', 'para', 'en', 'al', 'del', 'los', 'las', 'un', 'una'];
  const uppercaseUnits = ['ml', 'gr', 'kg', 'fps', 'uv', '3d', 'pz', 'pza', 'pzas'];
  
  const formattedWords = words.map((word, index) => {
    if (!word) return '';
    
    if (connectors.includes(word) && index !== 0) {
      return word;
    }
    
    if (uppercaseUnits.includes(word)) {
      return word.toUpperCase();
    }
    
    if (/^\d+(ml|gr|g|kg|oz|pz|pza|pzas|fps)$/i.test(word)) {
      const numberPart = word.match(/^\d+/)[0];
      const unitPart = word.match(/[a-z]+$/i)[0].toUpperCase();
      return numberPart + unitPart;
    }
    
    if (word.includes('-')) {
      return word.split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('-');
    }
    
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  
  return formattedWords.join(' ');
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id') || '';
    const query = searchParams.get('query') || '';
    const limitParam = searchParams.get('limit') || '8';
    
    const limit = parseInt(limitParam, 10) || 8;
    
    // Intentar servir desde caché
    const cacheKey = `related-${productId}-${query}-${limit}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(cachedData);
    }

    let relatedProducts = [];
    const excludedIds = [];

    // Obtener categorías deshabilitadas
    let disabledCategories = [];
    try {
      const catConfigs = await prisma.webCategoriaConfig.findMany({
        where: { visible: false }
      });
      disabledCategories = catConfigs.map(c => c.categoria.toUpperCase());
    } catch (e) {
      console.warn('[API Related Products] Error cargando categorías deshabilitadas:', e.message);
    }

    // 1. Recomendación basada en Producto (Vista de Detalle)
    if (productId) {
      excludedIds.push(productId);
      
      const currentProduct = await prisma.webProductoImagen.findUnique({
        where: { codart: productId }
      });

      if (currentProduct) {
        const category = currentProduct.categoria || '';
        const brand = currentProduct.marca || '';

        // Buscar productos de la misma categoría y/o marca
        const matches = await prisma.webProductoImagen.findMany({
          where: {
            visible: true,
            codart: { not: productId },
            categoria: category ? { notIn: disabledCategories } : undefined,
            OR: [
              category ? { categoria: { equals: category, mode: 'insensitive' } } : undefined,
              brand ? { marca: { equals: brand, mode: 'insensitive' } } : undefined
            ].filter(Boolean)
          },
          take: limit,
          orderBy: [
            { stock: 'desc' }, // Prioridad a los que tienen stock
            { destacado: 'desc' }
          ]
        });

        relatedProducts = [...matches];
        matches.forEach(p => excludedIds.push(p.codart));
      }
    }

    // 2. Recomendación basada en Query de búsqueda (Buscador Vacío/Sugerencias)
    if (query && relatedProducts.length < limit) {
      const words = query.trim().split(/\s+/).filter(w => w.length > 0);
      
      if (words.length > 0) {
        const remainingLimit = limit - relatedProducts.length;
        const matches = await prisma.webProductoImagen.findMany({
          where: {
            visible: true,
            codart: excludedIds.length > 0 ? { notIn: excludedIds } : undefined,
            categoria: { notIn: disabledCategories },
            OR: words.map(word => ({
              OR: [
                { marca: { contains: word, mode: 'insensitive' } },
                { categoria: { contains: word, mode: 'insensitive' } }
              ]
            }))
          },
          take: remainingLimit,
          orderBy: [
            { stock: 'desc' },
            { destacado: 'desc' }
          ]
        });

        relatedProducts = [...relatedProducts, ...matches];
        matches.forEach(p => excludedIds.push(p.codart));
      }
    }

    // 3. Fallback General (si faltan productos para rellenar la grilla de sugeridos)
    if (relatedProducts.length < limit) {
      const remainingLimit = limit - relatedProducts.length;
      const fallbacks = await prisma.webProductoImagen.findMany({
        where: {
          visible: true,
          codart: excludedIds.length > 0 ? { notIn: excludedIds } : undefined,
          categoria: { notIn: disabledCategories },
          stock: { gt: 0 } // Solo productos con stock real
        },
        take: remainingLimit,
        orderBy: [
          { destacado: 'desc' },
          { fechaActualizacion: 'desc' }
        ]
      });

      relatedProducts = [...relatedProducts, ...fallbacks];
    }

    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjQ2IiBmb250LXdlaWdodD0iNjAwIiBmaWxsPSIjRkYyRTkzIiBvcGFjaXR5PSIwLjEyIiBsZXR0ZXItc3BhY2luZz0iMC4xOGVtIj5HTE9TZzwvdGV4dD48L3N2Zz4=';

    // Formatear al estándar del catálogo web
    const formattedResults = relatedProducts.map(p => {
      let imagesArray = [];
      try {
        imagesArray = JSON.parse(p.imagenes || '[]');
      } catch (err) {
        imagesArray = [];
      }
      
      const mainImage = imagesArray.length > 0 ? imagesArray[0] : PLACEHOLDER_IMAGE;

      return {
        id: p.codart,
        userCode: p.codart,
        barcode: p.codbar || null,
        codbar: p.codbar || null,
        name: formatProductName(p.nombre || ''),
        brand: p.marca || 'Importado',
        unit: 'UND',
        price: parseFloat(p.precio || 0),
        stock: parseFloat(p.stock || 0),
        category: p.destacado ? 'Trending' : (p.categoria || 'Otros'),
        image: mainImage,
        images: imagesArray,
        description: p.descripcionEnriquecida || null,
        destacado: p.destacado,
        visible: p.visible,
        hasEquivalents: p.hasEquivalents,
        isMock: false
      };
    });

    // Guardar en caché por 3 minutos (180 segundos)
    await cache.set(cacheKey, formattedResults, 180);
    return NextResponse.json(formattedResults);

  } catch (error) {
    console.error('[API Related Products] Error crítico:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
