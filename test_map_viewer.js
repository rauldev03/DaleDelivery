const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runMapViewerTests() {
  console.log('--- Iniciando pruebas del Visor de Mapa y Localizador ---');

  // 1. Iniciar sesión
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, 'username=admin&password=admin123');

  if (!loginRes.headers['set-cookie']) {
    throw new Error('No se pudo iniciar sesión para las pruebas.');
  }

  const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
  console.log('   ✅ 1. Autenticación exitosa.');

  // 2. Probar acceso a la vista /mapa
  console.log('2. Consultando vista /mapa...');
  const mapRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/mapa',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (mapRes.statusCode !== 200) {
    throw new Error(`La ruta /mapa respondió con código ${mapRes.statusCode}`);
  }

  if (!mapRes.body.includes('Google Maps') || !mapRes.body.includes('google-map-container') || !mapRes.body.includes('map-viewer.js')) {
    throw new Error('El HTML de /mapa no contiene los elementos requeridos del mapa o scripts.');
  }
  console.log('   ✅ 2. Vista /mapa cargada correctamente con Google Maps y autocompletado.');

  // 3. Probar API de resolución con Plus Code
  console.log('3. Probando API /api/map/resolve con Plus Code (57V4VXHC+63)...');
  const plusRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/map/resolve',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  }, JSON.stringify({ input: '57V4VXHC+63' }));

  const plusData = JSON.parse(plusRes.body);
  if (!plusData.success || typeof plusData.lat !== 'number' || typeof plusData.lng !== 'number') {
    throw new Error('La API no resolvió el Plus Code correctamente.');
  }
  console.log(`   ✅ 3. Plus Code resuelto: (${plusData.lat.toFixed(4)}, ${plusData.lng.toFixed(4)})`);

  // 4. Probar API de resolución con Link de Google Maps
  console.log('4. Probando API /api/map/resolve con Link de Maps...');
  const mapsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/map/resolve',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  }, JSON.stringify({ input: 'https://www.google.com/maps/@-12.0965,-77.0352,17z' }));

  const mapsData = JSON.parse(mapsRes.body);
  if (!mapsData.success || mapsData.lat !== -12.0965 || mapsData.lng !== -77.0352) {
    throw new Error('La API no extrajo las coordenadas del Link de Maps correctamente.');
  }
  console.log(`   ✅ 4. Link de Google Maps resuelto: (${mapsData.lat}, ${mapsData.lng})`);

  // 5. Probar API de resolución con Coordenadas directas
  console.log('5. Probando API /api/map/resolve con coordenadas directas...');
  const coordsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/map/resolve',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    }
  }, JSON.stringify({ input: '-12.0463, -77.0427' }));

  const coordsData = JSON.parse(coordsRes.body);
  if (!coordsData.success || coordsData.lat !== -12.0463) {
    throw new Error('La API no procesó las coordenadas directas.');
  }
  console.log(`   ✅ 5. Coordenadas directas resueltas: (${coordsData.lat}, ${coordsData.lng})`);

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL VISOR DE MAPA Y LOCALIZADOR PASARON EXITOSAMENTE!');
}

runMapViewerTests().catch(err => {
  console.error('❌ Error en pruebas de mapa:', err);
  process.exit(1);
});
