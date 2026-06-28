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

async function getWarehouses() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT RTRIM(codalm) as codalm, RTRIM(nomalm) as nomalm FROM tbl01alm");
    console.log(JSON.stringify(result.recordset, null, 2));
    await pool.close();
  } catch (err) {
    console.error(err);
  }
}

getWarehouses();
