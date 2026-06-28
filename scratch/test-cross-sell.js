const sql = require('mssql');
require('dotenv').config();

const sqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'BdNava04',
  connectionTimeout: 60000,
  requestTimeout: 60000,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  }
};

async function run() {
  console.log('Intentando conectar con el ERP local...', sqlConfig.server);
  try {
    const pool = await sql.connect(sqlConfig);
    console.log('¡Conexión establecida con éxito!');

    console.log('Ejecutando consulta optimizada de compras conjuntas...');
    const start = Date.now();
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
      ORDER BY coincidencia DESC
    `;
    const res = await pool.request().query(query);
    const duration = Date.now() - start;
    console.log(`Consulta finalizada en ${duration}ms. Coincidencias encontradas:`, res.recordset.length);
    console.log(res.recordset);
  } catch (err) {
    console.error('Error durante la prueba:', err);
  } finally {
    await sql.close();
  }
}

run();
