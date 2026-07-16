import { NextResponse } from 'next/server';
import { getErpConnection } from '@/lib/db';
import prisma from '@/lib/prisma';
import sql from 'mssql';

// Helper para formatear nombres de productos
function formatProductName(name) {
  if (!name) return '';
  const cleaned = name.trim().replace(/\s+/g, ' ');
  const lower = cleaned.toLowerCase();
  const words = lower.split(' ');
  const connectors = ['de', 'con', 'y', 'el', 'la', 'para', 'en', 'al', 'del', 'los', 'las', 'un', 'una'];
  const uppercaseUnits = ['ml', 'gr', 'kg', 'fps', 'uv', '3d', 'pz', 'pza', 'pzas'];
  
  const formattedWords = words.map((word, index) => {
    if (!word) return '';
    if (connectors.includes(word) && index !== 0) return word;
    if (uppercaseUnits.includes(word)) return word.toUpperCase();
    if (/^\d+(ml|gr|g|kg|oz|pz|pza|pzas|fps)$/i.test(word)) {
      const numberPart = word.match(/^\d+/)[0];
      const unitPart = word.match(/[a-z]+$/i)[0].toUpperCase();
      return numberPart + unitPart;
    }
    if (word.includes('-')) {
      return word.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('-');
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });
  return formattedWords.join(' ');
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('id') || '';

    if (!productId) {
      return NextResponse.json({ error: 'Falta el id del producto' }, { status: 400 });
    }

    // 1. Buscar el producto en la base de datos PostgreSQL
    const product = await prisma.webProductoImagen.findFirst({
      where: {
        OR: [
          { codart: productId.trim() },
          { codbar: productId.trim() }
        ]
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjQ2IiBmb250LXdlaWdodD0iNjAwIiBmaWxsPSIjRkYyRTkzIiBvcGFjaXR5PSIwLjEyIiBsZXR0ZXItc3BhY2luZz0iMC4xOGVtIj5HTE9TUzwvdGV4dD48L3N2Zz4=';
    let imagesArray = [];
    try {
      imagesArray = JSON.parse(product.imagenes || '[]');
    } catch (errJson) {
      imagesArray = [];
    }
    const mainImage = imagesArray.length > 0 ? imagesArray[0] : PLACEHOLDER_IMAGE;

    const productDetail = {
      id: product.codart,
      name: formatProductName(product.nombre || ''),
      brand: product.marca || 'Importado',
      price: parseFloat(product.precio || 0),
      stock: parseFloat(product.stock || 0),
      category: product.categoria || 'Otros',
      image: mainImage,
      description: product.descripcionEnriquecida || ''
    };

    // 2. Obtener almacenes activos configurados en PostgreSQL
    const almacenes = await prisma.webAlmacenConfig.findMany({
      where: { visible: true },
      orderBy: { codalm: 'asc' }
    });

    // 3. Consultar stock detallado por almacén en el ERP
    let stocksByWarehouse = almacenes.map(wh => ({
      codalm: wh.codalm,
      nomalm: wh.nomalm,
      stock: 0
    }));

    try {
      const pool = await getErpConnection();
      if (pool && almacenes.length > 0) {
        const request = pool.request();
        request.input('codart', sql.VarChar(50), product.codart);

        let queryParts = [];
        almacenes.forEach(wh => {
          queryParts.push(`(SELECT ISNULL(SUM(stoc), 0) FROM prd01${wh.codalm} WITH(nolock) WHERE codi = @codart) as stock_${wh.codalm}`);
        });

        const queryStr = `SELECT ${queryParts.join(', ')}`;
        const erpResult = await request.query(queryStr);

        if (erpResult.recordset && erpResult.recordset.length > 0) {
          const erpData = erpResult.recordset[0];
          stocksByWarehouse = almacenes.map(wh => ({
            codalm: wh.codalm,
            nomalm: wh.nomalm,
            stock: parseFloat(erpData[`stock_${wh.codalm}`] || 0)
          }));
        }
      }
    } catch (erpErr) {
      console.warn('[API Scan Detail] Error de conexión al ERP local, usando stock consolidado:', erpErr.message);
      // Fallback: Cargar stock consolidado en la sede principal
      stocksByWarehouse = almacenes.map(wh => ({
        codalm: wh.codalm,
        nomalm: wh.nomalm,
        stock: wh.codalm === '01' ? parseFloat(product.stock || 0) : 0
      }));
    }

    // 4. Obtener productos similares
    let similarProductsRaw = [];
    if (product.categoria) {
      similarProductsRaw = await prisma.webProductoImagen.findMany({
        where: {
          categoria: product.categoria,
          visible: true,
          NOT: { codart: product.codart }
        },
        take: 5
      });
    }

    const similarProducts = similarProductsRaw.map(p => {
      let imgs = [];
      try {
        imgs = JSON.parse(p.imagenes || '[]');
      } catch (e) {
        imgs = [];
      }
      return {
        id: p.codart,
        name: formatProductName(p.nombre || ''),
        brand: p.marca || 'Importado',
        price: parseFloat(p.precio || 0),
        image: imgs.length > 0 ? imgs[0] : PLACEHOLDER_IMAGE,
        stock: parseFloat(p.stock || 0)
      };
    });

    return NextResponse.json({
      product: productDetail,
      stocks: stocksByWarehouse,
      similar: similarProducts
    });

  } catch (error) {
    console.error('[API Scan Detail] ERROR CRÍTICO:', error);
    return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 });
  }
}
