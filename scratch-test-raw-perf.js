const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pgConfig = {
  connectionString: process.env.DATABASE_URL
};

async function test() {
  const start = Date.now();
  const client = new Client(pgConfig);
  try {
    await client.connect();
    console.log('Conectado a Postgres...');
    
    const sqlQuery = `
      SELECT 
        codart as id,
        codart as "userCode",
        nombre as name,
        COALESCE(categoria, '') as "categoryName",
        visible,
        imagenes,
        CASE 
          WHEN (nombre ~* 'shampoo|acondicionador|shamp|capilar|keratina|laceador|lacio|rizo|cabello|mascarilla capilar|ampolla capilar|crema de peinar|crema para peinar|oleo capilar|tratamiento capilar|silicona capilar|tinte|decolorante|oxidante|activador') 
               AND NOT (categoria ~* 'cabello|capilar|shampoo|acondicionador|tinte|botox|post lacio') THEN 'INCONSISTENT'
               
          WHEN NOT (nombre ~* 'shampoo|acondicionador|shamp|capilar|keratina|laceador|lacio|rizo|cabello|mascarilla capilar|ampolla capilar|crema de peinar|crema para peinar|oleo capilar|tratamiento capilar|silicona capilar|tinte|decolorante|oxidante|activador')
               AND (nombre ~* 'crema|hidratante|serum|suero|limpiador|tonico|facial|rostro|contorno|bloqueador|antiedad|antiarrugas|micelar|desmaquill|exfoliante|skincare|skin care|protector solar')
               AND NOT (categoria ~* 'rostro|facial|cutis|piel|cremas') THEN 'INCONSISTENT'
               
          WHEN (nombre ~* 'esmalte|quitaesmalte|nail|uñas|limador|top coat|base coat|acrilico|pedicure|manicure|corta uñas|corta uña|cortaúñas|cortaúña')
               AND NOT (categoria ~* 'uñas|manicure|pedicure|esmalte') THEN 'INCONSISTENT'
               
          WHEN (categoria IS NULL OR categoria = '' OR LOWER(categoria) IN ('otros', 'varios', 'sin categoria', 'genericos') OR LOWER(categoria) LIKE '%accesorio%') THEN 
               CASE 
                 WHEN (nombre ~* 'shampoo|acondicionador|shamp|capilar|keratina|laceador|lacio|rizo|cabello|mascarilla capilar|ampolla capilar|crema de peinar|crema para peinar|oleo capilar|tratamiento capilar|silicona capilar|tinte|decolorante|oxidante|activador'
                       OR nombre ~* 'crema|hidratante|serum|suero|limpiador|tonico|facial|rostro|contorno|bloqueador|antiedad|antiarrugas|micelar|desmaquill|exfoliante|skincare|skin care|protector solar'
                       OR nombre ~* 'esmalte|quitaesmalte|nail|uñas|limador|top coat|base coat|acrilico|pedicure|manicure|corta uñas|corta uña|cortaúñas|cortaúña') THEN 'INCONSISTENT'
                 ELSE 'UNASSIGNED'
               END
          ELSE 'CORRECT'
        END as status
      FROM web_producto_imagenes
      WHERE visible = true
    `;

    const res = await client.query(sqlQuery);
    console.log('Consulta SQL Raw completada en:', Date.now() - start, 'ms. Registros:', res.rows.length);
    console.log('Muestra:', res.rows.slice(0, 2));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
    process.exit();
  }
}

test();
