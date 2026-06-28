import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';
import sql from 'mssql';
import cache from '@/lib/cache';

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
    const warehouse = searchParams.get('warehouse') || '';
    
    if (!productId) {
      return NextResponse.json({ error: 'Falta el parámetro id del producto' }, { status: 400 });
    }

    // 1. Intentar servir desde el caché (asíncronamente)
    const cacheKey = `product-detail-${productId}-${warehouse || 'all'}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      console.log(`[API Product Detail] Sirviendo desde caché para: ${productId}`);
      return NextResponse.json(cachedData);
    }

    // El modo Proxy directo en caliente a la base de datos local ha sido deshabilitado
    // en favor de la arquitectura de sincronización asíncrona de PostgreSQL en la nube.

    // --- MODO LOCAL / API SERVER (ASÍNCRONO - DESACOPLADO) ---
    console.log(`[API Product Detail - LOCAL MODE] Consultando detalles para el producto: ${productId} en PostgreSQL...`);

    const product = await prisma.webProductoImagen.findUnique({
      where: { codart: productId }
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado en el catálogo' }, { status: 404 });
    }

    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="46" font-weight="600" fill="%23FF2E93" opacity="0.12" letter-spacing="0.18em">GLOSS</text></svg>';
    
    let imagesArray = [];
    try {
      imagesArray = JSON.parse(product.imagenes || '[]');
    } catch (errJson) {
      imagesArray = [];
    }
    const mainImage = imagesArray.length > 0 ? imagesArray[0] : PLACEHOLDER_IMAGE;

    const productData = {
      id: product.codart,
      userCode: product.codart,
      name: formatProductName(product.nombre || ''),
      brand: product.marca || 'Importado',
      unit: 'UND',
      price: parseFloat(product.precio || 0),
      stock: parseFloat(product.stock || 0),
      category: product.destacado ? 'Trending' : (product.categoria || 'Otros'),
      image: mainImage,
      images: imagesArray,
      description: product.descripcionEnriquecida || null,
      destacado: product.destacado,
      hasEquivalents: product.hasEquivalents,
      visible: product.visible,
      isMock: false
    };

    // Guardar en caché por 3 minutos (180s)
    await cache.set(cacheKey, productData, 180);
    return NextResponse.json(productData);

  } catch (error) {
    console.error('[API Product Detail] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
