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

async function runMapsAndPlusCodeTests() {
  console.log('--- Iniciando prueba de Link Google Maps y Plus Code ---');

  // 1. Iniciar sesión
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, 'username=admin&password=admin123');

  const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
  console.log('   ✅ Sesión obtenida.');

  // 2. Verificar que /envios/masivo contiene los campos
  console.log('2. Consultando matriz masiva (GET /envios/masivo)...');
  const getBatch = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/masivo',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (!getBatch.body.includes('linkGoogleMaps') || !getBatch.body.includes('plusCode')) {
    throw new Error('La matriz no contiene los campos linkGoogleMaps o plusCode.');
  }
  console.log('   ✅ Matriz contiene las columnas de Link Maps y Plus Code.');

  // 3. Crear un envío masivo con link de maps y plus code
  console.log('3. Creando envío masivo con geolocalización...');
  const postBatch = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/masivo',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    }
  }, new URLSearchParams({
    clienteId: '1',
    fechaRegistro: '2026-08-18',
    'items[0][destinatarioNombre]': 'Carlos Mendoza',
    'items[0][destinatarioDocumento]': '71234567',
    'items[0][destinatarioTelefono]': '987654321',
    'items[0][direccion]': 'Av. Larco 743, Dpto 501',
    'items[0][referencia]': 'Frente al parque',
    'items[0][distrito]': 'Miraflores',
    'items[0][linkGoogleMaps]': 'https://maps.app.goo.gl/AbCdEf123456',
    'items[0][plusCode]': '87G83W3M+2X',
    'items[0][tipoServicio]': 'Express',
    'items[0][cantidadPaquetes]': '2',
    'items[0][peso]': '1.5',
    'items[0][descripcion]': 'Documentos y catálogo'
  }).toString());

  if (postBatch.statusCode !== 302) {
    throw new Error('Fallo al registrar envío con Google Maps y Plus Code.');
  }
  console.log('   ✅ Envío masivo con Google Maps y Plus Code guardado con éxito.');

  // 4. Consultar detalle del envío creado
  console.log('4. Verificando detalle del envío (GET /envios/1)...');
  const getShow = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/1',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (!getShow.body.includes('https://maps.app.goo.gl/AbCdEf123456') || !getShow.body.includes('87G83W3M+2X')) {
    throw new Error('El detalle del envío no muestra el Link Maps o el Plus Code.');
  }
  console.log('   ✅ Detalle del envío muestra enlace interactivo de Maps y badge de Plus Code.');

  // 5. Consultar reporte diario
  console.log('5. Verificando reporte diario (GET /reportes/diario)...');
  const getDaily = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/reportes/diario?fecha=2026-08-18',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (!getDaily.body.includes('87G83W3M+2X')) {
    throw new Error('El reporte diario no muestra las columnas de geolocalización.');
  }
  console.log('   ✅ Reporte diario incluye columnas de Link Maps y Plus Code.');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LINK DE MAPS Y CÓDIGO PLUS PASARON EXITOSAMENTE!');
}

runMapsAndPlusCodeTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
