const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || '127.0.0.1',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'BdNava04',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  }
};

async function explore() {
  try {
    const pool = await sql.connect(config);
    
    // 1. Ver qué productos tienen stock > 0 en Jaén (prd0105)
    console.log("--- PRODUCTOS CON STOCK EN JAÉN (prd0105) ---");
    const resJaen = await pool.request().query(`
      SELECT TOP 20 
        RTRIM(p05.codi) as codi, 
        RTRIM(p05.descr) as descripcion, 
        p05.stoc as stock_jaen
      FROM prd0105 p05 WITH(nolock)
      WHERE p05.stoc > 0
      ORDER BY p05.stoc DESC
    `);
    console.log(resJaen.recordset);

    // 2. Comparar el stock de estos mismos productos en Alfonso Ugarte (prd0101)
    if (resJaen.recordset.length > 0) {
      const codigos = resJaen.recordset.map(r => `'${r.codi}'`).join(',');
      console.log("\n--- COMPARATIVA DE STOCK JAÉN vs ALFONSO UGARTE ---");
      const resCompare = await pool.request().query(`
        SELECT 
          RTRIM(p01.codi) as codi,
          RTRIM(p01.descr) as descripcion,
          p01.stoc as stock_ugarte_01,
          p05.stoc as stock_jaen_05
        FROM prd0101 p01 WITH(nolock)
        LEFT JOIN prd0105 p05 WITH(nolock) ON p01.codi = p05.codi
        WHERE p01.codi IN (${codigos})
      `);
      console.log(resCompare.recordset);
    }
    
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

explore();
