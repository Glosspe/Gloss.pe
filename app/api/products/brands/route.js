import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';

export async function GET() {
  try {
    // Modo Proxy
    const localApiUrl = process.env.LOCAL_API_URL;
    if (localApiUrl) {
      const cleanApiUrl = localApiUrl.replace(/\/$/, '');
      try {
        const res = await fetch(`${cleanApiUrl}/api/products/brands`, {
          headers: { 'Content-Type': 'application/json' },
          next: { revalidate: 300 }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            return NextResponse.json(data);
          }
        }
      } catch (proxyErr) {
        console.warn('[API Brands - PROXY] Proxy no disponible:', proxyErr.message);
      }
    }

    // Modo local / ERP
    let pool;
    let useFallback = false;
    try {
      pool = await getErpConnection();
    } catch (dbErr) {
      console.warn('[API Brands] ERP no disponible, usando fallback mock');
      useFallback = true;
    }

    if (!useFallback) {
      try {
        // Query de marcas únicas de productos activos
        const result = await pool.request().query(`
          SELECT DISTINCT 
            RTRIM(marc) as name
          FROM prd0101 WITH(nolock)
          WHERE estado = 1 AND marc IS NOT NULL AND LTRIM(RTRIM(marc)) != '' AND LTRIM(RTRIM(marc)) != 'ND'
          ORDER BY name ASC
        `);

        if (result.recordset.length > 0) {
          return NextResponse.json(result.recordset);
        }
      } catch (dbErr) {
        console.error('[API Brands] Error en query ERP:', dbErr.message);
      }
    }

    // Fallback Mock de emergencia si falla la base de datos
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
