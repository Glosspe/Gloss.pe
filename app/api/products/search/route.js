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
      topLimit = 1000;
    } else if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        topLimit = Math.min(parsed, 1000);
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

    // Cargar CATEGORIES_TREE de caché o base de datos para la traducción inteligente de categorías
    let categoriesTree = [];
    try {
      const cachedTree = await cache.get('categories-tree');
      if (cachedTree) {
        categoriesTree = cachedTree;
      } else {
        const treeConfig = await prisma.webGlobalConfig.findUnique({
          where: { clave: 'CATEGORIES_TREE' }
        });
        if (treeConfig && treeConfig.valor) {
          categoriesTree = JSON.parse(treeConfig.valor);
          await cache.set('categories-tree', categoriesTree, 300);
        }
      }
    } catch (e) {
      console.warn('[API Products Search] Error al cargar categorías para traducción:', e.message);
    }

    // Filtro de Categoría Inteligente (Traducción de IDs de menú a nombres/códigos del ERP)
    if (category && category.trim() !== '' && category !== 'Todos') {
      if (category === 'Trending') {
        whereCondition.destacado = true;
      } else if (category.startsWith('FAM:')) {
        // Filtrar por familia completa (ej: FAM:05 -> Cabello)
        const famCode = category.replace('FAM:', '').trim();
        const familyData = categoriesTree.find(f => f.id === famCode);
        const subCatNames = familyData ? familyData.subcategories.map(s => s.name.toUpperCase()) : [];
        
        whereCondition.OR = [
          { codart: { startsWith: famCode } },
          ...(subCatNames.length > 0 ? [{ categoria: { in: subCatNames } }] : [])
        ];
      } else if (/^\d{2}-\d{2}$/.test(category) || /^\d{4}$/.test(category)) {
        // Filtrar por subcategoría específica (ej: "05-01" o "0501" -> Decoloradores)
        const cleanSubCode = category.replace('-', '').trim();
        const famCode = cleanSubCode.substring(0, 2);
        const subCodeWithDash = `${famCode}-${cleanSubCode.substring(2)}`;
        
        let subName = '';
        const familyData = categoriesTree.find(f => f.id === famCode);
        if (familyData) {
          const subData = familyData.subcategories.find(s => s.id === subCodeWithDash || s.id === cleanSubCode);
          if (subData) subName = subData.name.toUpperCase();
        }
        
        whereCondition.OR = [
          { codart: { startsWith: cleanSubCode } },
          ...(subName ? [{ categoria: { equals: subName, mode: 'insensitive' } }] : [])
        ];
      } else {
        // Fallback por texto directo
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

    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjQ2IiBmb250LXdlaWdodD0iNjAwIiBmaWxsPSIjRkYyRTkzIiBvcGFjaXR5PSIwLjEyIiBsZXR0ZXItc3BhY2luZz0iMC4xOGVtIj5HTE9TUzwvdGV4dD48L3N2Zz4=';

    // Consultar PostgreSQL — excluir campos pesados en queries masivos para reducir uso de RAM
    const selectFields = topLimit > 200 ? {
      codart: true, nombre: true, marca: true, precio: true, stock: true,
      categoria: true, imagenes: true, visible: true, destacado: true,
      hasEquivalents: true
    } : undefined; // undefined = seleccionar todo

    let productsFromDb = await prisma.webProductoImagen.findMany({
      where: whereCondition,
      take: topLimit,
      ...(selectFields ? { select: selectFields } : {})
    });

    // Fallback inteligente para la Home (Trending) si no hay suficientes productos destacados en la base de datos
    if (category === 'Trending' && productsFromDb.length < 24) {
      console.log('[API Products Search] Pocos o ningún producto destacado en base de datos. Autocompletando catálogo de fallback para la Home...');
      const fallbackCondition = { ...whereCondition };
      delete fallbackCondition.destacado; // Quitamos el filtro de destacado
      fallbackCondition.visible = true;
      
      // Excluir productos ya cargados para evitar duplicidad
      if (productsFromDb.length > 0) {
        fallbackCondition.codart = {
          notIn: productsFromDb.map(p => p.codart)
        };
      }

      const neededCount = 24 - productsFromDb.length;

      const additionalProducts = await prisma.webProductoImagen.findMany({
        where: fallbackCondition,
        take: neededCount,
        orderBy: {
          fechaActualizacion: 'desc'
        }
      });

      productsFromDb = [...productsFromDb, ...additionalProducts];
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
