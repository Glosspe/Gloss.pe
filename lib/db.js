import sql from 'mssql';

// Determinar si estamos en modo Túnel (Railway + Cloudflare Tunnel)
const isTunnelMode = process.env.CF_CLIENT_ID && process.env.CF_CLIENT_SECRET;

const sqlConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Si hay túnel forzamos 127.0.0.1 porque start.sh mapea db.syscom.click en local port 1433
  server: isTunnelMode ? '127.0.0.1' : (process.env.DB_SERVER || '127.0.0.1'),
  port: parseInt(process.env.DB_PORT) || 1433,
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 20,
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
  let retries = 3;
  while (retries > 0) {
    try {
      if (poolPromise) {
        const pool = await poolPromise;
        if (pool.connected) return pool;
        poolPromise = null; // Re-inicializar si se desconectó
      }

      const databaseName = process.env.DB_NAME || 'BdNava04';
      const configWithDb = { ...sqlConfig, database: databaseName };
      
      console.log(`[ERP/SQL] Intentando conectar a ${databaseName} via ${sqlConfig.server} (${retries} intentos restantes)...`);
      
      poolPromise = new sql.ConnectionPool(configWithDb).connect();
      const pool = await poolPromise;
      
      console.log(`[ERP/SQL] ¡CONECTADO EXITOSAMENTE a ${databaseName}!`);
      return pool;
    } catch (err) {
      retries--;
      console.error(`[ERP/SQL] ERROR DE CONEXIÓN (${retries} intentos restantes):`, err.message);
      poolPromise = null;
      
      if (retries === 0) throw err;
      
      console.log(`[ERP/SQL] Reintentando conexión en 2 segundos...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
};
