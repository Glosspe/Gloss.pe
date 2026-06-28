import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getErpConnection } from '@/lib/db';

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

      // Modo Proxy: Si la variable de entorno LOCAL_API_URL está presente (ej. en Railway),
      // redirige la petición a la API local que corre en la PC del usuario a través del túnel de ngrok.
      const localApiUrl = process.env.LOCAL_API_URL;
      if (localApiUrl) {
        console.log(`[API Admin Intelligence - PROXY MODE] Redirigiendo category-audit a la API local: ${localApiUrl}/api/admin/intelligence?action=category-audit`);
        try {
          const cleanApiUrl = localApiUrl.replace(/\/$/, '');
          const targetUrl = `${cleanApiUrl}/api/admin/intelligence?action=category-audit`;
          
          const authHeader = request.headers.get('Authorization') || '';

          const res = await fetch(targetUrl, {
            method: 'GET',
            headers: { 
              'Authorization': authHeader 
            },
            cache: 'no-store'
          });
          
          if (res.ok) {
            const data = await res.json();
            return NextResponse.json(data);
          } else {
            const errorText = await res.text();
            console.warn(`[API Admin Intelligence - PROXY MODE] La API local retornó status ${res.status}: ${errorText}`);
            return NextResponse.json(
              { error: 'La API local del ERP retornó un error durante la auditoría', details: errorText },
              { status: res.status }
            );
          }
        } catch (proxyErr) {
          console.error(`[API Admin Intelligence - PROXY MODE] Error conectando a la API local a través del túnel:`, proxyErr.message);
          return NextResponse.json(
            { error: 'El servidor local del ERP no está disponible para auditoría a través del túnel', details: proxyErr.message },
            { status: 503 }
          );
        }
      }

      // Modo Local: Se ejecuta en la PC del usuario conectando al ERP local (SQL Server)
      let pool;
      try {
        pool = await getErpConnection();
      } catch (err) {
        console.error('[API Admin Intelligence] Error al obtener conexion del ERP:', err);
        return NextResponse.json({ 
          error: 'ERP no accesible para auditoría de categorías', 
          details: err.message 
        }, { status: 503 });
      }

      // Cargar productos del ERP con su subfamilia
      const query = `
        SELECT 
          RTRIM(p01.codi) as id,
          RTRIM(p01.codart) as userCode,
          RTRIM(p01.descr) as name,
          RTRIM(p01.codcat) as categoryCode,
          RTRIM(s.nomsub) as categoryName
        FROM prd0101 p01 WITH(nolock)
        LEFT JOIN tbl01sbf s WITH(nolock) ON (LEFT(p01.codi, 2) + '-' + LTRIM(RTRIM(p01.codcat))) = s.codsub
        WHERE p01.estado = 1
      `;
      const res = await pool.request().query(query);
      const erpProducts = res.recordset;

      // Obtener enriquecimiento de Postgres (Railway) para saber si tienen fotos o si están ocultos
      let enrichedMap = {};
      try {
        const productCodes = erpProducts.map(p => p.id);
        if (productCodes.length > 0) {
          // Dividir en bloques de 2000 para evitar que Prisma falle si hay miles de productos
          const chunkSize = 2000;
          for (let i = 0; i < productCodes.length; i += chunkSize) {
            const chunk = productCodes.slice(i, i + chunkSize);
            const webImages = await prisma.webProductoImagen.findMany({
              where: {
                codart: { in: chunk }
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

      // Lógica de auditoría
      const auditedProducts = erpProducts.map(p => {
        const nameLower = p.name.toLowerCase();
        const catName = p.categoryName ? p.categoryName.trim() : '';
        const catNameLower = catName.toLowerCase();
        
        let status = 'CORRECT';
        let alertMessage = '';
        let suggestedCategory = '';
        let suggestedSubcategory = '';

        // Diccionario de categorías sugeridas
        // Regla 1: Capilar/Cabello
        const isCapilarName = /shampoo|acondicionador|shamp|capilar|keratina|laceador|lacio|rizo|cabello|mascarilla capilar|ampolla capilar/i.test(nameLower);
        const isCapilarCategory = /cabello|capilar|shampoo|acondicionador/i.test(catNameLower);

        // Regla 2: Rostro/Facial/Skin Care
        const isFacialName = /crema facial|serum|suero|limpiador facial|tonico|facial|rostro|contorno de ojos|bloqueador facial|gel limpiador|antiarrugas|antiedad/i.test(nameLower);
        const isFacialCategory = /rostro|facial|cutis|piel/i.test(catNameLower);

        // Regla 3: Uñas
        const isUñasName = /esmalte|quitaesmalte|nail|uñas|limador|top coat|base coat|acrilico/i.test(nameLower);
        const isUñasCategory = /uñas|manicure|pedicure|esmalte/i.test(catNameLower);

        // Evaluar discrepancias
        if (isCapilarName && !isCapilarCategory && !catNameLower.includes('cabello') && !catNameLower.includes('capilar')) {
          status = 'INCONSISTENT';
          alertMessage = `El nombre contiene palabras capilares, pero su categoría ERP actual es "${catName || 'Sin Nombre'}".`;
          suggestedCategory = 'Cabello';
          suggestedSubcategory = 'Cuidado Capilar';
        } else if (isFacialName && !isFacialCategory && !catNameLower.includes('facial') && !catNameLower.includes('rostro')) {
          status = 'INCONSISTENT';
          alertMessage = `El nombre del producto sugiere cuidado facial, pero su categoría ERP actual es "${catName || 'Sin Nombre'}".`;
          suggestedCategory = 'Rostro';
          suggestedSubcategory = 'Cuidado Facial';
        } else if (isUñasName && !isUñasCategory && !catNameLower.includes('uñas') && !catNameLower.includes('esmalte')) {
          status = 'INCONSISTENT';
          alertMessage = `El producto sugiere manicure/uñas, pero su categoría ERP actual es "${catName || 'Sin Nombre'}".`;
          suggestedCategory = 'Uñas';
          suggestedSubcategory = 'Esmaltes y Manicure';
        } else if (!catName || catNameLower === 'otros' || catNameLower === 'varios' || catNameLower === 'sin categoria' || catNameLower === 'genericos' || catName === '') {
          status = 'UNASSIGNED';
          alertMessage = `El producto está en una categoría genérica ("${catName || 'Vacía'}"). Debería asignarse a una categoría de venta final.`;
          
          // Sugerir en base al nombre
          if (isCapilarName) {
            suggestedCategory = 'Cabello';
            suggestedSubcategory = 'Cuidado Capilar';
          } else if (isFacialName) {
            suggestedCategory = 'Rostro';
            suggestedSubcategory = 'Cuidado Facial';
          } else if (isUñasName) {
            suggestedCategory = 'Uñas';
            suggestedSubcategory = 'Esmaltes y Manicure';
          } else {
            suggestedCategory = 'Por Definir';
            suggestedSubcategory = 'Pendiente Clasificación';
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
          image: enrichment.image || null,
          visible: enrichment.visible !== false
        };
      });

      return NextResponse.json(auditedProducts);
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

      // Modo Proxy: Si la variable de entorno LOCAL_API_URL está presente (ej. en Railway),
      // redirige la petición a la API local que corre en la PC del usuario a través del túnel de ngrok.
      const localApiUrl = process.env.LOCAL_API_URL;
      if (localApiUrl) {
        console.log(`[API Admin Intelligence - PROXY MODE] Redirigiendo auto-tag a la API local: ${localApiUrl}/api/admin/intelligence?action=auto-tag`);
        try {
          const cleanApiUrl = localApiUrl.replace(/\/$/, '');
          const targetUrl = `${cleanApiUrl}/api/admin/intelligence?action=auto-tag`;
          
          const authHeader = request.headers.get('Authorization') || '';

          const res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': authHeader 
            },
            cache: 'no-store'
          });
          
          if (res.ok) {
            const data = await res.json();
            return NextResponse.json(data);
          } else {
            const errorText = await res.text();
            console.warn(`[API Admin Intelligence - PROXY MODE] La API local retornó status ${res.status}: ${errorText}`);
            return NextResponse.json(
              { error: 'La API local del ERP retornó un error durante el auto-etiquetado', details: errorText },
              { status: res.status }
            );
          }
        } catch (proxyErr) {
          console.error(`[API Admin Intelligence - PROXY MODE] Error conectando a la API local a través del túnel:`, proxyErr.message);
          return NextResponse.json(
            { error: 'El servidor local del ERP no está disponible para auto-etiquetado a través del túnel', details: proxyErr.message },
            { status: 503 }
          );
        }
      }

      // Modo Local: Se ejecuta directamente en la PC del usuario conectando al ERP local
      let pool;
      try {
        pool = await getErpConnection();
      } catch (err) {
        console.error('[API Admin Intelligence] Error al obtener conexion del ERP:', err);
        return NextResponse.json({ 
          error: 'ERP no accesible para auto-etiquetado', 
          details: err.message, 
          stack: err.stack 
        }, { status: 503 });
      }

      // Cargar todos los productos activos del ERP con sus descripciones
      const res = await pool.request().query(`
        SELECT RTRIM(codi) as id, RTRIM(descr) as name, RTRIM(obse) as observations 
        FROM prd0101 WITH(nolock)
        WHERE estado = 1
      `);
      const products = res.recordset;

      // Reglas de auto-etiquetado configuradas en código
      const rules = [
        { tag: '#AntiFrizz', keywords: ['frizz', 'disciplina', 'alisa', 'lacio'] },
        { tag: '#ControlCaida', keywords: ['caida', 'caída', 'anticaida', 'anticaída', 'fortalec'] },
        { tag: '#ProteccionColor', keywords: ['tinte', 'color', 'matizador', 'rubio', 'decolor'] },
        { tag: '#BrilloIntenso', keywords: ['brillo', 'luminos', 'destell', 'sedos'] },
        { tag: '#CabelloMaltratado', keywords: ['dañado', 'dañada', 'maltrat', 'repara', 'recons', 'quebrad', 'seco', 'seca'] },
        { tag: '#UñasFuertes', keywords: ['uña', 'uñas', 'nail', 'calcio', 'cuticula', 'manicura'] }
      ];

      // Mapear acumuladores de productos por etiqueta
      const tagMatches = {};
      rules.forEach(r => { tagMatches[r.tag] = []; });

      products.forEach(p => {
        const searchText = `${p.name} ${p.observations || ''}`.toLowerCase();
        rules.forEach(r => {
          const match = r.keywords.some(k => searchText.includes(k));
          if (match) {
            tagMatches[r.tag].push(p.id);
          }
        });
      });

      // Guardar resultados en PostgreSQL
      const resultsSummary = [];
      for (const rule of rules) {
        const matchedIds = tagMatches[rule.tag];
        const jsonProductos = JSON.stringify(matchedIds);

        const dbTag = await prisma.webProductTag.upsert({
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

      // Modo Proxy: Si la variable de entorno LOCAL_API_URL está presente (ej. en Railway),
      // redirige la petición a la API local que corre en la PC del usuario a través del túnel de ngrok.
      const localApiUrl = process.env.LOCAL_API_URL;
      if (localApiUrl) {
        console.log(`[API Admin Intelligence - PROXY MODE] Redirigiendo auto-cross-sell a la API local: ${localApiUrl}/api/admin/intelligence?action=auto-cross-sell`);
        try {
          const cleanApiUrl = localApiUrl.replace(/\/$/, '');
          const targetUrl = `${cleanApiUrl}/api/admin/intelligence?action=auto-cross-sell`;
          
          const authHeader = request.headers.get('Authorization') || '';

          const res = await fetch(targetUrl, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': authHeader 
            },
            cache: 'no-store'
          });
          
          if (res.ok) {
            const data = await res.json();
            return NextResponse.json(data);
          } else {
            const errorText = await res.text();
            console.warn(`[API Admin Intelligence - PROXY MODE] La API local retornó status ${res.status}: ${errorText}`);
            return NextResponse.json(
              { error: 'La API local del ERP retornó un error durante el auto-cross-sell', details: errorText },
              { status: res.status }
            );
          }
        } catch (proxyErr) {
          console.error(`[API Admin Intelligence - PROXY MODE] Error conectando a la API local a través del túnel:`, proxyErr.message);
          return NextResponse.json(
            { error: 'El servidor local del ERP no está disponible para auto-cross-sell a través del túnel', details: proxyErr.message },
            { status: 503 }
          );
        }
      }

      // Modo Local: Se conecta al ERP local (SQL Server)
      let pool;
      try {
        pool = await getErpConnection();
      } catch (err) {
        console.error('[API Admin Intelligence] Error al obtener conexion del ERP:', err);
        return NextResponse.json({ 
          error: 'ERP no accesible para auto-cross-sell', 
          details: err.message, 
          stack: err.stack 
        }, { status: 503 });
      }

      // Consultar parejas de productos comprados juntos de los últimos 90 días
      // Filtramos para coincidencia >= 3 para asegurar relevancia real y optimizar velocidad
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
      const res = await pool.request().query(query);
      const relations = res.recordset;

      // Agrupar recomendaciones por producto base
      const crossSellMap = {};
      relations.forEach(row => {
        if (!crossSellMap[row.base_product]) {
          crossSellMap[row.base_product] = [];
        }
        // Top 4 recomendaciones por producto
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

    return NextResponse.json({ error: 'Acción DELETE no válida' }, { status: 400 });
  } catch (err) {
    console.error('[API Admin Intelligence DELETE] Error:', err);
    return NextResponse.json({ error: 'Error del servidor', details: err.message }, { status: 500 });
  }
}
