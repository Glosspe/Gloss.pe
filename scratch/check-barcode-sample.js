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

    const res = await pool.request().query(`
      SELECT TOP 10 
        RTRIM(codi) as SKU, 
        RTRIM(descr) as Nombre, 
        RTRIM(codf) as Barcode_codf, 
        RTRIM(altcodf) as AltBarcode
      FROM prd0101 WITH(nolock)
      WHERE codf IS NOT NULL AND LTRIM(RTRIM(codf)) != ''
    `);
    console.log('\n=== Ejemplos de Códigos de Barra en Navasoft ERP ===');
    console.table(res.recordset);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

main();
