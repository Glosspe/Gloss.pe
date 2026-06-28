import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // 1. Intentar cargar la lista de marcas guardada por el agente de sincronización en PostgreSQL
    console.log('[API Brands] Consultando lista de marcas en PostgreSQL...');
    
    try {
      const brandsConfig = await prisma.webGlobalConfig.findUnique({
        where: { clave: 'BRANDS_LIST' }
      });

      if (brandsConfig && brandsConfig.valor) {
        const brands = JSON.parse(brandsConfig.valor);
        if (Array.isArray(brands) && brands.length > 0) {
          console.log(`[API Brands] Retornando ${brands.length} marcas leídas de base de datos.`);
          return NextResponse.json(brands);
        }
      }
    } catch (pgErr) {
      console.warn('[API Brands] Error leyendo BRANDS_LIST de PostgreSQL, intentando consulta dinámica:', pgErr.message);
    }

    // 2. Fallback dinámico: Extraer marcas directamente de los productos sincronizados en base de datos
    try {
      const distinctBrands = await prisma.webProductoImagen.findMany({
        select: { marca: true },
        where: {
          visible: true,
          marca: { not: null }
        },
        distinct: ['marca']
      });

      if (distinctBrands.length > 0) {
        const formattedBrands = distinctBrands
          .map(b => ({ name: b.marca.trim() }))
          .filter(b => b.name !== '' && b.name !== 'ND')
          .sort((a, b) => a.name.localeCompare(b.name));

        if (formattedBrands.length > 0) {
          console.log(`[API Brands] Retornando ${formattedBrands.length} marcas leídas dinámicamente de productos.`);
          return NextResponse.json(formattedBrands);
        }
      }
    } catch (dynErr) {
      console.warn('[API Brands] Error en consulta dinámica de marcas:', dynErr.message);
    }

    // 3. Fallback Mock de emergencia de último nivel
    console.log('[API Brands] Usando fallback mock de marcas de emergencia');
    return NextResponse.json([
      { name: 'CHERIMOYA' },
      { name: 'ACRY LOVE' },
      { name: 'RECAMIER' },
      { name: 'GARNIER' },
      { name: 'BABARIA' },
      { name: 'SKALA EXPERT' },
      { name: 'VOGUE' },
      { name: 'BRESCIA' }
    ]);

  } catch (error) {
    console.error('[API Brands] ERROR CRÍTICO:', error);
    return NextResponse.json(
      { error: 'Error al obtener marcas', details: error.message },
      { status: 500 }
    );
  }
}
