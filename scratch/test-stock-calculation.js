// Script de prueba para validar la consulta dinámica de stock por múltiples almacenes (sedes)
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

async function testStockCalculation() {
  try {
    console.log("Conectando al ERP...", config.server);
    const pool = await sql.connect(config);
    console.log("Conectado.");

    // Supongamos que activamos los almacenes 01 (UGARTE), 02 (ARICA 870) y 04 (BALTA)
    const activeWarehouses = ['01', '02', '04'];
    console.log(`\nSimulando almacenes activos:`, activeWarehouses);

    // Construir la consulta dinámica
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

    const stockExpression = selectStockParts.length > 0 ? `(${selectStockParts.join(' + ')})` : '0';
    const joinsSql = joinParts.join('\n          ');

    const query = `
      SELECT TOP 10
        RTRIM(p01.codi) as id,
        RTRIM(p01.descr) as name,
        RTRIM(p01.marc) as brand,
        p01.stoc as stock_01,
        ${activeWarehouses.includes('02') ? 'p02.stoc' : '0'} as stock_02,
        ${activeWarehouses.includes('04') ? 'p04.stoc' : '0'} as stock_04,
        ${stockExpression} as totalStock
      FROM prd0101 p01 WITH(nolock)
      ${joinsSql}
      WHERE p01.estado = 1 AND ${stockExpression} <> 0
      ORDER BY totalStock DESC
    `;

    console.log("\nConsulta SQL generada:\n", query);

    const result = await pool.request().query(query);
    console.log("\n--- RESULTADOS DEL STOCK DINÁMICO ---");
    result.recordset.forEach(p => {
      console.log(`Producto: ${p.id} - ${p.name.trim()}`);
      console.log(`   Sede 01 (Ugarte):   ${p.stock_01}`);
      console.log(`   Sede 02 (Arica 870): ${p.stock_02}`);
      console.log(`   Sede 04 (Balta):     ${p.stock_04}`);
      console.log(`   => STOCK TOTAL WEB:  ${p.totalStock}`);
      
      // Validar estado de stock
      let status = "Disponible";
      if (p.totalStock <= 0) status = "Agotado";
      else if (p.totalStock <= 10) status = "Poco Stock";
      console.log(`   => ESTADO WEB:       ${status}\n`);
    });

    await pool.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

testStockCalculation();
