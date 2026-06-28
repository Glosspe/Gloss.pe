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

async function testEquivalentsQuery() {
  try {
    const pool = await sql.connect(config);
    console.log("Conectado al ERP. Probando consulta consolidada de equivalentes...");

    const sampleCodi = '0505-010288'; // Shampoo Placenta Life
    const activeWarehouses = ['01', '02', '04']; // Sedes simuladas activas

    console.log(`\nBuscando productos complementarios de: ${sampleCodi}`);

    // Construir la consulta SQL con la misma estructura dinámica de stock que implementamos antes
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
    const joinsSql = joinParts.join('\n          ');

    const query = `
      SELECT 
        RTRIM(p01.codi) as id, 
        RTRIM(p01.codf) as userCode, 
        RTRIM(p01.descr) as name, 
        RTRIM(p01.marc) as brand, 
        RTRIM(p01.umed) as unit, 
        p01.pvns as price, 
        ${stockExpression} as stock,
        RTRIM(p01.obse) as observations,
        RTRIM(s.codsub) as categoryCode,
        RTRIM(s.nomsub) as categoryName
      FROM dtl_item_equivalente eq WITH(nolock)
      INNER JOIN prd0101 p01 WITH(nolock) ON eq.codiequi = p01.codi
      ${joinsSql}
      LEFT JOIN tbl01sbf s WITH(nolock) ON LEFT(p01.codi, 2) + '-' + SUBSTRING(p01.codi, 3, 2) = s.codsub
      WHERE eq.codi = @targetCodi AND p01.estado = 1
      ORDER BY p01.descr ASC
    `;

    console.log("\nConsulta SQL generada:\n", query);

    const result = await pool.request()
      .input('targetCodi', sql.VarChar, sampleCodi)
      .query(query);

    console.log("\n--- RESULTADOS DE COMPLEMENTARIOS ---");
    console.table(result.recordset);

    await pool.close();
  } catch (err) {
    console.error("Error:", err);
  }
}

testEquivalentsQuery();
