const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pgConfig = {
  connectionString: process.env.DATABASE_URL
};

async function clean() {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log('Conectado a Postgres para limpieza...');

    // 1. Ver conexiones activas
    const resConnections = await client.query(`
      SELECT pid, state, query, age(clock_timestamp(), query_start) 
      FROM pg_stat_activity 
      WHERE datname = current_database();
    `);
    console.log('Conexiones activas antes de limpiar:', resConnections.rows.length);
    console.log(resConnections.rows.map(r => ({ pid: r.pid, state: r.state, query: r.query, age: r.age })));

    // 2. Terminar conexiones idle/huérfanas de otros procesos que lleven más de 2 minutos
    const resKill = await client.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = current_database() 
        AND pid <> pg_backend_pid()
        AND (state = 'idle' OR state = 'idle in transaction' OR age(clock_timestamp(), query_start) > interval '2 minutes');
    `);
    console.log('Conexiones huérfanas terminadas:', resKill.rows.length);

    // 3. Comprobar conexiones después de limpiar
    const resAfter = await client.query(`
      SELECT pid, state, query 
      FROM pg_stat_activity 
      WHERE datname = current_database();
    `);
    console.log('Conexiones activas después de limpiar:', resAfter.rows.length);

  } catch (err) {
    console.error('Error durante la limpieza de BD:', err.message);
  } finally {
    await client.end();
    process.exit();
  }
}

clean();
