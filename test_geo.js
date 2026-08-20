const geoService = require('./src/services/geoService');

async function testGeo() {
  console.log('--- Probando geoService ---');

  // Test encode & decode
  const lat = -12.1219;
  const lng = -77.0298;
  const code = geoService.encode(lat, lng, 10);
  console.log(`Encode (${lat}, ${lng}) =>`, code);

  const decoded = geoService.decode(code);
  console.log('Decoded => latCenter:', decoded.latitudeCenter, 'lngCenter:', decoded.longitudeCenter);
  if (Math.abs(decoded.latitudeCenter - lat) > 0.001 || Math.abs(decoded.longitudeCenter - lng) > 0.001) {
    throw new Error('Error en consistencia encode/decode');
  }

  // Test 1: Full Plus Code
  const res1 = await geoService.parseLocationInput(code);
  console.log('1. Plus Code Completo:', res1);
  if (!res1.success || Math.abs(res1.lat - lat) > 0.01) {
    throw new Error('Error en decodificación de Plus Code completo');
  }

  // Test 2: Short Plus Code con referencia a Lima
  const shortCode = code.split('+')[0].slice(4) + '+' + code.split('+')[1];
  const res2 = await geoService.parseLocationInput(shortCode);
  console.log(`2. Plus Code Corto (${shortCode}):`, res2);
  if (!res2.success || Math.abs(res2.lat - lat) > 0.01) {
    throw new Error('Error en decodificación de Plus Code corto');
  }

  // Test 3: Link de Google Maps con @lat,lng
  const res3 = await geoService.parseLocationInput('https://www.google.com/maps/@-12.0965,-77.0352,17z');
  console.log('3. Maps Link con @coords:', res3);
  if (!res3.success || res3.lat !== -12.0965) {
    throw new Error('Error en extracción de link con @coords');
  }

  // Test 4: Coordenadas directas
  const res4 = await geoService.parseLocationInput('-12.0463, -77.0427');
  console.log('4. Coordenadas directas:', res4);
  if (!res4.success || res4.lat !== -12.0463) {
    throw new Error('Error en parseo de coordenadas directas');
  }

  console.log('🎉 ¡Todas las pruebas de geoService pasaron con éxito!');
}

testGeo().catch(err => {
  console.error('❌ Error en testGeo:', err);
  process.exit(1);
});
