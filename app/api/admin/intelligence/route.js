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
