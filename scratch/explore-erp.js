const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Gimbra2022',
  server: '192.168.194.169',
  port: 1433,
  database: 'BdNava04',
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  connectionTimeout: 15000,
  requestTimeout: 15000
};

async function run() {
  try {
    console.log('Intentando conectar a SQL Server en db.syscom.click...');
    const pool = await sql.connect(config);
    console.log('¡Conectado con éxito!');

    // 1. Explorar qué tablas de almacén y prd0101 existen
    console.log('\n--- Columnas de familia/subfamilia/línea en prd0101 ---');
    const colsResult = await pool.request().query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'prd0101' AND (column_name LIKE 'cod%' OR column_name LIKE 'nom%');
    `);
    colsResult.recordset.forEach(c => console.log(` - ${c.column_name} (${c.data_type})`));

    // 2. Consultar familias reales en el ERP
    console.log('\n--- Tabla de Familias (tbl01fam) ---');
    try {
      const famResult = await pool.request().query(`SELECT * FROM tbl01fam;`);
      console.table(famResult.recordset);
    } catch(err) {
      console.log('No existe tbl01fam o error:', err.message);
    }

    // 3. Consultar subfamilias reales en el ERP
    console.log('\n--- Tabla de Subfamilias (tbl01sbf) ---');
    try {
      const sbfResult = await pool.request().query(`SELECT TOP 20 * FROM tbl01sbf;`);
      console.table(sbfResult.recordset);
    } catch(err) {
      console.log('No existe tbl01sbf o error:', err.message);
    }

    // 4. Consultar distribución por codlin o codfam en prd0101
    console.log('\n--- Distribución de Familias/Líneas en prd0101 ---');
    const distResult = await pool.request().query(`
      SELECT TOP 15 codfam, codsbf, count(*) as cantidad
      FROM prd0101 WITH(nolock)
      GROUP BY codfam, codsbf
      ORDER BY cantidad DESC;
    `);
    console.table(distResult.recordset);

    await sql.close();
  } catch (err) {
    console.error('ERROR AL CONECTAR O CONSULTAR:', err.message);
  }
}

run();
