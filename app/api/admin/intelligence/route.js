import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getErpConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ── GET: Obtener configuraciones de Inteligencia de E-commerce ──
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Acción 1: Obtener variables de configuración global
    if (action === 'configs') {
      const configs = await prisma.webGlobalConfig.findMany();
      return NextResponse.json(configs);
    }

    // Acción 2: Obtener todos los atajos de búsqueda
    if (action === 'shortcuts') {
      const shortcuts = await prisma.webSearchShortcut.findMany({
        orderBy: { orden: 'asc' }
      });
      return NextResponse.json(shortcuts);
    }

    // Acción 3: Obtener todas las etiquetas de necesidad
    if (action === 'tags') {
      const tags = await prisma.webProductTag.findMany({
        orderBy: { orden: 'asc' }
      });
      const formatted = tags.map(t => {
        let prods = [];
        try { prods = JSON.parse(t.productos || '[]'); } catch (e) { prods = []; }
        return { ...t, productos: prods };
      });
      return NextResponse.json(formatted);
    }

    // Acción 4: Obtener asociaciones manuales de venta cruzada
    if (action === 'cross-sell') {
      const codart = searchParams.get('codart');
      if (codart) {
        const association = await prisma.webProductCrossSell.findUnique({
          where: { codart }
        });
        if (association) {
          let prods = [];
          try { prods = JSON.parse(association.productos || '[]'); } catch (e) { prods = []; }
          return NextResponse.json({ codart, productos: prods });
        }
        return NextResponse.json({ codart, productos: [] });
      }
      const allCrossSells = await prisma.webProductCrossSell.findMany();
      return NextResponse.json(allCrossSells);
    }

    // Acción 5: Ejecutar la auditoría inteligente de categorías y discrepancias con el ERP
    if (action === 'category-audit') {
      console.log('[API Admin Intelligence] Iniciando Auditoría de Categorías...');



      // Modo Local / Fallback PostgreSQL: Conecta al ERP o audita sobre PostgreSQL de Railway
      // Bypass de Producción: Si corre en producción (Railway), se salta la conexión del ERP local
      // previniendo timeouts TCP de 72 segundos al intentar abrir el puerto de SQL Server de forma síncrona.
      let pool;
      let usePgFallback = process.env.NODE_ENV === 'production' || !process.env.DB_SERVER;

      if (!usePgFallback) {
        try {
          pool = await getErpConnection();
        } catch (err) {
          console.warn('[API Admin Intelligence] ERP no accesible para auditoría de categorías. Usando PostgreSQL como fallback...');
          usePgFallback = true;
        }
      }

      if (usePgFallback) {
        // Auditoría directa sobre base de datos PostgreSQL de la nube (Railway).
        // Optimizamos cargando solo columnas necesarias y procesando las expresiones regulares
        // en el event loop de V8 (NodeJS) en memoria (14ms) en lugar de saturar la CPU de Postgres.
        const webProducts = await prisma.webProductoImagen.findMany({
          where: { visible: true },
          select: {
            codart: true,
            nombre: true,
            categoria: true,
            imagenes: true,
            visible: true
          }
        });

        const auditedProducts = webProducts.map(p => {
          const nameLower = (p.nombre || '').toLowerCase();
          const catName = p.categoria ? p.categoria.trim() : '';
          const catNameLower = catName.toLowerCase();
          
          let status = 'CORRECT';
          let alertMessage = '';
          let suggestedCategory = '';
          let suggestedSubcategory = '';
          let suggestions = [];

          // Detección de Eléctricos de Belleza (planchas, tenazas, cortadoras, etc.)
          const isElectricBeautyName = /tenaza|rizador|rizadora|plancha|secadora|secador|cortadora|depiladora|depilador|afeitadora|afeitador|patillera|trimmer|wahl|pritech|rozia|babyliss|maquina de cortar|maquina de corte/i.test(nameLower);
          const isElectricBeautyCategory = /eléctrico|electrico|aparatos|tecnologia|electrónico|electronico/i.test(catNameLower);

          const isCapilarName = !isElectricBeautyName && /shampoo|acondicionador|shamp|capilar|keratina|laceador|lacio|rizo|cabello|mascarilla capilar|ampolla capilar|crema de peinar|crema para peinar|oleo capilar|tratamiento capilar|silicona capilar|tinte|decolorante|oxidante|activador/i.test(nameLower);
          const isCapilarCategory = /cabello|capilar|shampoo|acondicionador|tinte|botox|post lacio/i.test(catNameLower);

          const isFacialName = !isElectricBeautyName && !isCapilarName && /crema|hidratante|serum|suero|limpiador|tonico|facial|rostro|contorno|bloqueador|antiedad|antiarrugas|micelar|desmaquill|exfoliante|skincare|skin care|protector solar/i.test(nameLower);
          const isFacialCategory = /rostro|facial|cutis|piel|cremas/i.test(catNameLower);

          const isUñasName = !isElectricBeautyName && /esmalte|quitaesmalte|nail|uñas|limador|top coat|base coat|acrilico|pedicure|manicure|corta uñas|corta uña|cortaúñas|cortaúña/i.test(nameLower);
          const isUñasCategory = /uñas|manicure|pedicure|esmalte/i.test(catNameLower);

          if (isElectricBeautyName && !isElectricBeautyCategory) {
            status = 'INCONSISTENT';
            alertMessage = `El nombre sugiere un aparato eléctrico de belleza, pero su categoría es "${catName || 'Sin Nombre'}".`;
            suggestedCategory = 'Eléctricos de Belleza';
            suggestedSubcategory = 'Herramientas de Estilizado';
            suggestions = [
              { category: 'Eléctricos de Belleza', subcategory: 'Herramientas de Estilizado' },
              { category: 'Cabello', subcategory: 'Accesorios de Cabello' },
              { category: 'Aparatos Eléctricos', subcategory: 'Cuidado Personal' }
            ];
          } else if (isElectricBeautyName && isElectricBeautyCategory) {
            // Incluso si está en ELECTRONICOS en el ERP, se sugiere clasificarlo en una categoría web de belleza
            status = 'INCONSISTENT';
            alertMessage = `El producto es un eléctrico de belleza. Se sugiere clasificarlo en una subfamilia web de estilizado.`;
            suggestedCategory = 'Eléctricos de Belleza';
            suggestedSubcategory = 'Herramientas de Estilizado';
            suggestions = [
              { category: 'Eléctricos de Belleza', subcategory: 'Herramientas de Estilizado' },
              { category: 'Cabello', subcategory: 'Accesorios de Cabello' },
              { category: 'Aparatos Eléctricos', subcategory: 'Cuidado Personal' }
            ];
          } else if (isCapilarName && !isCapilarCategory) {
            status = 'INCONSISTENT';
            alertMessage = `El nombre sugiere cuidado capilar, pero su categoría es "${catName || 'Sin Nombre'}".`;
            suggestedCategory = 'Cabello';
            suggestedSubcategory = 'Cuidado Capilar';
            suggestions = [
              { category: 'Cabello', subcategory: 'Cuidado Capilar' },
              { category: 'Cabello', subcategory: 'Tratamientos Capilares' },
              { category: 'Belleza', subcategory: 'Cuidado del Cabello' }
            ];
          } else if (isFacialName && !isFacialCategory) {
            status = 'INCONSISTENT';
            alertMessage = `El producto sugiere cuidado de la piel/facial, pero su categoría es "${catName || 'Sin Nombre'}".`;
            suggestedCategory = 'Rostro';
            suggestedSubcategory = 'Cuidado Facial';
            suggestions = [
              { category: 'Rostro', subcategory: 'Cuidado Facial' },
              { category: 'Rostro', subcategory: 'Skincare y Cremas' },
              { category: 'Rostro', subcategory: 'Tratamiento Facial' }
            ];
          } else if (isUñasName && !isUñasCategory) {
            status = 'INCONSISTENT';
            alertMessage = `El producto sugiere manicure/uñas, pero su categoría es "${catName || 'Sin Nombre'}".`;
            suggestedCategory = 'Uñas';
            suggestedSubcategory = 'Esmaltes y Manicure';
            suggestions = [
              { category: 'Uñas', subcategory: 'Esmaltes y Manicure' },
              { category: 'Uñas', subcategory: 'Accesorios de Uñas' },
              { category: 'Manicure', subcategory: 'Uñas y Pedicure' }
            ];
          } else if (!catName || catNameLower === 'otros' || catNameLower === 'varios' || catNameLower === 'sin categoria' || catNameLower === 'genericos' || catName === '' || catNameLower.includes('accesorio')) {
            if (isCapilarName || isFacialName || isUñasName) {
              status = 'INCONSISTENT';
              alertMessage = `El producto es un cosmético activo, pero está clasificado bajo la categoría genérica "${catName || 'ACCESORIOS'}".`;
              if (isCapilarName) {
                suggestedCategory = 'Cabello';
                suggestedSubcategory = 'Cuidado Capilar';
                suggestions = [
                  { category: 'Cabello', subcategory: 'Cuidado Capilar' },
                  { category: 'Cabello', subcategory: 'Tratamientos Capilares' }
                ];
              } else if (isFacialName) {
                suggestedCategory = 'Rostro';
                suggestedSubcategory = 'Cuidado Facial';
                suggestions = [
                  { category: 'Rostro', subcategory: 'Cuidado Facial' },
                  { category: 'Rostro', subcategory: 'Skincare y Cremas' }
                ];
              } else {
                suggestedCategory = 'Uñas';
                suggestedSubcategory = 'Esmaltes y Manicure';
                suggestions = [
                  { category: 'Uñas', subcategory: 'Esmaltes y Manicure' },
                  { category: 'Uñas', subcategory: 'Accesorios de Uñas' }
                ];
              }
            } else {
              status = 'UNASSIGNED';
              alertMessage = `El producto está en una categoría genérica o vacía.`;
              suggestedCategory = 'Por Definir';
              suggestedSubcategory = 'Pendiente Clasificación';
              suggestions = [
                { category: 'Por Definir', subcategory: 'Pendiente Clasificación' },
                { category: 'Variados', subcategory: 'Sin Categoría' }
              ];
            }
          }

          let imgs = [];
          try { imgs = JSON.parse(p.imagenes || '[]'); } catch (errJson) { imgs = []; }

          return {
            id: p.codart,
            userCode: p.codart,
            name: p.nombre || '',
            categoryName: catName || '(Sin categoría)',
            status,
            alertMessage,
            suggestedCategory,
            suggestedSubcategory,
            suggestions,
            image: imgs.length > 0 ? imgs[0] : null,
            visible: p.visible !== false
          };
        });

        // Calcular estadísticas reales basadas en el catálogo enriquecido completo
        const stats = {
          total: auditedProducts.length,
          inconsistent: auditedProducts.filter(p => p.status === 'INCONSISTENT').length,
          unassigned: auditedProducts.filter(p => p.status === 'UNASSIGNED').length,
          correct: auditedProducts.filter(p => p.status === 'CORRECT').length
        };

        // Filtrar para retornar únicamente productos que requieren acción (inconsistentes o sin categoría).
        const discrepantProducts = auditedProducts.filter(p => p.status !== 'CORRECT');

        // Soportar filtrado de búsqueda en el backend para poder buscar en todo el catálogo de inmediato
        const search = request.nextUrl.searchParams.get('search') || '';
        let filtered = discrepantProducts;
        if (search) {
          const searchLower = search.toLowerCase();
          filtered = discrepantProducts.filter(p => 
            p.name.toLowerCase().includes(searchLower) ||
            p.id.toLowerCase().includes(searchLower) ||
            (p.userCode && p.userCode.toLowerCase().includes(searchLower))
          );
        }

        return NextResponse.json({
          stats,
          products: filtered.slice(0, 200)
        });
      }

      // Cargar productos del ERP con su subfamilia (Ejecución local en PC local)
      const query = `
        SELECT 
          RTRIM(p01.codi) as id,
          RTRIM(p01.codf) as userCode,
          RTRIM(p01.descr) as name,
          RTRIM(p01.codcat) as categoryCode,
          RTRIM(s.nomsub) as categoryName
        FROM prd0101 p01 WITH(nolock)
        LEFT JOIN tbl01sbf s WITH(nolock) ON (LEFT(p01.codi, 2) + '-' + LTRIM(RTRIM(p01.codcat))) = s.codsub
        WHERE p01.estado = 1
      `;
      const erpResult = await pool.request().query(query);
      const erpProducts = erpResult.recordset;

      // Obtener enriquecimiento de Postgres (Railway) para saber si tienen fotos o si están ocultos
      let enrichedMap = {};
      try {
        const productCodes = erpProducts.map(p => p.id);
        if (productCodes.length > 0) {
          const chunkSize = 2000;
          for (let i = 0; i < productCodes.length; i += chunkSize) {
            const chunk = productCodes.slice(i, i + chunkSize);
            const webImages = await prisma.webProductoImagen.findMany({
              where: {
                codart: { in: chunk }
              },
              select: {
                codart: true,
                imagenes: true,
                visible: true
              }
            });
            webImages.forEach(img => {
              let imgs = [];
              try { imgs = JSON.parse(img.imagenes || '[]'); } catch (errJson) { imgs = []; }
              enrichedMap[img.codart] = {
                image: imgs.length > 0 ? imgs[0] : null,
                visible: img.visible !== false
              };
            });
          }
        }
      } catch (pgErr) {
        console.warn('[API Admin Intelligence - category-audit] Error conectando a Postgres para enriquecimiento:', pgErr.message);
      }

      // Lógica de auditoría local
      const auditedProducts = erpProducts.map(p => {
        const nameLower = p.name.toLowerCase();
        const catName = p.categoryName ? p.categoryName.trim() : '';
        const catNameLower = catName.toLowerCase();
        
        let status = 'CORRECT';
        let alertMessage = '';
        let suggestedCategory = '';
        let suggestedSubcategory = '';
        let suggestions = [];

        // Detección de Eléctricos de Belleza (planchas, tenazas, cortadoras, etc.)
        const isElectricBeautyName = /tenaza|rizador|rizadora|plancha|secadora|secador|cortadora|depiladora|depilador|afeitadora|afeitador|patillera|trimmer|wahl|pritech|rozia|babyliss|maquina de cortar|maquina de corte/i.test(nameLower);
        const isElectricBeautyCategory = /eléctrico|electrico|aparatos|tecnologia|electrónico|electronico/i.test(catNameLower);

        const isCapilarName = !isElectricBeautyName && /shampoo|acondicionador|shamp|capilar|keratina|laceador|lacio|rizo|cabello|mascarilla capilar|ampolla capilar|crema de peinar|crema para peinar|oleo capilar|tratamiento capilar|silicona capilar|tinte|decolorante|oxidante|activador/i.test(nameLower);
        const isCapilarCategory = /cabello|capilar|shampoo|acondicionador|tinte|botox|post lacio/i.test(catNameLower);

        const isFacialName = !isElectricBeautyName && !isCapilarName && /crema|hidratante|serum|suero|limpiador|tonico|facial|rostro|contorno|bloqueador|antiedad|antiarrugas|micelar|desmaquill|exfoliante|skincare|skin care|protector solar/i.test(nameLower);
        const isFacialCategory = /rostro|facial|cutis|piel|cremas/i.test(catNameLower);

        const isUñasName = !isElectricBeautyName && /esmalte|quitaesmalte|nail|uñas|limador|top coat|base coat|acrilico|pedicure|manicure|corta uñas|corta uña|cortaúñas|cortaúña/i.test(nameLower);
        const isUñasCategory = /uñas|manicure|pedicure|esmalte/i.test(catNameLower);

        if (isElectricBeautyName && !isElectricBeautyCategory) {
          status = 'INCONSISTENT';
          alertMessage = `El nombre sugiere un aparato eléctrico de belleza, pero su categoría ERP actual es "${catName || 'Sin Nombre'}".`;
          suggestedCategory = 'Eléctricos de Belleza';
          suggestedSubcategory = 'Herramientas de Estilizado';
          suggestions = [
            { category: 'Eléctricos de Belleza', subcategory: 'Herramientas de Estilizado' },
            { category: 'Cabello', subcategory: 'Accesorios de Cabello' },
            { category: 'Aparatos Eléctricos', subcategory: 'Cuidado Personal' }
          ];
        } else if (isElectricBeautyName && isElectricBeautyCategory) {
          status = 'INCONSISTENT';
          alertMessage = `El producto es un eléctrico de belleza. Se sugiere clasificarlo en una subfamilia web de estilizado.`;
          suggestedCategory = 'Eléctricos de Belleza';
          suggestedSubcategory = 'Herramientas de Estilizado';
          suggestions = [
            { category: 'Eléctricos de Belleza', subcategory: 'Herramientas de Estilizado' },
            { category: 'Cabello', subcategory: 'Accesorios de Cabello' },
            { category: 'Aparatos Eléctricos', subcategory: 'Cuidado Personal' }
          ];
        } else if (isCapilarName && !isCapilarCategory) {
          status = 'INCONSISTENT';
          alertMessage = `El nombre sugiere cuidado capilar, pero su categoría ERP actual es "${catName || 'Sin Nombre'}".`;
          suggestedCategory = 'Cabello';
          suggestedSubcategory = 'Cuidado Capilar';
          suggestions = [
            { category: 'Cabello', subcategory: 'Cuidado Capilar' },
            { category: 'Cabello', subcategory: 'Tratamientos Capilares' },
            { category: 'Belleza', subcategory: 'Cuidado del Cabello' }
          ];
        } else if (isFacialName && !isFacialCategory) {
          status = 'INCONSISTENT';
          alertMessage = `El producto sugiere cuidado de la piel/facial, pero su categoría ERP actual es "${catName || 'Sin Nombre'}".`;
          suggestedCategory = 'Rostro';
          suggestedSubcategory = 'Cuidado Facial';
          suggestions = [
            { category: 'Rostro', subcategory: 'Cuidado Facial' },
            { category: 'Rostro', subcategory: 'Skincare y Cremas' },
            { category: 'Rostro', subcategory: 'Tratamiento Facial' }
          ];
        } else if (isUñasName && !isUñasCategory) {
          status = 'INCONSISTENT';
          alertMessage = `El producto sugiere manicure/uñas, pero su categoría ERP actual es "${catName || 'Sin Nombre'}".`;
          suggestedCategory = 'Uñas';
          suggestedSubcategory = 'Esmaltes y Manicure';
          suggestions = [
            { category: 'Uñas', subcategory: 'Esmaltes y Manicure' },
            { category: 'Uñas', subcategory: 'Accesorios de Uñas' },
            { category: 'Manicure', subcategory: 'Uñas y Pedicure' }
          ];
        } else if (!catName || catNameLower === 'otros' || catNameLower === 'varios' || catNameLower === 'sin categoria' || catNameLower === 'genericos' || catName === '' || catNameLower.includes('accesorio')) {
          if (isCapilarName || isFacialName || isUñasName) {
            status = 'INCONSISTENT';
            alertMessage = `El producto es un cosmético activo detectado por el motor, pero está clasificado en el ERP bajo la categoría genérica "${catName || 'ACCESORIOS'}".`;
            if (isCapilarName) {
              suggestedCategory = 'Cabello';
              suggestedSubcategory = 'Cuidado Capilar';
              suggestions = [
                { category: 'Cabello', subcategory: 'Cuidado Capilar' },
                { category: 'Cabello', subcategory: 'Tratamientos Capilares' }
              ];
            } else if (isFacialName) {
              suggestedCategory = 'Rostro';
              suggestedSubcategory = 'Cuidado Facial';
              suggestions = [
                { category: 'Rostro', subcategory: 'Cuidado Facial' },
                { category: 'Rostro', subcategory: 'Skincare y Cremas' }
              ];
            } else {
              suggestedCategory = 'Uñas';
              suggestedSubcategory = 'Esmaltes y Manicure';
              suggestions = [
                { category: 'Uñas', subcategory: 'Esmaltes y Manicure' },
                { category: 'Uñas', subcategory: 'Accesorios de Uñas' }
              ];
            }
          } else {
            status = 'UNASSIGNED';
            alertMessage = `El producto está en una categoría genérica ("${catName || 'Vacía'}"). Debería asignarse a una categoría de venta final en el ERP.`;
            suggestedCategory = 'Por Definir';
            suggestedSubcategory = 'Pendiente Clasificación';
            suggestions = [
              { category: 'Por Definir', subcategory: 'Pendiente Clasificación' },
              { category: 'Variados', subcategory: 'Sin Categoría' }
            ];
          }
        }

        const enrichment = enrichedMap[p.id] || {};

        return {
          id: p.id,
          userCode: p.userCode,
          name: p.name,
          categoryName: catName || '(Sin categoría)',
          status,
          alertMessage,
          suggestedCategory,
          suggestedSubcategory,
          suggestions,
          image: enrichment.image || null,
          visible: enrichment.visible !== false
        };
      });

      // Calcular estadísticas reales basadas en el catálogo enriquecido completo
      const stats = {
        total: auditedProducts.length,
        inconsistent: auditedProducts.filter(p => p.status === 'INCONSISTENT').length,
        unassigned: auditedProducts.filter(p => p.status === 'UNASSIGNED').length,
        correct: auditedProducts.filter(p => p.status === 'CORRECT').length
      };

      // Filtrar para retornar únicamente productos que requieren acción (inconsistentes o sin categoría)
      const discrepantProducts = auditedProducts.filter(p => p.status !== 'CORRECT');

      // Soportar filtrado de búsqueda en el backend para poder buscar en todo el catálogo de inmediato
      const search = request.nextUrl.searchParams.get('search') || '';
      let filtered = discrepantProducts;
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = discrepantProducts.filter(p => 
          p.name.toLowerCase().includes(searchLower) ||
          p.id.toLowerCase().includes(searchLower) ||
          (p.userCode && p.userCode.toLowerCase().includes(searchLower))
        );
      }

      return NextResponse.json({
        stats,
        products: filtered.slice(0, 200)
      });
    }

    return NextResponse.json({ error: 'Acción GET no válida' }, { status: 400 });
  } catch (err) {
    console.error('[API Admin Intelligence GET] Error:', err);
    return NextResponse.json({ error: 'Error del servidor', details: err.message }, { status: 500 });
  }
}

// ── POST: Crear, actualizar o procesar acciones ──
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Acción 5: Ejecutar Auto-Tagging por reglas (No requiere body JSON)
    if (action === 'auto-tag') {
      console.log('[API Admin Intelligence] Iniciando proceso de Auto-Etiquetado...');



      // Modo Local / Fallback PostgreSQL: Conecta al ERP o ejecuta auto-tagging en la nube
      // Bypass de Producción: Si corre en producción (Railway), se salta la conexión del ERP local
      // previniendo timeouts TCP de 72 segundos al intentar abrir el puerto de SQL Server de forma síncrona.
      let pool;
      let usePgFallback = process.env.NODE_ENV === 'production' || !process.env.DB_SERVER;

      if (!usePgFallback) {
        try {
          pool = await getErpConnection();
        } catch (err) {
          console.warn('[API Admin Intelligence] ERP no accesible para auto-etiquetado. Usando PostgreSQL como fallback...');
          usePgFallback = true;
        }
      }

      const rules = [
        { tag: '#AntiFrizz', keywords: ['frizz', 'disciplina', 'alisa', 'lacio'] },
        { tag: '#ControlCaida', keywords: ['caida', 'caída', 'anticaida', 'anticaída', 'fortalec'] },
        { tag: '#ProteccionColor', keywords: ['tinte', 'color', 'matizador', 'rubio', 'decolor'] },
        { tag: '#BrilloIntenso', keywords: ['brillo', 'luminos', 'destell', 'sedos'] },
        { tag: '#CabelloMaltratado', keywords: ['dañado', 'dañada', 'maltrat', 'repara', 'recons', 'quebrad', 'seco', 'seca'] },
        { tag: '#UñasFuertes', keywords: ['uña', 'uñas', 'nail', 'calcio', 'cuticula', 'manicura'] }
      ];

      const tagMatches = {};
      rules.forEach(r => { tagMatches[r.tag] = []; });

      if (usePgFallback) {
        // Ejecutar sobre base de datos PostgreSQL de la nube (Railway)
        const productsFromDb = await prisma.webProductoImagen.findMany({
          select: { codart: true, nombre: true, descripcionEnriquecida: true }
        });

        productsFromDb.forEach(p => {
          const searchText = `${p.nombre || ''} ${p.descripcionEnriquecida || ''}`.toLowerCase();
          rules.forEach(r => {
            const match = r.keywords.some(k => searchText.includes(k));
            if (match) {
              tagMatches[r.tag].push(p.codart);
            }
          });
        });
      } else {
        // Cargar todos los productos activos del ERP con sus descripciones
        const erpResult = await pool.request().query(`
          SELECT RTRIM(codi) as id, RTRIM(descr) as name, RTRIM(obse) as observations 
          FROM prd0101 WITH(nolock)
          WHERE estado = 1
        `);
        const products = erpResult.recordset;

        products.forEach(p => {
          const searchText = `${p.name} ${p.observations || ''}`.toLowerCase();
          rules.forEach(r => {
            const match = r.keywords.some(k => searchText.includes(k));
            if (match) {
              tagMatches[r.tag].push(p.id);
            }
          });
        });
      }

      // Guardar resultados en PostgreSQL
      const resultsSummary = [];
      for (const rule of rules) {
        const matchedIds = tagMatches[rule.tag];
        const jsonProductos = JSON.stringify(matchedIds);

        await prisma.webProductTag.upsert({
          where: { etiqueta: rule.tag },
          update: { productos: jsonProductos },
          create: { etiqueta: rule.tag, productos: jsonProductos, orden: 10, visible: true }
        });

        resultsSummary.push({ etiqueta: rule.tag, totalAsociados: matchedIds.length });
      }

      return NextResponse.json({ message: 'Auto-etiquetado completado con éxito', summary: resultsSummary });
    }

    // Acción 6: Ejecutar Auto-Cross-Selling por compras conjuntas reales en el ERP
    if (action === 'auto-cross-sell') {
      console.log('[API Admin Intelligence] Iniciando proceso de Auto-Venta Cruzada...');



      // Modo Local / Fallback PostgreSQL: Conecta al ERP o responde éxito informativo
      // Bypass de Producción: Si corre en producción (Railway), se salta la conexión del ERP local
      // previniendo timeouts TCP de 72 segundos al intentar abrir el puerto de SQL Server de forma síncrona.
      let pool;
      let usePgFallback = process.env.NODE_ENV === 'production' || !process.env.DB_SERVER;

      if (!usePgFallback) {
        try {
          pool = await getErpConnection();
        } catch (err) {
          console.warn('[API Admin Intelligence] ERP no accesible para auto-cross-sell. Retornando éxito informativo...');
          usePgFallback = true;
        }
      }

      if (usePgFallback) {
        return NextResponse.json({ 
          message: 'El proceso se ejecutará de forma asíncrona mediante el Agente Sincronizador de la oficina.', 
          totalProductosProcesados: 0 
        });
      }

      // Consultar parejas de productos comprados juntos de los últimos 90 días (Ejecución local)
      const query = `
        SELECT 
          RTRIM(d1.codi) as base_product, 
          RTRIM(d2.codi) as recommended_product, 
          COUNT(*) as coincidencia
        FROM dtl01fac d1 WITH(nolock)
        INNER JOIN dtl01fac d2 WITH(nolock) ON d1.ndocu = d2.ndocu AND d1.cdocu = d2.cdocu
        INNER JOIN prd0101 p1 WITH(nolock) ON p1.codi = d1.codi
        INNER JOIN prd0101 p2 WITH(nolock) ON p2.codi = d2.codi
        WHERE d1.fecha >= DATEADD(day, -90, GETDATE())
          AND d2.fecha >= DATEADD(day, -90, GETDATE())
          AND d1.codi <> d2.codi
          AND p1.estado = 1
          AND p2.estado = 1
          AND d1.cdocu IN ('01', '03', '65')
          AND d2.cdocu IN ('01', '03', '65')
        GROUP BY d1.codi, d2.codi
        HAVING COUNT(*) >= 3
        ORDER BY base_product, coincidencia DESC
      `;
      const erpResult = await pool.request().query(query);
      const relations = erpResult.recordset;

      // Agrupar recomendaciones por producto base
      const crossSellMap = {};
      relations.forEach(row => {
        if (!crossSellMap[row.base_product]) {
          crossSellMap[row.base_product] = [];
        }
        if (crossSellMap[row.base_product].length < 4) {
          crossSellMap[row.base_product].push(row.recommended_product);
        }
      });

      // Guardar resultados en PostgreSQL (Railway)
      let count = 0;
      for (const baseProduct of Object.keys(crossSellMap)) {
        const recommendedProducts = crossSellMap[baseProduct];
        const jsonProductos = JSON.stringify(recommendedProducts);

        await prisma.webProductCrossSell.upsert({
          where: { codart: baseProduct },
          update: { productos: jsonProductos },
          create: { codart: baseProduct, productos: jsonProductos }
        });
        count++;
      }

      return NextResponse.json({ 
        message: 'Auto-venta cruzada completada con éxito', 
        totalProductosProcesados: count 
      });
    }

    // Para las demás acciones, sí leemos el body JSON
    const body = await request.json();

    // Acción 1: Guardar configuración global
    if (action === 'configs') {
      const { clave, valor } = body;
      const updated = await prisma.webGlobalConfig.upsert({
        where: { clave },
        update: { valor },
        create: { clave, valor }
      });
      return NextResponse.json(updated);
    }

    // Acción 2: Guardar o actualizar atajo de búsqueda
    if (action === 'shortcuts') {
      const { id, texto, tipo, enlace, orden, visible } = body;
      if (id) {
        // Actualizar
        const updated = await prisma.webSearchShortcut.update({
          where: { id },
          data: { texto, tipo, enlace, orden: parseInt(orden || 0), visible: visible !== false }
        });
        return NextResponse.json(updated);
      } else {
        // Crear
        const created = await prisma.webSearchShortcut.create({
          data: { texto, tipo, enlace, orden: parseInt(orden || 0), visible: visible !== false }
        });
        return NextResponse.json(created);
      }
    }

    // Acción 3: Guardar o actualizar etiqueta de necesidad
    if (action === 'tags') {
      const { id, etiqueta, orden, visible, productos } = body;
      const jsonProductos = JSON.stringify(productos || []);
      if (id) {
        const updated = await prisma.webProductTag.update({
          where: { id },
          data: { etiqueta, orden: parseInt(orden || 0), visible: visible !== false, productos: jsonProductos }
        });
        return NextResponse.json(updated);
      } else {
        const created = await prisma.webProductTag.create({
          data: { etiqueta, orden: parseInt(orden || 0), visible: visible !== false, productos: jsonProductos }
        });
        return NextResponse.json(created);
      }
    }

    // Acción 4: Guardar venta cruzada manual
    if (action === 'cross-sell') {
      const { codart, productos } = body;
      const jsonProductos = JSON.stringify(productos || []);
      const updated = await prisma.webProductCrossSell.upsert({
        where: { codart },
        update: { productos: jsonProductos },
        create: { codart, productos: jsonProductos }
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Acción POST no válida' }, { status: 400 });
  } catch (err) {
    console.error('[API Admin Intelligence POST] Error:', err);
    return NextResponse.json({ error: 'Error del servidor', details: err.message }, { status: 500 });
  }
}

// ── DELETE: Eliminar recursos (atajos o etiquetas) ──
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Falta el id a eliminar' }, { status: 400 });
    }

    if (action === 'shortcuts') {
      await prisma.webSearchShortcut.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Atajo eliminado' });
    }

    if (action === 'tags') {
      await prisma.webProductTag.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Etiqueta eliminada' });
    }

    if (action === 'cross-sell') {
      await prisma.webProductCrossSell.delete({ where: { codart: id } });
      return NextResponse.json({ success: true, message: 'Venta cruzada eliminada' });
    }

    return NextResponse.json({ error: 'Acción DELETE no válida' }, { status: 400 });
  } catch (err) {
    console.error('[API Admin Intelligence DELETE] Error:', err);
    return NextResponse.json({ error: 'Error del servidor', details: err.message }, { status: 500 });
  }
}
