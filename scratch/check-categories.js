require('dotenv').config();
const prisma = require('../lib/prisma.js').default;

async function main() {
  console.log('--- 1. CONFIGURACIONES GLOBALES ---');
  const configs = await prisma.webGlobalConfig.findMany();
  configs.forEach(c => {
    console.log(`Clave: ${c.clave}`);
    if (c.clave === 'CATEGORIES_TREE') {
      try {
        console.log('CATEGORIES_TREE:', JSON.stringify(JSON.parse(c.valor), null, 2));
      } catch (e) {
        console.log('Error parseando CATEGORIES_TREE:', c.valor);
      }
    } else {
      console.log(`Valor: ${c.valor}`);
    }
  });

  console.log('\n--- 2. CATEGORÍAS EN PRODUCTOS (Distinct) ---');
  const distinctCats = await prisma.webProductoImagen.findMany({
    select: { categoria: true },
    distinct: ['categoria']
  });
  console.log('Categorías en BD:', distinctCats.map(c => c.categoria));

  console.log('\n--- 3. EJEMPLO DE PRODUCTOS ---');
  const sample = await prisma.webProductoImagen.findMany({
    take: 5,
    select: { codart: true, nombre: true, categoria: true, imagenes: true }
  });
  console.log('Productos de muestra:', JSON.stringify(sample, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
