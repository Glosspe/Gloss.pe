import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getErpConnection } from '@/lib/db';
import sql from 'mssql';

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone, docType, docNumber, name, address, notes, items, total, warehouse } = body;

    // 1. Validaciones básicas de entrada
    if (!phone || !docNumber || !name || !address || !items || items.length === 0) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    console.log(`[Checkout API] Iniciando procesamiento de pedido para: ${name} (${phone}), sede: ${warehouse}`);

    // Determinar el almacén físico final en el ERP
    let finalCodAlm = '01'; // Por defecto Alfonso Ugarte
    const cleanWh = (warehouse || '').toString().trim();
    const validAlmacenes = ['01', '02', '04', '05', '06'];
    if (validAlmacenes.includes(cleanWh)) {
      finalCodAlm = cleanWh;
    } else if (cleanWh.toUpperCase() === 'JAÉN' || cleanWh.toUpperCase() === 'JAEN') {
      finalCodAlm = '05';
    }

    // 2. Generar un número de pedido correlativo web único (secuencial)
    // Envolvemos esto en un flujo robusto en PostgreSQL
    let nroPedido = 'GLOSS-1001';
    try {
      const lastPedido = await prisma.webPedido.findFirst({
        orderBy: { fechaCreacion: 'desc' }
      });
      
      if (lastPedido && lastPedido.nroPedido) {
        const lastNum = parseInt(lastPedido.nroPedido.split('-')[1], 10);
        nroPedido = `GLOSS-${lastNum + 1}`;
      }
    } catch (dbErr) {
      console.warn('[Checkout API] No se pudo leer el último pedido en PostgreSQL, usando ID aleatorio:', dbErr.message);
      nroPedido = `GLOSS-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 3. Registrar el pedido en la base de datos PostgreSQL local (Railway)
    let localPedido = null;
    try {
      localPedido = await prisma.webPedido.create({
        data: {
          nroPedido,
          clienteNombre: name,
          clienteTelefono: phone,
          clienteDocumento: docNumber,
          direccion: address,
          productos: JSON.stringify(items),
          total: parseFloat(total),
          estado: 'PENDIENTE',
          notes: notes || ''
        }
      });
      console.log(`[Checkout API] Pedido guardado en PostgreSQL local: ${nroPedido}`);
    } catch (pgErr) {
      console.error('[Checkout API] Error crítico al guardar en PostgreSQL de Railway:', pgErr.message);
      // No bloqueamos aquí, generamos un objeto temporal por si PostgreSQL falla en pruebas locales iniciales
      localPedido = { nroPedido };
    }

    // 4. Intentar registrar la Cotización en el ERP Navasoft (SQL Server BdNava04)
    // Usamos un bloque try-catch aislado para tolerancia a fallos. Si la BD del ERP de la oficina física está
    // desconectada o falla el esquema, la compra web SIGUE ADELANTE y se le envía a WhatsApp al cliente.
    let nroCotizacionErp = null;
    let erpSyncSuccess = false;

    try {
      const pool = await getErpConnection();
      const transaction = new sql.Transaction(pool);

      await transaction.begin();

      try {
        // 4.1 Generar Correlativo de Cotización en el ERP (Ejemplo: cdocu = 'CO')
        const erpPto = '01'; // Punto de venta por defecto para la tienda web
        const docTypeErp = 'CO'; // 'CO' representa Cotización en Navasoft
        
        // Consultar correlativo actual en tbl01cor
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

        // 4.2 Inserción de la Cabecera de la Cotización (en ped01cab o cot01cab según tu Navasoft)
        // Usamos una lógica de inserción tolerante: intentaremos en 'ped01cab' primero, ya que en la mayoría de Navasoft
        // los pedidos y cotizaciones comparten la misma estructura con un código de documento cdocu = 'CO'.
        const peruvianDate = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Lima',
          year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date());
        
        const finalCodCli = 'C00000'; // Cliente genérico o varios de Navasoft
        const formattedCompro = `${docTypeErp}/${nextNdocu.substring(nextNdocu.length - 6)}`;

        const reqMst = new sql.Request(transaction);
        await reqMst
          .input('cdocu', docTypeErp)
          .input('ndocu', nextNdocu)
          .input('fecha', sql.Date, peruvianDate)
          .input('fven', sql.Date, peruvianDate)
          .input('codcli', sql.Char(6), finalCodCli)
          .input('nomcli', sql.Char(60), name.substring(0, 60))
          .input('ruccli', sql.Char(11), docNumber.substring(0, 11))
          .input('totn', sql.Decimal(18, 4), total)
          .input('toti', sql.Decimal(18, 4), total * 0.18 / 1.18) // Cálculo de IGV
          .input('tota', sql.Decimal(18, 4), total / 1.18)        // Base imponible
          .input('mone', 'S')
          .input('tcam', sql.Decimal(18, 4), 1.0)
          .input('Codpto', erpPto)
          .input('CodAlm', finalCodAlm)
          .input('codusu', 'WEB')
          .input('flag', '0')
          .input('compro', formattedCompro)
          .query(`
            IF OBJECT_ID('dbo.ped01cab') IS NOT NULL
            BEGIN
              INSERT INTO ped01cab (cdocu, ndocu, fecha, fven, codcli, nomcli, ruccli, totn, toti, tota, mone, tcam, Codpto, CodAlm, codusu, flag, compro, Fecreg)
              VALUES (@cdocu, @ndocu, @fecha, @fven, @codcli, @nomcli, @ruccli, @totn, @toti, @tota, @mone, @tcam, @Codpto, @CodAlm, @codusu, @flag, @compro, GETDATE())
            END
            ELSE IF OBJECT_ID('dbo.cot01cab') IS NOT NULL
            BEGIN
              INSERT INTO cot01cab (cdocu, ndocu, fecha, fven, codcli, nomcli, ruccli, totn, toti, tota, mone, tcam, Codpto, CodAlm, codusu, flag, compro, Fecreg)
              VALUES (@cdocu, @ndocu, @fecha, @fven, @codcli, @nomcli, @ruccli, @totn, @toti, @tota, @mone, @tcam, @Codpto, @CodAlm, @codusu, @flag, @compro, GETDATE())
            END
          `);

        // 4.3 Inserción de Detalles de la Cotización (en ped01det o cot01det)
        for (const [idx, item] of items.entries()) {
          const reqDtl = new sql.Request(transaction);
          await reqDtl
            .input('cdocu', docTypeErp)
            .input('ndocu', nextNdocu)
            .input('item', sql.Int, idx + 1)
            .input('codi', sql.Char(11), item.id.substring(0, 11))
            .input('descr', item.name.substring(0, 80))
            .input('cant', sql.Decimal(18, 4), item.quantity)
            .input('preu', sql.Decimal(18, 4), item.price / 1.18)
            .input('tota', sql.Decimal(18, 4), (item.price * item.quantity) / 1.18)
            .input('totn', sql.Decimal(18, 4), item.price * item.quantity)
            .input('Codalm', finalCodAlm)
            .query(`
              IF OBJECT_ID('dbo.ped01det') IS NOT NULL
              BEGIN
                INSERT INTO ped01det (cdocu, ndocu, item, codi, descr, cant, preu, tota, totn, Codalm, flag)
                VALUES (@cdocu, @ndocu, @item, @codi, @descr, @cant, @preu, @tota, @totn, @Codalm, '0')
              END
              ELSE IF OBJECT_ID('dbo.cot01det') IS NOT NULL
              BEGIN
                INSERT INTO cot01det (cdocu, ndocu, item, codi, descr, cant, preu, tota, totn, Codalm, flag)
                VALUES (@cdocu, @ndocu, @item, @codi, @descr, @cant, @preu, @tota, @totn, @Codalm, '0')
              END
            `);
        }

        // 4.4 Actualizar el correlativo de Cotización en el ERP si lo leímos de la tabla
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
        console.log(`[Checkout API] Cotización registrada con éxito en el ERP: ${nroCotizacionErp}`);

        // Actualizar el número de cotización en PostgreSQL
        if (localPedido && localPedido.id) {
          await prisma.webPedido.update({
            where: { id: localPedido.id },
            data: { nroCotizacionErp }
          });
        }

      } catch (innerErr) {
        await transaction.rollback();
        throw innerErr;
      }

    } catch (erpErr) {
      console.warn('[Checkout API] No se pudo sincronizar con Navasoft ERP en este momento. Sincronización diferida:', erpErr.message);
      // Guardamos la bitácora, el pedido sigue adelante con la info de PostgreSQL local
    }

    // 5. Devolver la respuesta exitosa al cliente
    return NextResponse.json({
      success: true,
      nroPedido,
      nroCotizacion: nroCotizacionErp || 'PENDIENTE_ERP',
      erpSynced: erpSyncSuccess,
      whatsappNumber: process.env.WHATSAPP_NUMBER || '51900000000'
    });

  } catch (error) {
    console.error('[Checkout API POST] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno del servidor al procesar checkout', details: error.message }, { status: 500 });
  }
}
