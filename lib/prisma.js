import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

let prisma;

// Solo inicializar si la URL de conexión está configurada (evita caídas si no se ha configurado localmente)
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/tienda_gloss?schema=public';

const createPrismaInstance = () => {
  const pool = new Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaInstance();
} else {
  // Evitar múltiples instancias del cliente de Prisma en modo desarrollo debido a Hot Reloading
  if (!global.prisma) {
    global.prisma = createPrismaInstance();
  }
  prisma = global.prisma;
}

export default prisma;
