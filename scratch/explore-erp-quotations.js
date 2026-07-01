require('dotenv').config();
const sql = require('mssql');

async function main() {
  const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT || '1433'),
    database: process.env.DB_NAME,
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: true
    }
  };

  const pool = await sql.connect(config);

  try {
    console.log(`\n--- DOCUMENTOS CON COT / PED / PV EN TBL01COR ---`);
    const corRes = await pool.request().query(`
      SELECT cdocu, codpto, nomdoc, nroini, nrofin 
      FROM tbl01cor
      WHERE nomdoc LIKE '%COT%' OR nomdoc LIKE '%PED%' OR nomdoc LIKE '%PV%' OR nomdoc LIKE '%PEDIDO%' OR nomdoc LIKE '%COTIZ%' OR cdocu IN ('CO', 'PE', 'PV')
    `);
    console.table(corRes.recordset);
  } catch (err) {
    console.error('Error al explorar tbl01cor:', err.message);
  }

  await sql.close();
}

main().catch(console.error);
