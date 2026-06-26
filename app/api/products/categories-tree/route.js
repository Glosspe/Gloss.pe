import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';

export async function GET() {
  try {
    // Modo Proxy
    const localApiUrl = process.env.LOCAL_API_URL;
    if (localApiUrl) {
      const cleanApiUrl = localApiUrl.replace(/\/$/, '');
      try {
        const res = await fetch(`${cleanApiUrl}/api/products/categories-tree`, {
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
        console.warn('[API Categories Tree - PROXY] Proxy no disponible:', proxyErr.message);
      }
    }

    // Modo local / ERP
    let pool;
    let useFallback = false;
    try {
      pool = await getErpConnection();
    } catch (dbErr) {
      console.warn('[API Categories Tree] ERP no disponible, usando fallback mock');
      useFallback = true;
    }

    if (!useFallback) {
      try {
        // Query jerárquica de Familias y Subfamilias que tengan productos activos
        const result = await pool.request().query(`
          SELECT 
            RTRIM(f.codfam) as familyId, 
            RTRIM(f.nomfam) as familyName,
            RTRIM(s.codsub) as subfamilyId, 
            RTRIM(s.nomsub) as subfamilyName
          FROM tbl01fam f WITH(nolock)
          INNER JOIN tbl01sbf s WITH(nolock) ON f.codfam = s.codfam
          WHERE s.codsub IN (
            SELECT DISTINCT LEFT(p.codi, 2) + '-' + SUBSTRING(p.codi, 3, 2)
            FROM prd0101 p WITH(nolock)
            WHERE p.estado = 1
          )
          ORDER BY f.nomfam ASC, s.nomsub ASC
        `);

        if (result.recordset.length > 0) {
          const treeMap = new Map();

          result.recordset.forEach(row => {
            const famId = row.familyId;
            const famName = row.familyName;
            const subId = row.subfamilyId;
            const subName = row.subfamilyName;

            // Ignorar categoría 'CONTABLE' si existiese
            if (famId === '00' || famName.toLowerCase().includes('contable')) return;

            if (!treeMap.has(famId)) {
              treeMap.set(famId, {
                id: famId,
                name: famName,
                subcategories: []
              });
            }

            treeMap.get(famId).subcategories.push({
              id: subId,
              name: subName
            });
          });

          const categoriesTree = Array.from(treeMap.values());
          return NextResponse.json(categoriesTree);
        }
      } catch (dbErr) {
        console.error('[API Categories Tree] Error en query ERP:', dbErr.message);
      }
    }

    // Fallback Mock de emergencia si falla la base de datos
    return NextResponse.json([
      {
        id: '05',
        name: 'CABELLO',
        subcategories: [
          { id: '05-01', name: 'SHAMPOO' },
          { id: '05-02', name: 'ACONDICIONADOR' },
          { id: '05-05', name: 'MASCARILLAS' }
        ]
      },
      {
        id: '04',
        name: 'ROSTRO',
        subcategories: [
          { id: '04-01', name: 'COSMETICOS' },
          { id: '04-04', name: 'HIDRATACION' }
        ]
      },
      {
        id: '06',
        name: 'CUERPO',
        subcategories: [
          { id: '06-03', name: 'CREMAS' }
        ]
      }
    ]);

  } catch (error) {
    console.error('[API Categories Tree] ERROR CRÍTICO:', error);
    return NextResponse.json(
      { error: 'Error al obtener árbol de categorías', details: error.message },
      { status: 500 }
    );
  }
}
