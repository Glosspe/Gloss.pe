const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const prisma = new PrismaClient();

async function test() {
  try {
    const total = await prisma.webProductoImagen.count({ where: { visible: true } });
    console.log('Total visibles:', total);

    const genericos = await prisma.webProductoImagen.count({
      where: {
        visible: true,
        OR: [
          { categoria: { in: ['otros', 'varios', 'sin categoria', 'genericos', ''] } },
          { categoria: null }
        ]
      }
    });
    console.log('Total en categoria genérica/vacía (UNASSIGNED):', genericos);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
    process.exit();
  }
}

test();
