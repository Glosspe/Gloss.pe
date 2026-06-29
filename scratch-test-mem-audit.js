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
    
    // Traemos solo 3 columnas indexadas
    const startDb = Date.now();
    const res = await client.query('SELECT codart, nombre, categoria, visible, imagenes FROM web_producto_imagenes WHERE visible = true');
    console.log('Lectura de DB completada en:', Date.now() - startDb, 'ms. Registros:', res.rows.length);

    const startMapping = Date.now();
    const auditedProducts = res.rows.map(p => {
      const nameLower = (p.nombre || '').toLowerCase();
      const catName = p.categoria ? p.categoria.trim() : '';
      const catNameLower = catName.toLowerCase();
      
      let status = 'CORRECT';
      let alertMessage = '';
      let suggestedCategory = '';
      let suggestedSubcategory = '';

      const isCapilarName = /shampoo|acondicionador|shamp|capilar|keratina|laceador|lacio|rizo|cabello|mascarilla capilar|ampolla capilar|crema de peinar|crema para peinar|oleo capilar|tratamiento capilar|silicona capilar|tinte|decolorante|oxidante|activador/i.test(nameLower);
      const isCapilarCategory = /cabello|capilar|shampoo|acondicionador|tinte|botox|post lacio/i.test(catNameLower);

      const isFacialName = !isCapilarName && /crema|hidratante|serum|suero|limpiador|tonico|facial|rostro|contorno|bloqueador|antiedad|antiarrugas|micelar|desmaquill|exfoliante|skincare|skin care|protector solar/i.test(nameLower);
      const isFacialCategory = /rostro|facial|cutis|piel|cremas/i.test(catNameLower);

      const isUñasName = /esmalte|quitaesmalte|nail|uñas|limador|top coat|base coat|acrilico|pedicure|manicure|corta uñas|corta uña|cortaúñas|cortaúña/i.test(nameLower);
      const isUñasCategory = /uñas|manicure|pedicure|esmalte/i.test(catNameLower);

      if (isCapilarName && !isCapilarCategory) {
        status = 'INCONSISTENT';
        alertMessage = `El nombre sugiere cuidado capilar, pero su categoría es "${catName || 'Sin Nombre'}".`;
        suggestedCategory = 'Cabello';
        suggestedSubcategory = 'Cuidado Capilar';
      } else if (isFacialName && !isFacialCategory) {
        status = 'INCONSISTENT';
        alertMessage = `El producto sugiere cuidado de la piel/facial, pero su categoría es "${catName || 'Sin Nombre'}".`;
        suggestedCategory = 'Rostro';
        suggestedSubcategory = 'Cuidado Facial';
      } else if (isUñasName && !isUñasCategory) {
        status = 'INCONSISTENT';
        alertMessage = `El producto sugiere manicure/uñas, pero su categoría es "${catName || 'Sin Nombre'}".`;
        suggestedCategory = 'Uñas';
        suggestedSubcategory = 'Esmaltes y Manicure';
      } else if (!catName || catNameLower === 'otros' || catNameLower === 'varios' || catNameLower === 'sin categoria' || catNameLower === 'genericos' || catName === '' || catNameLower.includes('accesorio')) {
        if (isCapilarName || isFacialName || isUñasName) {
          status = 'INCONSISTENT';
          alertMessage = `El producto es un cosmético activo, pero está clasificado bajo la categoría genérica "${catName || 'ACCESORIOS'}".`;
          if (isCapilarName) {
            suggestedCategory = 'Cabello';
            suggestedSubcategory = 'Cuidado Capilar';
          } else if (isFacialName) {
            suggestedCategory = 'Rostro';
            suggestedSubcategory = 'Cuidado Facial';
          } else {
            suggestedCategory = 'Uñas';
            suggestedSubcategory = 'Esmaltes y Manicure';
          }
        } else {
          status = 'UNASSIGNED';
          alertMessage = `El producto está en una categoría genérica o vacía.`;
          suggestedCategory = 'Por Definir';
          suggestedSubcategory = 'Pendiente Clasificación';
        }
      }

      let imgs = [];
      try { imgs = JSON.parse(p.imagenes || '[]'); } catch (errJson) { imgs = []; }

      return {
        id: p.codart,
        userCode: p.codart,
        name: p.nombre || '',
        categoryName: catName || '(Sin categoría)',
        status,
        alertMessage,
        suggestedCategory,
        suggestedSubcategory,
        image: imgs.length > 0 ? imgs[0] : null,
        visible: p.visible !== false
      };
    });
    console.log('Mapeo Regex en memoria completado en:', Date.now() - startMapping, 'ms');

    const discrepant = auditedProducts.filter(p => p.status !== 'CORRECT');
    console.log('Total discrepancias:', discrepant.length, 'Tiempo total:', Date.now() - start, 'ms');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
    process.exit();
  }
}

test();
