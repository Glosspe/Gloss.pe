const sql = require('mssql');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const mssqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'Gimbra2022',
  server: process.env.DB_SERVER || '192.168.194.169',
  port: parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME || 'BdNava04',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  connectionTimeout: 10000,
  requestTimeout: 30000
};

async function main() {
  let mssqlPool;
  try {
    console.log('🔗 Conectando a Navasoft ERP SQL Server...');
    mssqlPool = await sql.connect(mssqlConfig);
    console.log('✅ Conectado a SQL Server.');

    console.log('📥 Obteniendo códigos de barra (codf) desde prd0101...');
    const result = await mssqlPool.request().query(`
      SELECT 
        RTRIM(codi) as id,
        RTRIM(codf) as barcode
      FROM prd0101 WITH(nolock)
      WHERE estado = 1 AND codf IS NOT NULL AND LTRIM(RTRIM(codf)) != ''
    `);

    const products = result.recordset;
    console.log(`📦 Encontrados ${products.length} productos con código de barras en Navasoft.`);

    let updatedCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const updates = batch.map(p => 
        prisma.webProductoImagen.updateMany({
          where: { codart: p.id },
          data: { codbar: p.barcode }
        })
      );
      await Promise.all(updates);
      updatedCount += batch.length;
      console.log(`⏳ Sincronizados ${updatedCount} / ${products.length} códigos de barras...`);
    }

    console.log('\n✅ ¡TODOS LOS CÓDIGOS DE BARRA FUERON SINCRONIZADOS EXITOSAMENTE EN POSTGRESQL!');

  } catch (err) {
    console.error('❌ Error sincronizando códigos de barra:', err.message);
  } finally {
    if (mssqlPool) await mssqlPool.close();
    await pool.end();
  }
}

main();
