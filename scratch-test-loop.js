const path = require('path');

async function testLoop() {
  console.log('Iniciando prueba de 5 peticiones concurrentes a category-audit en produccion...');
  for (let i = 1; i <= 5; i++) {
    const start = Date.now();
    try {
      const res = await fetch('https://glosspe-production.up.railway.app/api/admin/intelligence?action=category-audit', {
        headers: { 'Authorization': 'Bearer gloss-admin-master-session-token' }
      });
      const duration = Date.now() - start;
      console.log(`Peticion ${i}: Status = ${res.status}, Tiempo = ${duration} ms, OK = ${res.ok}`);
      if (res.ok) {
        const data = await res.json();
        console.log(`   -> Devuelto array de longitud: ${data.length}`);
      } else {
        const text = await res.text();
        console.log(`   -> Error body (truncado): ${text.substring(0, 150)}`);
      }
    } catch (err) {
      console.error(`Peticion ${i} falló con error:`, err.message);
    }
  }
}

testLoop();
