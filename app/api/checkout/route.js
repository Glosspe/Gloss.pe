import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getErpConnection } from '@/lib/db';
import sql from 'mssql';
import cache from '@/lib/cache';

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      phone, 
      docType, 
      docNumber, 
      name, 
      address, 
      notes, 
      items, 
      total, 
      warehouse,      // Legacy / Región
      region,         // 'Chiclayo' o 'Jaén'
      deliveryMethod, // 'recojo', 'delivery', 'envio_agencia'
      pickupSedeId,   // '01', '02', '04', '05', '06'
      email,          // Opcional
      coordenadas     // Opcional lat,lng
    } = body;

    // 1. Validaciones básicas de entrada
    if (!phone || !docNumber || !name || !address || !items || items.length === 0) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    console.log(`[Checkout API] Procesando pedido para: ${name} (${phone}), región: ${region || warehouse}, método: ${deliveryMethod}`);

    // 2. Determinar la Sede (erpPto) y el Almacén físico final en el ERP
    let erpPto = '01'; // Por defecto Sede Principal Alfonso Ugarte
    let finalCodAlm = '01'; // Por defecto Almacén Alfonso Ugarte

    const method = (deliveryMethod || 'delivery').toString().toLowerCase();
    if (method === 'recojo' && pickupSedeId) {
      const cleanPickup = pickupSedeId.toString().trim();
      const validSedes = ['01', '02', '04', '05', '06'];
      if (validSedes.includes(cleanPickup)) {
        erpPto = cleanPickup;
        finalCodAlm = cleanPickup;
      }
    } else if (method === 'delivery') {
      const cleanReg = (region || warehouse || '').toString().toUpperCase();
      if (cleanReg.includes('JAEN') || cleanReg.includes('JAÉN') || cleanReg === '05') {
        erpPto = '05';
        finalCodAlm = '05';
      } else {
        erpPto = '01';
        finalCodAlm = '01';
      }
    } else {
      // Envío nacional / Courier se despacha desde Alfonso Ugarte
      erpPto = '01';
      finalCodAlm = '01';
    }

    // 3. Generar y registrar el número de pedido correlativo web único en PostgreSQL
    let nroPedido = 'GLOSS-1001';
    let localPedido = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
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
            coordenadas: coordenadas || null,
            nroCotizacionErp: 'PENDIENTE_ERP'
          }
        });
        console.log(`[Checkout API] Pedido guardado en PostgreSQL local: ${nroPedido}`);
        break; // Éxito, salir del bucle
      } catch (pgErr) {
        if (pgErr.code === 'P2002' && pgErr.meta?.target?.includes('nroPedido')) {
          console.warn(`[Checkout API] Colisión de nroPedido detectada para ${nroPedido}. Reintentando...`);
          continue;
        }
        console.error('[Checkout API] Error crítico al guardar en PostgreSQL:', pgErr.message);
        localPedido = { nroPedido };
        break;
      }
    }

    // Upsert local del cliente para el módulo de CRM
    try {
      await prisma.webCliente.upsert({
        where: { documento: docNumber.trim() },
        update: {
          nombre: name,
          telefono: phone,
          direccion: address,
          correo: email || null
        },
        create: {
          documento: docNumber.trim(),
          nombre: name,
          telefono: phone,
          direccion: address,
          correo: email || null
        }
      });
      console.log(`[Checkout API] Datos de cliente local actualizados en PostgreSQL para el CRM.`);
    } catch (cliPgErr) {
      console.error('[Checkout API] Error al persistir cliente en PostgreSQL local:', cliPgErr.message);
    }

    // 4. Sincronización en caliente con Navasoft ERP (sin alterar la estructura del ERP)
    let nroCotizacionErp = null;
    let erpSyncSuccess = false;

    try {
      const pool = await getErpConnection();
      const transaction = new sql.Transaction(pool);

      await transaction.begin();

      try {
        const cleanDoc = docNumber.trim();

        // 4.1 Identificar o registrar al cliente en el maestro del ERP (mst01cli)
        const reqCheckCli = new sql.Request(transaction);
        const checkRes = await reqCheckCli
          .input('doc', cleanDoc)
          .query(`
            SELECT TOP 1 codcli FROM mst01cli 
            WHERE LTRIM(RTRIM(ruccli)) = @doc OR LTRIM(RTRIM(nrodni)) = @doc
          `);

        let finalCodCli = 'C00000'; // Fallback por defecto

        if (checkRes.recordset.length > 0) {
          finalCodCli = checkRes.recordset[0].codcli.trim();
          console.log(`[Checkout API - ERP] Cliente ya existe en Navasoft con código: ${finalCodCli}`);
        } else {
          // Cliente nuevo: Generar código correlativo CXXXXX
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
          const flaper = isRuc ? 2 : 1; // 1 = Natural, 2 = Jurídica
          const coddocide = isRuc ? '06' : '01'; // 01 = DNI, 06 = RUC

          const reqInsertCli = new sql.Request(transaction);
          await reqInsertCli
            .input('codcli', sql.Char(6), finalCodCli)
            .input('nomcli', sql.VarChar(60), name.substring(0, 60))
            .input('dircli', sql.VarChar(80), address.substring(0, 80))
            .input('ruccli', sql.Char(11), isRuc ? cleanDoc : '')
            .input('nrodni', sql.Char(8), isRuc ? '' : cleanDoc)
            .input('flaper', sql.Int, flaper)
            .input('coddocide', sql.Char(2), coddocide)
            .input('email', sql.VarChar(100), (email || '').substring(0, 100))
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
                1, 0, @email
              )
            `);
          console.log(`[Checkout API - ERP] Registrado nuevo cliente en caliente: ${finalCodCli} - ${name}`);
        }

        // 4.2 Obtener correlativo de Cotización (cdocu = '31') para la sede seleccionada
        const docTypeErp = '31'; // Tipo de documento oficial '31' = Cotizaciones en Navasoft
        
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

        const formattedCompro = `WEB/${nroPedido}`;

        // 4.3 Inserción de la Cabecera de la Cotización en mst01cot
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
          .input('toti', sql.Decimal(18, 4), total * 0.18 / 1.18)
          .input('tota', sql.Decimal(18, 4), total / 1.18)
          .input('mone', 'S')
          .input('tcam', sql.Decimal(18, 4), 1.0)
          .input('Codpto', erpPto)
          .input('CodAlm', finalCodAlm)
          .input('obser', sql.VarChar(100), `WEB: ${nroPedido} - ${method.toUpperCase()}`)
          .query(`
            INSERT INTO mst01cot (cdocu, ndocu, fecha, fven, codcli, nomcli, ruccli, totn, toti, tota, mone, tcam, Codpto, CodAlm, flag, codven, codcdv, estado, obser, fecreg)
            VALUES (@cdocu, @ndocu, @fecha, @fven, @codcli, @nomcli, @ruccli, @totn, @toti, @tota, @mone, @tcam, @Codpto, @CodAlm, '0', 'V0000', '01', '1', @obser, GETDATE())
          `);

        // 4.4 Inserción de Detalles de la Cotización en dtl01cot
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

        // 4.5 Actualizar el correlativo de Cotización en el ERP
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
        console.log(`[Checkout API] Cotización registrada exitosamente en el ERP: ${nroCotizacionErp} para la sede: ${erpPto}`);

        // Actualizar el número de cotización en PostgreSQL local
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
      console.warn('[Checkout API] No se pudo sincronizar en caliente con Navasoft. Sincronización diferida:', erpErr.message);
    }

    // Invalidar caché de búsquedas y equivalentes para reflejar cambios
    await cache.clear();

    // 5. Devolver la respuesta exitosa al cliente con el número de WhatsApp configurado
    let finalWhatsAppNumber = process.env.WHATSAPP_NUMBER || '51900000000';
    try {
      const waConfig = await prisma.webGlobalConfig.findUnique({
        where: { clave: 'WHATSAPP_CONTACT_NUMBER' }
      });
      if (waConfig && waConfig.valor) {
        finalWhatsAppNumber = waConfig.valor.trim();
      }
    } catch (waErr) {
      console.warn('[Checkout API] No se pudo leer WHATSAPP_CONTACT_NUMBER de la BD:', waErr.message);
    }

    return NextResponse.json({
      success: true,
      nroPedido,
      nroCotizacion: nroCotizacionErp || 'PENDIENTE_ERP',
      erpSynced: erpSyncSuccess,
      whatsappNumber: finalWhatsAppNumber
    });

  } catch (error) {
    console.error('[Checkout API POST] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno del servidor al procesar checkout', details: error.message }, { status: 500 });
  }
}
