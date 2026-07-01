import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAdminRequest } from '@/lib/auth';
import { getErpConnection } from '@/lib/db';
import sql from 'mssql';
import cache from '@/lib/cache';

// GET: Obtener pedidos de la web con filtros y paginación
export async function GET(request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const estado = searchParams.get('estado') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const skip = (page - 1) * limit;

    // Construir filtros de búsqueda
    const where = {};
    
    if (estado) {
      where.estado = estado;
    }

    if (search) {
      where.OR = [
        { nroPedido: { contains: search, mode: 'insensitive' } },
        { clienteNombre: { contains: search, mode: 'insensitive' } },
        { clienteDocumento: { contains: search, mode: 'insensitive' } },
        { nroCotizacionErp: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Obtener los pedidos y el conteo total
    const [pedidos, total] = await Promise.all([
      prisma.webPedido.findMany({
        where,
        orderBy: { fechaCreacion: 'desc' },
        skip,
        take: limit
      }),
      prisma.webPedido.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      pedidos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('[Admin Orders API GET] ERROR:', error);
    return NextResponse.json({ error: 'Error al obtener pedidos', details: error.message }, { status: 500 });
  }
}

// PUT: Actualizar estado del pedido o re-sincronizar con el ERP en caliente
export async function PUT(request) {
  try {
    const admin = await verifyAdminRequest(request);
    if (!admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { pedidoId, action, nuevoEstado } = body;

    if (!pedidoId) {
      return NextResponse.json({ error: 'Falta ID de pedido' }, { status: 400 });
    }

    const pedido = await prisma.webPedido.findUnique({
      where: { id: pedidoId }
    });

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    // Caso A: Actualizar estado de pago/preparación local
    if (action === 'update_status') {
      if (!nuevoEstado) {
        return NextResponse.json({ error: 'Falta especificar nuevo estado' }, { status: 400 });
      }

      const updated = await prisma.webPedido.update({
        where: { id: pedidoId },
        data: { estado: nuevoEstado }
      });

      console.log(`[Admin Orders API] Estado del pedido ${pedido.nroPedido} cambiado a: ${nuevoEstado}`);
      return NextResponse.json({ success: true, pedido: updated });
    }

    // Caso B: Re-sincronizar cotización manualmente con el ERP
    if (action === 'resync_erp') {
      if (pedido.nroCotizacionErp && pedido.nroCotizacionErp !== 'PENDIENTE_ERP') {
        return NextResponse.json({ error: 'El pedido ya cuenta con una cotización registrada en el ERP' }, { status: 400 });
      }

      const items = JSON.parse(pedido.productos);
      const total = parseFloat(pedido.total);

      // Determinar punto de venta y almacén origen
      // Centralizamos por defecto en Sede 01 (Alfonso Ugarte)
      const erpPto = '01';
      const finalCodAlm = '01';

      let nroCotizacionErp = null;
      let erpSyncSuccess = false;

      try {
        const pool = await getErpConnection();
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
          const cleanDoc = pedido.clienteDocumento.trim();

          // 1. Identificar o registrar al cliente en mst01cli
          const reqCheckCli = new sql.Request(transaction);
          const checkRes = await reqCheckCli
            .input('doc', cleanDoc)
            .query(`
              SELECT TOP 1 codcli FROM mst01cli 
              WHERE LTRIM(RTRIM(ruccli)) = @doc OR LTRIM(RTRIM(nrodni)) = @doc
            `);

          let finalCodCli = 'C00000';

          if (checkRes.recordset.length > 0) {
            finalCodCli = checkRes.recordset[0].codcli.trim();
          } else {
            const reqMaxCli = new sql.Request(transaction);
            const maxCliRes = await reqMaxCli.query(`
              SELECT MAX(codcli) as maxCod FROM mst01cli 
              WHERE codcli LIKE 'C%' AND LEN(codcli) = 6
            `);

            let nextCodCli = 'C10000';
            if (maxCliRes.recordset.length > 0 && maxCliRes.recordset[0].maxCod) {
              const maxCod = maxCliRes.recordset[0].maxCod.trim();
              const numStr = maxCod.substring(1);
              if (!isNaN(numStr)) {
                const nextNum = parseInt(numStr, 10) + 1;
                nextCodCli = `C${nextNum.toString().padStart(5, '0')}`;
              }
            }

            finalCodCli = nextCodCli;
            const isRuc = cleanDoc.length === 11;
            const flaper = isRuc ? 2 : 1;
            const coddocide = isRuc ? '06' : '01';

            const reqInsertCli = new sql.Request(transaction);
            await reqInsertCli
              .input('codcli', sql.Char(6), finalCodCli)
              .input('nomcli', sql.VarChar(60), pedido.clienteNombre.substring(0, 60))
              .input('dircli', sql.VarChar(80), pedido.direccion.substring(0, 80))
              .input('ruccli', sql.Char(11), isRuc ? cleanDoc : '')
              .input('nrodni', sql.Char(8), isRuc ? '' : cleanDoc)
              .input('flaper', sql.Int, flaper)
              .input('coddocide', sql.Char(2), coddocide)
              .input('email', sql.VarChar(100), '')
              .query(`
                INSERT INTO mst01cli (
                  codcli, nomcli, dircli, ruccli, nrodni, 
                  flaper, coddocide, estado, fecing, fecreg,
                  codven, codcob, codact, codcdv, codpos,
                  coddis, codpro, coddep, codpai, codzon, 
                  flalin, mcredi, email
                )
                VALUES (
                  @codcli, @nomcli, @dircli, @ruccli, @nrodni,
                  @flaper, @coddocide, 1, GETDATE(), GETDATE(),
                  'V0000', 'V0000', '01', '01', '01',
                  '31', '01', '15', '01', '01',
                  1, 0, ''
                )
              `);
            console.log(`[Admin Orders API - ERP] Registrado nuevo cliente en caliente: ${finalCodCli}`);
          }

          // 2. Obtener correlativo de Cotización (cdocu = '31')
          const docTypeErp = '31';
          const reqCor = new sql.Request(transaction);
          const resCor = await reqCor
            .input('cdocu', docTypeErp)
            .input('codpto', erpPto)
            .query(`SELECT nroini FROM tbl01cor WHERE cdocu = @cdocu AND codpto = @codpto`);

          let nextNdocu = `CO-${Math.floor(100000 + Math.random() * 900000)}`;
          let hasCorrelativo = false;

          if (resCor.recordset.length > 0) {
            hasCorrelativo = true;
            const currentNroIni = resCor.recordset[0].nroini.trim();
            const parts = currentNroIni.split('-');
            const series = parts[0];
            const numPartClean = (parts[1] || parts[0]).replace(/[^0-9]/g, '');
            const nextNum = (parseInt(numPartClean, 10) + 1).toString().padStart(numPartClean.length, '0');
            nextNdocu = `${series}-${nextNum}`;
          }

          const peruvianDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Lima',
            year: 'numeric', month: '2-digit', day: '2-digit'
          }).format(new Date());

          // 3. Inserción de la Cabecera de la Cotización en mst01cot
          const reqMst = new sql.Request(transaction);
          await reqMst
            .input('cdocu', docTypeErp)
            .input('ndocu', nextNdocu)
            .input('fecha', sql.Date, peruvianDate)
            .input('fven', sql.Date, peruvianDate)
            .input('codcli', sql.Char(6), finalCodCli)
            .input('nomcli', sql.Char(60), pedido.clienteNombre.substring(0, 60))
            .input('ruccli', sql.Char(11), pedido.clienteDocumento.substring(0, 11))
            .input('totn', sql.Decimal(18, 4), total)
            .input('toti', sql.Decimal(18, 4), total * 0.18 / 1.18)
            .input('tota', sql.Decimal(18, 4), total / 1.18)
            .input('mone', 'S')
            .input('tcam', sql.Decimal(18, 4), 1.0)
            .input('Codpto', erpPto)
            .input('CodAlm', finalCodAlm)
            .input('obser', sql.VarChar(100), `RESYNC WEB: ${pedido.nroPedido}`)
            .query(`
              INSERT INTO mst01cot (cdocu, ndocu, fecha, fven, codcli, nomcli, ruccli, totn, toti, tota, mone, tcam, Codpto, CodAlm, flag, codven, codcdv, estado, obser, fecreg)
              VALUES (@cdocu, @ndocu, @fecha, @fven, @codcli, @nomcli, @ruccli, @totn, @toti, @tota, @mone, @tcam, @Codpto, @CodAlm, '0', 'V0000', '01', '1', @obser, GETDATE())
            `);

          // 4. Inserción de Detalles de la Cotización en dtl01cot
          for (const [idx, item] of items.entries()) {
            const reqDtl = new sql.Request(transaction);
            await reqDtl
              .input('cdocu', docTypeErp)
              .input('ndocu', nextNdocu)
              .input('codcli', sql.Char(6), finalCodCli)
              .input('item', sql.Int, idx + 1)
              .input('codi', sql.Char(11), item.id.substring(0, 11))
              .input('descr', item.name.substring(0, 80))
              .input('cant', sql.Decimal(18, 4), item.quantity)
              .input('preu', sql.Decimal(18, 4), item.price / 1.18)
              .input('tota', sql.Decimal(18, 4), (item.price * item.quantity) / 1.18)
              .input('totn', sql.Decimal(18, 4), item.price * item.quantity)
              .input('Codalm', finalCodAlm)
              .query(`
                INSERT INTO dtl01cot (fecha, cdocu, ndocu, codcli, item, codi, descr, cant, preu, tota, totn, mone, tcam, flag, codalm, aigv)
                VALUES (GETDATE(), @cdocu, @ndocu, @codcli, @item, @codi, @descr, @cant, @preu, @tota, @totn, 'S', 1.0, '0', @Codalm, '1')
              `);
          }

          // 5. Actualizar el correlativo de Cotización en el ERP
          if (hasCorrelativo) {
            const reqUpdateCor = new sql.Request(transaction);
            await reqUpdateCor
              .input('cdocu', docTypeErp)
              .input('codpto', erpPto)
              .input('nextNdocu', nextNdocu)
              .query(`UPDATE tbl01cor SET nroini = @nextNdocu WHERE cdocu = @cdocu AND codpto = @codpto`);
          }

          await transaction.commit();
          nroCotizacionErp = nextNdocu;
          erpSyncSuccess = true;

        } catch (innerErr) {
          await transaction.rollback();
          throw innerErr;
        }

        // Actualizar el número de cotización en PostgreSQL local
        const updated = await prisma.webPedido.update({
          where: { id: pedidoId },
          data: { nroCotizacionErp }
        });

        await cache.clear();
        return NextResponse.json({ success: true, erpSynced: true, pedido: updated });

      } catch (erpErr) {
        console.error('[Admin Orders API - Resync] Error al conectar e insertar en el ERP:', erpErr);
        return NextResponse.json({ error: 'La sincronización con Navasoft ERP falló.', details: erpErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });

  } catch (error) {
    console.error('[Admin Orders API PUT] ERROR:', error);
    return NextResponse.json({ error: 'Error al actualizar pedido', details: error.message }, { status: 500 });
  }
}
