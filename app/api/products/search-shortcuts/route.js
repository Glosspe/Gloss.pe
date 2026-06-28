import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    // 1. Obtener atajos de búsqueda desde PostgreSQL
    const shortcuts = await prisma.webSearchShortcut.findMany({
      where: { visible: true },
      orderBy: { orden: 'asc' }
    });

    if (shortcuts.length > 0) {
      return NextResponse.json(shortcuts);
    }

    // 2. Si no hay atajos registrados, devolver los valores predeterminados (Seed temporal)
    const defaultShortcuts = [
      { id: '1', texto: "L'Oréal", tipo: 'BRAND', enlace: '?brand=L%27OREAL', orden: 1 },
      { id: '2', texto: 'Keratimask', tipo: 'BRAND', enlace: '?brand=KERATIMASK', orden: 2 },
      { id: '3', texto: 'Be Natural', tipo: 'BRAND', enlace: '?brand=BE%20NATURAL', orden: 3 },
      { id: '4', texto: 'Cherimoya', tipo: 'BRAND', enlace: '?brand=CHERIMOYA', orden: 4 },
      { id: '5', texto: 'Cabello', tipo: 'CATEGORY', enlace: '?category=05-01', orden: 5 },
      { id: '6', texto: 'Uñas', tipo: 'CATEGORY', enlace: '?category=09-01', orden: 6 },
      { id: '7', texto: 'Pestañas', tipo: 'CATEGORY', enlace: '?category=04-01', orden: 7 },
      { id: '8', texto: 'Tinte', tipo: 'QUERY', enlace: '?query=tinte', orden: 8 },
      { id: '9', texto: 'Ampolla', tipo: 'QUERY', enlace: '?query=ampolla', orden: 9 }
    ];

    return NextResponse.json(defaultShortcuts);
  } catch (err) {
    console.error('[API Search Shortcuts] Error recuperando atajos:', err.message);
    // Retornar fallback seguro para no romper el frontend
    return NextResponse.json([
      { id: 'f1', texto: "L'Oréal", tipo: 'BRAND', enlace: '?brand=L%27OREAL' },
      { id: 'f2', texto: 'Uñas', tipo: 'CATEGORY', enlace: '?category=09-01' },
      { id: 'f3', texto: 'Cabello', tipo: 'CATEGORY', enlace: '?category=05-01' }
    ]);
  }
}
