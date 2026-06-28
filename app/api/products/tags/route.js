import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    // 1. Obtener todas las etiquetas de necesidad de la base de datos
    const tags = await prisma.webProductTag.findMany({
      where: { visible: true },
      orderBy: { orden: 'asc' }
    });

    if (tags.length > 0) {
      // Mapear el string JSON a array para facilitar el uso en el frontend
      const formattedTags = tags.map(t => {
        let productIds = [];
        try {
          productIds = JSON.parse(t.productos || '[]');
        } catch (e) {
          productIds = [];
        }
        return {
          id: t.id,
          etiqueta: t.etiqueta,
          orden: t.orden,
          productos: productIds
        };
      });
      return NextResponse.json(formattedTags);
    }

    // 2. Fallback con semillas iniciales comunes en cosmética capilar
    const defaultTags = [
      { id: 't1', etiqueta: '#AntiFrizz', orden: 1, productos: [] },
      { id: 't2', etiqueta: '#ControlCaida', orden: 2, productos: [] },
      { id: 't3', etiqueta: '#ProteccionColor', orden: 3, productos: [] },
      { id: 't4', etiqueta: '#BrilloIntenso', orden: 4, productos: [] },
      { id: 't5', etiqueta: '#CabelloMaltratado', orden: 5, productos: [] },
      { id: 't6', etiqueta: '#UñasFuertes', orden: 6, productos: [] }
    ];

    return NextResponse.json(defaultTags);
  } catch (err) {
    console.error('[API Product Tags] Error obteniendo etiquetas:', err.message);
    return NextResponse.json([
      { id: 'fe1', etiqueta: '#AntiFrizz', orden: 1, productos: [] },
      { id: 'fe2', etiqueta: '#ControlCaida', orden: 2, productos: [] }
    ]);
  }
}
