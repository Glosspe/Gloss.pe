import sql from 'mssql';

const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER || 'db.syscom.click',
  port: parseInt(process.env.DB_PORT) || 1433,
  connectionTimeout: 15000,
  requestTimeout: 15000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  }
};

let poolPromise = null;

export const getErpConnection = async () => {
  try {
    if (poolPromise) {
      const pool = await poolPromise;
      if (pool.connected) return pool;
      poolPromise = null; // Re-inicializar si se desconectó
    }

    const configWithDb = { ...sqlConfig, database: process.env.DB_NAME || 'BdNava04' };
    console.log(`[ERP/SQL] Intentando conectar a ${configWithDb.database} en ${configWithDb.server}...`);
    
    poolPromise = new sql.ConnectionPool(configWithDb).connect();
    const pool = await poolPromise;
    console.log(`[ERP/SQL] ¡CONECTADO EXITOSAMENTE a ${configWithDb.database}!`);
    return pool;
  } catch (err) {
    console.error(`[ERP/SQL] ERROR DE CONEXIÓN:`, err.message);
    poolPromise = null;
    throw err;
  }
};
