import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/auth';
import { getErpConnection } from '@/lib/db';
import sql from 'mssql';

export const dynamic = 'force-dynamic';

// GET: Obtener clientes registrados con estadísticas agregadas de pedidos (Consulta híbrida PostgreSQL + Navasoft ERP)
export async function GET(request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // 1. Buscar en PostgreSQL local
    const where = {};
    if (search) {
      where.OR = [
        { documento: { contains: search, mode: 'insensitive' } },
        { nombre: { contains: search, mode: 'insensitive' } },
        { telefono: { contains: search, mode: 'insensitive' } },
        { correo: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [clientesLocales, totalLocales] = await Promise.all([
      prisma.webCliente.findMany({
        where,
        orderBy: { fechaRegistro: 'desc' },
        skip,
        take: limit
      }),
      prisma.webCliente.count({ where })
    ]);

    let clientesFinales = [...clientesLocales];
    let totalItems = totalLocales;

    // 2. Si hay búsqueda activa, consultar de forma segura también a Navasoft ERP
    let erpClientes = [];
    if (search) {
      let pool;
      let usePgFallback = process.env.NODE_ENV === 'production' || !process.env.DB_SERVER;

      if (!usePgFallback) {
        try {
          pool = await getErpConnection();
          const cleanSearch = search.trim();
          const erpRes = await pool.request()
            .input('search', sql.VarChar(100), `%${cleanSearch}%`)
            .query(`
              SELECT TOP 10 
                RTRIM(codcli) as codcli, 
                RTRIM(nomcli) as nomcli, 
                RTRIM(ruccli) as ruccli, 
                RTRIM(nrodni) as nrodni, 
                RTRIM(dircli) as dircli, 
                RTRIM(celcli) as celcli,
                RTRIM(telcli) as telcli,
                RTRIM(email) as email
              FROM mst01cli WITH(nolock)
              WHERE nomcli LIKE @search OR ruccli LIKE @search OR nrodni LIKE @search OR codcli LIKE @search
            `);
          
          erpClientes = erpRes.recordset || [];
        } catch (erpErr) {
          console.warn('[Admin Customers API] ERP no accesible para busqueda de clientes:', erpErr.message);
        }
      }
    }

    // 3. Mezclar los resultados de Navasoft que no existan en PostgreSQL local
    const localDocs = new Set(clientesLocales.map(c => c.documento.trim()));
    
    erpClientes.forEach(ec => {
      const doc = (ec.ruccli || ec.nrodni || '').trim();
      if (doc && !localDocs.has(doc)) {
        clientesFinales.push({
          id: `erp-${ec.codcli}`,
          documento: doc,
          nombre: ec.nomcli,
          telefono: (ec.celcli || ec.telcli || '').trim() || 'Sin Registrar',
          correo: ec.email || '',
          direccion: ec.dircli || '',
          notasAdmin: 'Cliente registrado en Navasoft ERP (Sin compras en la web)',
          fechaRegistro: new Date(),
          isFromErp: true
        });
        totalItems++;
      }
    });

    // 4. Obtener estadísticas de compras en la web desde PostgreSQL
    const stats = await prisma.webPedido.groupBy({
      by: ['clienteDocumento'],
      _count: { id: true },
      _sum: { total: true }
    });

    const statsMap = new Map();
    stats.forEach(s => {
      statsMap.set(s.clienteDocumento, {
        cantidadPedidos: s._count.id || 0,
        totalCompras: parseFloat(s._sum.total || 0)
      });
    });

    // 5. Mapear estadísticas
    const clientesConStats = clientesFinales.map(c => {
      const stat = statsMap.get(c.documento) || { cantidadPedidos: 0, totalCompras: 0 };
      return {
        ...c,
        cantidadPedidos: stat.cantidadPedidos,
        totalCompras: stat.totalCompras
      };
    });

    return NextResponse.json({
      success: true,
      clientes: clientesConStats,
      pagination: {
        total: totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit)
      }
    });

  } catch (error) {
    console.error('[Admin Customers API GET] ERROR:', error);
    return NextResponse.json({ error: 'Error al obtener clientes', details: error.message }, { status: 500 });
  }
}

// POST: Guardar/actualizar notas administrativas o detalles de un cliente (Soporta Upsert para importar del ERP)
export async function POST(request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { documento, notasAdmin, correo, telefono, direccion, nombre } = body;

    if (!documento) {
      return NextResponse.json({ error: 'Falta número de documento del cliente' }, { status: 400 });
    }

    const cleanDoc = documento.trim();

    // Registrar o actualizar en PostgreSQL
    const updated = await prisma.webCliente.upsert({
      where: { documento: cleanDoc },
      update: {
        ...(notasAdmin !== undefined && { notasAdmin }),
        ...(correo !== undefined && { correo }),
        ...(telefono !== undefined && { telefono }),
        ...(direccion !== undefined && { direccion })
      },
      create: {
        documento: cleanDoc,
        nombre: nombre || 'CLIENTE IMPORTADO DEL ERP',
        telefono: telefono || '',
        correo: correo || '',
        direccion: direccion || '',
        notasAdmin: notasAdmin || ''
      }
    });

    console.log(`[Admin Customers API] Cliente con documento ${documento} actualizado por el administrador.`);
    return NextResponse.json({ success: true, cliente: updated });

  } catch (error) {
    console.error('[Admin Customers API POST] ERROR:', error);
    return NextResponse.json({ error: 'Error al actualizar cliente', details: error.message }, { status: 500 });
  }
}
