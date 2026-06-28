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

async function main() {
  try {
    console.log("Conectando al ERP...", config.server);
    const pool = await sql.connect(config);
    console.log("Conectado.");

    console.log("\n--- MAPA COMPLETO DE FAMILIAS Y SUBFAMILIAS CON PRODUCTOS ACTIVOS ---");
    const query = `
      SELECT 
        RTRIM(f.codfam) as familyId, 
        RTRIM(f.nomfam) as familyName,
        RTRIM(s.codsub) as subfamilyId, 
        RTRIM(s.nomsub) as subfamilyName,
        COUNT(p.codi) as productCount
      FROM tbl01fam f WITH(nolock)
      INNER JOIN tbl01sbf s WITH(nolock) ON f.codfam = s.codfam
      INNER JOIN prd0101 p WITH(nolock) ON LTRIM(RTRIM(s.codsub)) = LEFT(p.codi, 2) + '-' + LTRIM(RTRIM(p.codcat))
      WHERE p.estado = 1
      GROUP BY f.codfam, f.nomfam, s.codsub, s.nomsub
      ORDER BY f.nomfam ASC, productCount DESC
    `;

    const result = await pool.request().query(query);
    console.log(`Se encontraron ${result.recordset.length} relaciones activas.\n`);

    // Agrupar por familia para imprimir bonito
    const families = {};
    result.recordset.forEach(row => {
      if (!families[row.familyId]) {
        families[row.familyId] = {
          name: row.familyName,
          subfamilies: []
        };
      }
      families[row.familyId].subfamilies.push({
        id: row.subfamilyId,
        name: row.subfamilyName,
        count: row.productCount
      });
    });

    for (const [famId, fam] of Object.entries(families)) {
      console.log(`[FAMILIA] ${famId} - ${fam.name}`);
      fam.subfamilies.forEach(sub => {
        console.log(`   └─ [SUBFAMILIA] ${sub.id} - ${sub.name.padEnd(30)} (Productos: ${sub.count})`);
      });
      console.log("");
    }

    await pool.close();
  } catch (err) {
    console.error("Error general:", err);
  }
}

main();
