import { NextResponse } from 'next/server';

// APIs de prueba o producción en Perú para consultar RENIEC/SUNAT
// Proveedores comunes: apisperu.com, migo.pe, etc.
// Dejamos configurado el flujo para que use un token en variables de entorno si existe
const TOKEN_API_PERU = process.env.API_PERU_TOKEN;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('type'); // 'DNI' o 'RUC'
    const documentNumber = searchParams.get('number');

    if (!documentType || !documentNumber) {
      return NextResponse.json({ error: 'Faltan parámetros de consulta' }, { status: 400 });
    }

    const cleanNum = documentNumber.trim();
    console.log(`[API Documento] Validando ${documentType}: ${cleanNum}`);

    // ---- CASO 1: Consulta Real (Si hay un Token configurado en el .env) ----
    if (TOKEN_API_PERU) {
      try {
        let url = '';
        if (documentType === 'DNI') {
          url = `https://api.apisperu.com/v1/dni/${cleanNum}?token=${TOKEN_API_PERU}`;
        } else if (documentType === 'RUC') {
          url = `https://api.apisperu.com/v1/ruc/${cleanNum}?token=${TOKEN_API_PERU}`;
        }

        if (url) {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            
            if (documentType === 'DNI') {
              return NextResponse.json({
                success: true,
                type: 'DNI',
                number: cleanNum,
                name: `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`.trim()
              });
            } else {
              return NextResponse.json({
                success: true,
                type: 'RUC',
                number: cleanNum,
                name: data.razonSocial,
                address: data.direccion || ''
              });
            }
          }
        }
      } catch (fetchErr) {
        console.error('[API Documento] Falló consulta real a API Perú, usando simulador:', fetchErr.message);
      }
    }

    // ---- CASO 2: Simulador Inteligente (Para Desarrollo y Pruebas Locales) ----
    // Devolvemos respuestas simuladas consistentes según el número ingresado
    await new Promise(resolve => setTimeout(resolve, 800)); // Simular retraso de red

    if (documentType === 'DNI') {
      if (cleanNum.length !== 8 || isNaN(cleanNum)) {
        return NextResponse.json({ error: 'El DNI debe tener 8 dígitos numéricos' }, { status: 400 });
      }

      // Simulaciones predeterminadas para testing
      let simulatedName = 'Antonella Rossi Delgado';
      if (cleanNum === '11111111') simulatedName = 'Gibson Rafael Silva';
      else if (cleanNum === '22222222') simulatedName = 'Maria Fe Mendoza';
      else if (cleanNum.startsWith('4')) simulatedName = 'Alejandra Villanueva Torres';
      else if (cleanNum.startsWith('7')) simulatedName = 'Jean Pierre Castillo Vega';

      return NextResponse.json({
        success: true,
        type: 'DNI',
        number: cleanNum,
        name: simulatedName
      });

    } else if (documentType === 'RUC') {
      if (cleanNum.length !== 11 || isNaN(cleanNum) || !cleanNum.startsWith('10') && !cleanNum.startsWith('20')) {
        return NextResponse.json({ error: 'El RUC debe tener 11 dígitos y empezar con 10 o 20' }, { status: 400 });
      }

      let simulatedName = 'IMPORTACIONES G&A SAC';
      let simulatedAddress = 'AV. LA MARINA 1450, SAN MIGUEL, LIMA';

      if (cleanNum === '20601234567') {
        simulatedName = 'GLOSS BEAUTY PERU S.A.C.';
        simulatedAddress = 'AV. BENAVIDES 2540, MIRAFLORES, LIMA';
      } else if (cleanNum.startsWith('10')) {
        simulatedName = 'VALERIA GOMEZ SOTO (E.I.R.L)';
        simulatedAddress = 'JR. DOS DE MAYO 432, CHORRILLOS, LIMA';
      }

      return NextResponse.json({
        success: true,
        type: 'RUC',
        number: cleanNum,
        name: simulatedName,
        address: simulatedAddress
      });
    }

    return NextResponse.json({ error: 'Tipo de documento no soportado' }, { status: 400 });

  } catch (error) {
    console.error('[API Documento GET] ERROR:', error);
    return NextResponse.json({ error: 'Error interno de validación' }, { status: 500 });
  }
}
