const sql = require('mssql');
const { Client } = require('pg');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno del archivo .env local
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SYNC_INTERVAL_MS = 2 * 60 * 1000; // Cada 2 minutos
const SECRET_TOKEN = process.env.SYNC_SECRET_TOKEN || 'default-sync-token-12345';
const RAILWAY_URL = process.env.SYNC_API_URL || 'https://glosspe-production.up.railway.app';

// Configuración de base de datos PostgreSQL
const pgConfig = {
  connectionString: process.env.DATABASE_URL
};

// Configuración de SQL Server Navasoft
const mssqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Gimbra2022',
  server: process.env.DB_SERVER || '192.168.194.169',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'BdNava04',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true
  },
  connectionTimeout: 15000,
  requestTimeout: 15000
};

function writeLog(text) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${text}\n`;
  console.log(text);
  try {
    fs.appendFileSync(path.join(__dirname, '..', 'sync.log'), logMessage);
  } catch (err) {
    console.error('Error escribiendo en sync.log:', err.message);
  }
}

async function getActiveWarehousesFromPg() {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    const res = await client.query('SELECT codalm FROM web_almacenes_config WHERE visible = true');
    const almacenes = res.rows.map(row => row.codalm);
    await client.end();
    return almacenes;
  } catch (err) {
    writeLog(`[ERROR PG] No se pudieron obtener almacenes activos de PostgreSQL: ${err.message}. Usando "01" por defecto.`);
    try { await client.end(); } catch (e) {}
    return ['01'];
  }
}

async function runSync() {
  writeLog('=== INICIANDO LOTE DE SINCRONIZACIÓN ASÍNCRONA ===');
  let mssqlPool = null;

  try {
    // 1. Obtener sedes activas
    const activeWarehouses = await getActiveWarehousesFromPg();
    writeLog(`Sedes activas leídas de PostgreSQL: ${activeWarehouses.join(', ')}`);

    // 2. Conectar a SQL Server local
    mssqlPool = await sql.connect(mssqlConfig);
    writeLog('Conectado a SQL Server local exitosamente.');

    // 3. Construir la consulta dinámica para sumar stock
    let selectStockParts = [];
    let joinParts = [];
    
    activeWarehouses.forEach(wh => {
      const alias = `p${wh}`;
      if (wh === '01') {
        selectStockParts.push(`ISNULL(p01.stoc, 0)`);
      } else {
        selectStockParts.push(`ISNULL(${alias}.stoc, 0)`);
        joinParts.push(`LEFT JOIN prd01${wh} ${alias} WITH(nolock) ON p01.codi = ${alias}.codi`);
      }
    });

    const stockExpression = `(${selectStockParts.join(' + ')})`;
    const joinsSql = joinParts.join('\n');

    const query = `
      SELECT 
        RTRIM(p01.codi) as id,
        RTRIM(p01.descr) as name,
        RTRIM(p01.marc) as brand,
        RTRIM(p01.codf) as barcode,
        p01.pvns as price,
        RTRIM(s.nomsub) as category,
        ${stockExpression} as stock,
        CASE WHEN EXISTS (
          SELECT 1 FROM dtl_item_equivalente eq WITH(nolock) WHERE eq.codi = p01.codi
        ) THEN 1 ELSE 0 END as hasEquivalents
      FROM prd0101 p01 WITH(nolock)
      LEFT JOIN tbl01sbf s WITH(nolock) ON (LEFT(p01.codi, 2) + '-' + LTRIM(RTRIM(p01.codcat))) = s.codsub
      ${joinsSql}
      WHERE p01.estado = 1
    `;

    writeLog('Consultando catálogo y stocks en Navasoft...');
    const result = await mssqlPool.request().query(query);
    const rawProducts = result.recordset;
    writeLog(`Encontrados ${rawProducts.length} productos activos en Navasoft.`);

    // Consultar equivalencias en lote
    writeLog('Consultando equivalencias de productos en Navasoft...');
    const equivalentsMap = {};
    try {
      const equivalentsResult = await mssqlPool.request().query('SELECT RTRIM(codi) as id, RTRIM(codiequi) as equi FROM dtl_item_equivalente WITH(nolock)');
      equivalentsResult.recordset.forEach(row => {
        if (!equivalentsMap[row.id]) {
          equivalentsMap[row.id] = [];
        }
        equivalentsMap[row.id].push(row.equi);
      });
      writeLog(`Leídas ${equivalentsResult.recordset.length} relaciones de equivalencia.`);
    } catch (errEq) {
      writeLog(`[ERROR EQUIVALENCIAS] Falló la lectura de equivalencias: ${errEq.message}`);
    }

    if (rawProducts.length === 0) {
      writeLog('Catálogo vacío en Navasoft. Sincronización cancelada.');
      return;
    }

    // 4. Obtener marcas y árbol de categorías fresca para enviar de forma asíncrona
    let brands = [];
    let categoriesTree = [];
    try {
      writeLog('Consultando marcas activas en Navasoft...');
      const brandsResult = await mssqlPool.request().query(`
        SELECT DISTINCT 
          RTRIM(marc) as name
        FROM prd0101 WITH(nolock)
        WHERE estado = 1 AND marc IS NOT NULL AND LTRIM(RTRIM(marc)) != '' AND LTRIM(RTRIM(marc)) != 'ND'
        ORDER BY name ASC
      `);
      brands = brandsResult.recordset;
      writeLog(`Leídas ${brands.length} marcas activas.`);

      writeLog('Consultando árbol de categorías en Navasoft...');
      const catTreeResult = await mssqlPool.request().query(`
        SELECT 
          RTRIM(f.codfam) as familyId, 
          RTRIM(f.nomfam) as familyName,
          RTRIM(s.codsub) as subfamilyId, 
          RTRIM(s.nomsub) as subfamilyName
        FROM tbl01fam f WITH(nolock)
        INNER JOIN tbl01sbf s WITH(nolock) ON f.codfam = s.codfam
        WHERE EXISTS (
          SELECT 1 
          FROM prd0101 p WITH(nolock)
          WHERE p.estado = 1 
            AND p.codi LIKE f.codfam + SUBSTRING(s.codsub, 4, 2) + '%'
        )
        ORDER BY f.nomfam ASC, s.nomsub ASC
      `);
      
      const treeMap = new Map();
      catTreeResult.recordset.forEach(row => {
        const famId = row.familyId;
        const famName = row.familyName;
        const subId = row.subfamilyId;
        const subName = row.subfamilyName;

        if (famId === '00' || famName.toLowerCase().includes('contable')) return;

        if (!treeMap.has(famId)) {
          treeMap.set(famId, {
            id: famId,
            name: famName,
            subcategories: []
          });
        }

        treeMap.get(famId).subcategories.push({
          id: subId,
          name: subName
        });
      });
      categoriesTree = Array.from(treeMap.values());
      writeLog(`Generadas ${categoriesTree.length} familias con sus subcategorías para la nube.`);
    } catch (metadataErr) {
      writeLog(`[ERROR METADATOS] No se pudieron obtener marcas o categorías del ERP: ${metadataErr.message}`);
    }

    // 5. Dividir en lotes de 100 productos y enviar a la nube
    const batchSize = 100;
    const cleanUrl = RAILWAY_URL.replace(/\/$/, '');
    const syncApiUrl = `${cleanUrl}/api/sync/catalog`;

    writeLog(`Enviando productos a la API de la nube: ${syncApiUrl}`);

    for (let i = 0; i < rawProducts.length; i += batchSize) {
      const batch = rawProducts.slice(i, i + batchSize);
      
      const payload = {
        products: batch.map(p => ({
          id: p.id,
          name: p.name || 'Sin nombre',
          brand: p.brand || 'Importado',
          price: parseFloat(p.price || 0),
          stock: parseFloat(p.stock || 0),
          category: p.category || 'Otros',
          hasEquivalents: p.hasEquivalents === 1,
          equivalents: equivalentsMap[p.id] || []
        }))
      };

      // Incluir metadatos de marcas y categorías en el primer lote
      if (i === 0) {
        payload.brands = brands;
        payload.categoriesTree = categoriesTree;
      }

      try {
        const response = await global.fetch(syncApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Sync-Token': SECRET_TOKEN
          },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const resData = await response.json();
          writeLog(`Lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(rawProducts.length / batchSize)} enviado con éxito. (${batch.length} productos)`);
        } else {
          const errText = await response.text();
          writeLog(`[ERROR LOTE] Error en lote ${Math.floor(i / batchSize) + 1}. Status: ${response.status}. Detalle: ${errText}`);
        }
      } catch (postErr) {
        writeLog(`[ERROR ENVIO] Falló la petición HTTP para el lote ${Math.floor(i / batchSize) + 1}: ${postErr.message}`);
      }
    }

    writeLog('=== SINCRONIZACIÓN COMPLETADA CON ÉXITO ===\n');

  } catch (err) {
    writeLog(`[ERROR CRITICO] Falló el proceso de sincronización: ${err.message}`);
  } finally {
    if (mssqlPool) {
      await mssqlPool.close();
      writeLog('Conexión con SQL Server cerrada.');
    }
  }
}

// Iniciar bucle infinito de ejecución
async function start() {
  writeLog('Iniciando servicio de Agente de Sincronización Local...');
  // Ejecutar una vez al inicio
  await runSync();
  
  // Programar ejecuciones periódicas
  setInterval(async () => {
    await runSync();
  }, SYNC_INTERVAL_MS);
}

start();
