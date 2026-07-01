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
    console.log(`\n--- PUNTOS DE VENTA (tbl01pto) EN EL ERP ---`);
    const ptoRes = await pool.request().query(`
      SELECT codpto, nompto, codtie FROM tbl01pto
    `);
    console.table(ptoRes.recordset);

    console.log(`\n--- ALMACENES (tbl01Alm) EN EL ERP ---`);
    const almRes = await pool.request().query(`
      SELECT codalm, nomalm, codtie FROM tbl01Alm
    `);
    console.table(almRes.recordset);
  } catch (err) {
    console.error('Error al explorar puntos y almacenes:', err.message);
  }

  await sql.close();
}

main().catch(console.error);
