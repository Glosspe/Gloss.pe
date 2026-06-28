const endpoints = [
  'http://localhost:3001/api/products/search',
  'http://localhost:3001/api/products/categories',
  'http://localhost:3001/api/products/categories-tree',
  'http://localhost:3001/api/products/brands'
];

async function testCloud() {
  for (const url of endpoints) {
    try {
      console.log(`=== PROBANDO: ${url} ===`);
      const res = await fetch(url);
      console.log(`STATUS: ${res.status}`);
      const text = await res.text();
      console.log(`RESPONSE: ${text.substring(0, 300)}\n`);
    } catch (err) {
      console.error(`ERROR EN ${url}:`, err.message);
    }
  }
}

testCloud();
