import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';
import sql from 'mssql';
import cache from '@/lib/cache';

// Helper para retornar el nombre de categoría web del producto (nombre de subfamilia del ERP)
function mapSubfamilyToWebCategory(codsub, categoryName) {
  if (categoryName) return categoryName.trim();
  return 'Otros';
}

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

// Mock de productos equivalentes para cuando la base de datos ERP local no sea accesible
const MOCK_EQUIVALENTS = {
  '0505-010288': [
    {
      id: '0505-010287',
      userCode: '0505-010287',
      name: 'Acondicionador Placenta Life Quinua 400ml',
      brand: 'Placenta Life',
      unit: 'UND',
      price: 45.00,
      stock: 15,
      category: 'CABELLO',
      image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&auto=format&fit=crop&q=80'],
      description: 'Acondicionador premium para reparación profunda de cabellos dañados o procesados químicamente.',
      destacado: false,
      isMock: true
    },
    {
      id: '0505-010340',
      userCode: '0505-010340',
      name: 'Ampollas Shock Reparación Placenta Life 15ml',
      brand: 'Placenta Life',
      unit: 'UND',
      price: 12.00,
      stock: 8,
      category: 'CABELLO',
      image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&auto=format&fit=crop&q=80'],
      description: 'Tratamiento intensivo en ampolla para nutrición y brillo inmediato.',
      destacado: false,
      isMock: true
    }
  ],
  'PRD-003': [
    {
      id: 'PRD-004',
      userCode: 'PRD-004',
      name: 'Hyalu B5 Serum Ácido Hialurónico 30ml',
      brand: 'La Roche-Posay',
      unit: 'UND',
      price: 159.00,
      stock: 15,
      category: 'HIDRATANTE',
      image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80'],
      description: 'Sérum antiarrugas reparador rellenador para pieles sensibles.',
      destacado: false,
      isMock: true
    },
    {
      id: 'PRD-005',
      userCode: 'PRD-005',
      name: 'Anthelios UVMune 400 Invisible Fluid SPF50+',
      brand: 'La Roche-Posay',
      unit: 'UND',
      price: 120.00,
      stock: 20,
      category: 'HIDRATANTE',
      image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&auto=format&fit=crop&q=80'],
      description: 'Protector solar facial de fluido invisible con muy alta protección UVA/UVB.',
      destacado: false,
      isMock: true
    }
  ]
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id') || '';
    const warehouse = searchParams.get('warehouse') || '';
    
    if (!productId) {
      return NextResponse.json({ error: 'Falta el parámetro id del producto' }, { status: 400 });
    }

    // 1. Intentar servir desde el caché en memoria (asíncronamente)
    const cacheKey = `equivalents-${productId}-${warehouse || 'all'}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      console.log(`[API Products Equivalents] Sirviendo desde caché para: ${productId}`);
      return NextResponse.json(cachedData);
    }

    // Modo Proxy: Si la variable de entorno LOCAL_API_URL está presente, la nube (Railway)
    // redirige la petición a la API local que corre en la PC del usuario a través de ngrok.
    const localApiUrl = process.env.LOCAL_API_URL;
    
    if (localApiUrl) {
      console.log(`[API Products Equivalents - PROXY MODE] Redirigiendo a: ${localApiUrl}/api/products/equivalents?id=${productId}&warehouse=${warehouse}`);
      try {
        const cleanApiUrl = localApiUrl.replace(/\/$/, ''); // Quitar barra diagonal al final si existe
        const targetUrl = `${cleanApiUrl}/api/products/equivalents?id=${encodeURIComponent(productId)}&warehouse=${encodeURIComponent(warehouse)}`;
        
        const res = await fetch(targetUrl, {
          headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          cache: 'no-store'
        });
        
        if (res.ok) {
          const data = await res.json();
          // Guardar en caché de la nube por 3 minutos (180s)
          await cache.set(cacheKey, data, 180);
          return NextResponse.json(data);
        } else {
          console.warn(`[API Products Equivalents - PROXY MODE] La API local retornó status ${res.status}. Pasando a fallback local.`);
        }
      } catch (proxyErr) {
        console.error(`[API Products Equivalents - PROXY MODE] Error conectando a la API local de ngrok:`, proxyErr.message);
      }
    }

    // --- MODO LOCAL / API SERVER (ASÍNCRONO - DESACOPLADO) ---
    console.log(`[API Products Equivalents - LOCAL MODE] Consultando equivalentes para el producto: ${productId} en PostgreSQL...`);

    const product = await prisma.webProductoImagen.findUnique({
      where: { codart: productId }
    });

    if (!product) {
      await cache.set(cacheKey, [], 180);
      return NextResponse.json([]);
    }

    let equivalentCodes = [];
    try {
      equivalentCodes = JSON.parse(product.equivalentes || '[]');
    } catch (e) {
      equivalentCodes = [];
    }

    if (!Array.isArray(equivalentCodes) || equivalentCodes.length === 0) {
      await cache.set(cacheKey, [], 180);
      return NextResponse.json([]);
    }

    // Consultar detalles de los productos equivalentes en PostgreSQL
    const dbEquivalents = await prisma.webProductoImagen.findMany({
      where: {
        codart: { in: equivalentCodes },
        visible: true
      }
    });

    // Obtener categorías deshabilitadas
    let disabledCategories = [];
    try {
      const catConfigs = await prisma.webCategoriaConfig.findMany({
        where: { visible: false }
      });
      disabledCategories = catConfigs.map(c => c.categoria);
    } catch (pgErr) {
      console.warn('[API Products Equivalents] Error cargando categorías deshabilitadas:', pgErr.message);
    }

    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="46" font-weight="600" fill="%23FF2E93" opacity="0.12" letter-spacing="0.18em">GLOSS</text></svg>';

    const formattedProducts = dbEquivalents.map(p => {
      let imagesArray = [];
      try {
        imagesArray = JSON.parse(p.imagenes || '[]');
      } catch (errJson) {
        imagesArray = [];
      }
      
      const mainImage = imagesArray.length > 0 ? imagesArray[0] : PLACEHOLDER_IMAGE;

      return {
        id: p.codart,
        userCode: p.codart,
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
        isMock: false
      };
    });

    // Filtrar por categorías deshabilitadas
    const visibleProducts = formattedProducts.filter(p => {
      if (disabledCategories.includes(p.category)) return false;
      return true;
    });

    // Guardar en caché por 3 minutos (180s)
    await cache.set(cacheKey, visibleProducts, 180);
    return NextResponse.json(visibleProducts);

  } catch (error) {
    console.error('[API Products Equivalents] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
