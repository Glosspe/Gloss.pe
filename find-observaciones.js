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
  },
};

async function main() {
  let pool;
  try {
    pool = await sql.connect(config);
    console.log('✅ Conectado al ERP!\n');

    // 1. Obtener todas las columnas de prd0101
    console.log('=== Columnas de prd0101 ===');
    const cols = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'prd0101'
      ORDER BY ORDINAL_POSITION
    `);
    console.table(cols.recordset);

    // 2. Buscar columnas en prd0101 que tengan nombres interesantes (obs, nota, coment, desc, memo, etc.)
    console.log('\n=== Columnas sospechosas en prd0101 ===');
    const filteredCols = cols.recordset.filter(c => {
      const name = c.COLUMN_NAME.toLowerCase();
      return name.includes('obs') || 
             name.includes('nota') || 
             name.includes('coment') || 
             name.includes('memo') || 
             name.includes('adicional') ||
             name.includes('usr_') || 
             name.includes('campo') ||
             name.includes('descr') ||
             name.includes('det') ||
             name.includes('esp');
    });
    console.table(filteredCols);

    // 3. Buscar tablas que tengan relación con el producto o se llamen algo similar a observaciones
    console.log('\n=== Tablas relacionadas con observaciones o artículos ===');
    const tables = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME LIKE '%obs%' 
         OR TABLE_NAME LIKE '%nota%' 
         OR TABLE_NAME LIKE '%coment%' 
         OR TABLE_NAME LIKE '%descr%'
         OR TABLE_NAME LIKE '%memo%'
         OR TABLE_NAME LIKE '%art%'
         OR TABLE_NAME LIKE '%prd%obs%'
         OR TABLE_NAME LIKE '%obs%prd%'
         OR TABLE_NAME LIKE '%txt%'
         OR TABLE_NAME LIKE '%info%'
      ORDER BY TABLE_NAME
    `);
    console.table(tables.recordset);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    if (pool) await pool.close();
  }
}

main();
