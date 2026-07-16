const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Gimbra2022',
  server: '192.168.194.169',
  port: 1433,
  database: 'BdNava04',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 5000
  },
};

async function main() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('✅ Conectado al ERP Navasoft!');

    const cols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'prd0101' AND (
        COLUMN_NAME LIKE '%bar%' OR 
        COLUMN_NAME LIKE '%cod%' OR 
        COLUMN_NAME LIKE '%ean%' OR 
        COLUMN_NAME LIKE '%sku%'
      )
      ORDER BY ORDINAL_POSITION
    `);
    console.log('\n=== Columnas de códigos/barras en prd0101 ===');
    console.table(cols.recordset);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

main();
