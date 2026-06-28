import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';
import { MOCK_PRODUCTS } from '@/lib/mocks';
import sql from 'mssql';
import { getStockColumnName, getStockTableName } from '@/lib/erp-utils';
import cache from '@/lib/cache';

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
    const warehouse = searchParams.get('warehouse') || '';
    const limitParam = searchParams.get('limit') || '';
    const includeHidden = searchParams.get('includeHidden') === 'true';
    
    let topLimit = 100;
    if (limitParam === 'all') {
      topLimit = 15000;
    } else if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        topLimit = Math.min(parsed, 15000);
      }
    }
    
    // 1. Intentar servir desde el caché en memoria (asíncronamente)
    const cacheKey = `search-${query}-${category}-${brand}-${warehouse || 'all'}-${topLimit}-${includeHidden}`;
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      console.log(`[API Products Search] Sirviendo desde caché para: ${cacheKey}`);
      return NextResponse.json(cachedData);
    }

    // Calcular el TTL dinámico para maximizar el aprovechamiento de Redis
    let cacheTtl = 15; // 15 segundos por defecto para búsquedas de texto dinámicas (q)
    if (query.trim() === '') {
      if (category === 'Trending') {
        cacheTtl = 180; // 3 minutos para productos destacados de la Home
      } else if (category && category !== 'Todos') {
        cacheTtl = 60; // 1 minuto para categorías fijas
      } else {
        cacheTtl = 45; // 45 segundos para el catálogo completo sin búsquedas
      }
    }

    // El modo Proxy directo en caliente a la base de datos local ha sido deshabilitado
    // en favor de la arquitectura de sincronización asíncrona de PostgreSQL en la nube.

    // --- MODO LOCAL / API SERVER (ASÍNCRONO - DESACOPLADO) ---
    // En lugar de conectarse en caliente al ERP, consultamos directamente PostgreSQL (sincronizada de forma asíncrona).
    console.log(`[API Products Search - LOCAL MODE] Consultando base de datos local en PostgreSQL...`);

    let lowStockThreshold = 5;
    try {
      const thresholdConfig = await prisma.webGlobalConfig.findUnique({
        where: { clave: 'LOW_STOCK_THRESHOLD' }
      });
      if (thresholdConfig && thresholdConfig.valor) {
        lowStockThreshold = parseInt(thresholdConfig.valor || '5');
      }
    } catch (e) {
      console.warn('[API Products Search] Error cargando LOW_STOCK_THRESHOLD:', e.message);
    }

    // Obtener categorías deshabilitadas
    let disabledCategories = [];
    try {
      const catConfigs = await prisma.webCategoriaConfig.findMany({
        where: { visible: false }
      });
      disabledCategories = catConfigs.map(c => c.categoria);
    } catch (pgErr) {
      console.warn('[API Products Search] Error cargando categorías deshabilitadas:', pgErr.message);
    }

    // Obtener etiquetas asociadas a los productos
    let productTagsMap = {};
    try {
      const dbTags = await prisma.webProductTag.findMany({
        where: { visible: true }
      });
      dbTags.forEach(t => {
        let prods = [];
        try {
          prods = JSON.parse(t.productos || '[]');
        } catch (errJson) {
          prods = [];
        }
        prods.forEach(prodId => {
          if (!productTagsMap[prodId]) {
            productTagsMap[prodId] = [];
          }
          productTagsMap[prodId].push(t.etiqueta);
        });
      });
    } catch (e) {
      console.warn('[API Products Search] Error cargando etiquetas:', e.message);
    }

    // Armar las condiciones de búsqueda en Prisma
    const whereCondition = {};

    // Controlar visibilidad
    if (!includeHidden) {
      whereCondition.visible = true;
    }

    // Filtro de Marca
    if (brand && brand.trim() !== '') {
      whereCondition.marca = {
        equals: brand.trim(),
        mode: 'insensitive'
      };
    }

    // Filtro de Categoría
    if (category && category.trim() !== '' && category !== 'Todos') {
      if (category === 'Trending') {
        whereCondition.destacado = true;
      } else {
        whereCondition.categoria = {
          contains: category,
          mode: 'insensitive'
        };
      }
    }

    // Filtro de búsqueda (Buscador inteligente con palabras separadas)
    if (query && query.trim() !== '') {
      const words = query.trim().split(/\s+/).filter(w => w.length > 0);
      if (words.length > 0) {
        whereCondition.AND = words.map(word => ({
          OR: [
            { nombre: { contains: word, mode: 'insensitive' } },
            { marca: { contains: word, mode: 'insensitive' } },
            { codart: { contains: word, mode: 'insensitive' } },
            { descripcionEnriquecida: { contains: word, mode: 'insensitive' } }
          ]
        }));
      }
    }

    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="46" font-weight="600" fill="%23FF2E93" opacity="0.12" letter-spacing="0.18em">GLOSS</text></svg>';

    // Consultar PostgreSQL
    let productsFromDb = await prisma.webProductoImagen.findMany({
      where: whereCondition,
      take: topLimit
    });

    // Fallback inteligente para la Home (Trending) si no hay productos marcados como destacados en la base de datos
    if (category === 'Trending' && productsFromDb.length === 0) {
      console.log('[API Products Search] No hay productos destacados en base de datos. Cargando catálogo de fallback para la Home...');
      const fallbackCondition = { ...whereCondition };
      delete fallbackCondition.destacado; // Quitamos el filtro de destacado
      fallbackCondition.visible = true;
      fallbackCondition.stock = { gt: 0 }; // Priorizar productos con stock disponible

      productsFromDb = await prisma.webProductoImagen.findMany({
        where: fallbackCondition,
        take: topLimit,
        orderBy: {
          fechaActualizacion: 'desc'
        }
      });

      // Si tampoco hay con stock, traer cualquier producto visible
      if (productsFromDb.length === 0) {
        delete fallbackCondition.stock;
        productsFromDb = await prisma.webProductoImagen.findMany({
          where: fallbackCondition,
          take: topLimit
        });
      }
    }

    const formattedProducts = productsFromDb.map(p => {
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
        visible: p.visible,
        hasEquivalents: p.hasEquivalents,
        isMock: false,
        lowStockThreshold,
        tags: productTagsMap[p.codart] || []
      };
    });

    // Filtrar por categorías deshabilitadas
    const finalProducts = formattedProducts.filter(p => {
      if (disabledCategories.includes(p.category)) {
        return false;
      }
      return true;
    });

    // Guardar en caché en Redis/Memoria
    await cache.set(cacheKey, finalProducts, cacheTtl);
    return NextResponse.json(finalProducts);

  } catch (error) {
    console.error('[API Products Search] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
