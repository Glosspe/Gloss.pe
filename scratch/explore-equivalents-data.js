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
    console.log("Conectado al ERP. Explorando la tabla dtl_item_equivalente...");

    // 1. Consultar algunos registros de dtl_item_equivalente
    const sampleResult = await pool.request().query(`
      SELECT TOP 20 
        RTRIM(codi) as codi, 
        RTRIM(codiequi) as codiequi
      FROM dtl_item_equivalente WITH(nolock)
    `);
    console.log("\n--- Primeros 20 registros de dtl_item_equivalente ---");
    console.table(sampleResult.recordset);

    // 2. Buscar equivalentes para "Shampoo Reparacion Intensa Placenta Life 400ml" (código '0505-010288')
    const placentaResult = await pool.request().query(`
      SELECT RTRIM(codi) as codi, RTRIM(codiequi) as codiequi
      FROM dtl_item_equivalente WITH(nolock)
      WHERE codi = '0505-010288' OR codiequi = '0505-010288'
    `);
    console.log("\n--- Registros de equivalentes para el artículo Placenta Life '0505-010288' ---");
    console.table(placentaResult.recordset);

    // 3. Obtener nombres de productos equivalentes del Placenta Life
    const placentaJoinResult = await pool.request().query(`
      SELECT 
        RTRIM(e.codi) as codi_origen,
        RTRIM(p1.descr) as descr_origen,
        RTRIM(e.codiequi) as codi_equivalente,
        RTRIM(p2.descr) as descr_equivalente
      FROM dtl_item_equivalente e WITH(nolock)
      LEFT JOIN prd0101 p1 WITH(nolock) ON e.codi = p1.codi
      LEFT JOIN prd0101 p2 WITH(nolock) ON e.codiequi = p2.codi
      WHERE e.codi = '0505-010288' OR e.codiequi = '0505-010288'
    `);
    console.log("\n--- Joins de descripciones para el producto Placenta Life ---");
    console.table(placentaJoinResult.recordset);

    // 4. Ver total de relaciones guardadas
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total_relaciones FROM dtl_item_equivalente WITH(nolock)
    `);
    console.log(`\nTotal de relaciones de equivalencia en la base de datos: ${countResult.recordset[0].total_relaciones}`);

    await pool.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

explore();
