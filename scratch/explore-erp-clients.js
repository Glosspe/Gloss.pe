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
    console.log(`\n--- COLUMNAS DE LA TABLA MST01CLI ---`);
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'mst01cli'
    `);
    console.table(columns.recordset);

    console.log(`\n--- MUESTRA DE DATOS DE MST01CLI ---`);
    const sampleData = await pool.request().query(`
      SELECT TOP 2 * FROM mst01cli
    `);
    console.log(JSON.stringify(sampleData.recordset, null, 2));
  } catch (err) {
    console.error('Error al consultar mst01cli:', err.message);
  }

  await sql.close();
}

main().catch(console.error);
