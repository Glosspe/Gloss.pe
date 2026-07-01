import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/auth';

// GET: Obtener clientes registrados con estadísticas agregadas de pedidos
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

    // Construir filtro
    const where = {};
    if (search) {
      where.OR = [
        { documento: { contains: search, mode: 'insensitive' } },
        { nombre: { contains: search, mode: 'insensitive' } },
        { telefono: { contains: search, mode: 'insensitive' } },
        { correo: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Obtener los clientes de PostgreSQL local
    const [clientes, total] = await Promise.all([
      prisma.webCliente.findMany({
        where,
        orderBy: { fechaRegistro: 'desc' },
        skip,
        take: limit
      }),
      prisma.webCliente.count({ where })
    ]);

    // Obtener estadísticas de pedidos agrupados de forma ágil en base a PostgreSQL
    const stats = await prisma.webPedido.groupBy({
      by: ['clienteDocumento'],
      _count: {
        id: true
      },
      _sum: {
        total: true
      }
    });

    // Mapear las estadísticas a un mapa para acceso instantáneo
    const statsMap = new Map();
    stats.forEach(s => {
      statsMap.set(s.clienteDocumento, {
        cantidadPedidos: s._count.id || 0,
        totalCompras: parseFloat(s._sum.total || 0)
      });
    });

    // Integrar las estadísticas a cada cliente
    const clientesConStats = clientes.map(c => {
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
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('[Admin Customers API GET] ERROR:', error);
    return NextResponse.json({ error: 'Error al obtener clientes', details: error.message }, { status: 500 });
  }
}

// POST: Guardar/actualizar notas administrativas o detalles de un cliente
export async function POST(request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { documento, notasAdmin, correo, telefono, direccion } = body;

    if (!documento) {
      return NextResponse.json({ error: 'Falta número de documento del cliente' }, { status: 400 });
    }

    // Actualizar cliente local en PostgreSQL
    const updated = await prisma.webCliente.update({
      where: { documento: documento.trim() },
      data: {
        ...(notasAdmin !== undefined && { notasAdmin }),
        ...(correo !== undefined && { correo }),
        ...(telefono !== undefined && { telefono }),
        ...(direccion !== undefined && { direccion })
      }
    });

    console.log(`[Admin Customers API] Cliente con documento ${documento} actualizado por el administrador.`);
    return NextResponse.json({ success: true, cliente: updated });

  } catch (error) {
    console.error('[Admin Customers API POST] ERROR:', error);
    return NextResponse.json({ error: 'Error al actualizar cliente', details: error.message }, { status: 500 });
  }
}
