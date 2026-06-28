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
    console.log("Conectado al ERP. Buscando tablas con nombres relacionados a equivalentes, similares o relaciones...");

    // 1. Buscar tablas que contengan 'equi', 'simi', 'rel' o similares en el nombre
    const queryTables = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%equi%' 
         OR TABLE_NAME LIKE '%simi%'
         OR TABLE_NAME LIKE '%asoc%'
         OR TABLE_NAME LIKE '%cruz%'
      ORDER BY TABLE_NAME
    `;
    const tablesRes = await pool.request().query(queryTables);
    console.log("\n--- TABLAS ENCONTRADAS ---");
    console.table(tablesRes.recordset);

    // 2. Buscar columnas en cualquier tabla que contengan 'equi' o similar en su nombre
    const queryColumns = `
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME LIKE '%equi%'
         OR COLUMN_NAME LIKE '%simi%'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `;
    const colsRes = await pool.request().query(queryColumns);
    console.log("\n--- COLUMNAS ENCONTRADAS ---");
    console.table(colsRes.recordset);

    // 3. Vamos a buscar un artículo de ejemplo en el ERP para ver qué relaciones tiene.
    // El artículo en la imagen es "Shampoo Reparacion Intensa Placenta Life 400ml"
    // Busquemos en prd0101 artículos que contengan 'Placenta' o 'Reparacion'
    const querySampleArt = `
      SELECT TOP 5 RTRIM(codi) as codi, RTRIM(descr) as descr, RTRIM(marc) as marc 
      FROM prd0101 WITH(nolock)
      WHERE descr LIKE '%Placenta%' AND descr LIKE '%Shampoo%'
    `;
    const sampleArtRes = await pool.request().query(querySampleArt);
    console.log("\n--- SHAMPOOS PLACENTA ENCONTRADOS ---");
    console.table(sampleArtRes.recordset);

    await pool.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

explore();
