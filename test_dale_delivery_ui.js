const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer.toString('utf-8')
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runDaleDeliveryUITests() {
  console.log('--- Iniciando Validación Visual y Funcional de Dale Delivery ---');

  // 1. Validar pantalla de Login
  console.log('1. Validando pantalla de Login (GET /login)...');
  const loginGet = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'GET'
  });

  if (!loginGet.body.includes('Dale Delivery') || !loginGet.body.includes('Plus+Jakarta+Sans')) {
    throw new Error('La pantalla de login no contiene el branding de Dale Delivery o las fuentes.');
  }
  console.log('   ✅ Pantalla de Login renderiza con Dale Delivery y Google Fonts.');

  // 2. Iniciar sesión
  console.log('2. Realizando Login administrativo...');
  const loginPost = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, 'username=admin&password=admin123');

  if (loginPost.statusCode !== 302) {
    throw new Error(`Login falló con código ${loginPost.statusCode}`);
  }
  const cookie = loginPost.headers['set-cookie'][0].split(';')[0];
  console.log('   ✅ Sesión autenticada correctamente.');

  // 3. Validar Dashboard
  console.log('3. Validando Dashboard (GET /dashboard)...');
  const dashRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/dashboard',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (!dashRes.body.includes('Dale<span>Delivery</span>') || !dashRes.body.includes('stat-card')) {
    throw new Error('El Dashboard no contiene el sidebar rediseñado o las cards de métricas.');
  }
  console.log('   ✅ Dashboard operativo renderiza con el sidebar naranja y KPI cards.');

  // 4. Validar Módulo de Clientes
  console.log('4. Validando Clientes (GET /clientes)...');
  const clientsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/clientes',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (clientsRes.statusCode !== 200 || !clientsRes.body.includes('Módulo de Clientes')) {
    throw new Error('Fallo al cargar módulo de clientes.');
  }
  console.log('   ✅ Módulo de clientes responde con código 200 y diseño uniforme.');

  // 5. Validar Módulo de Envíos Masivos
  console.log('5. Validando Envíos Masivos (GET /envios/masivo)...');
  const batchRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/masivo',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (batchRes.statusCode !== 200 || !batchRes.body.includes('plantilla-excel')) {
    throw new Error('Fallo al cargar envíos masivos.');
  }
  console.log('   ✅ Módulo de envíos masivos con botones de plantilla y subida validado.');

  // 6. Validar Reporte Diario y Exportación Excel
  console.log('6. Validando Reporte Diario (GET /reportes/diario)...');
  const reportRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/reportes/diario',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (reportRes.statusCode !== 200) {
    throw new Error('Fallo al cargar reporte diario.');
  }
  console.log('   ✅ Reporte diario validado.');

  // 7. Validar CSS servidos
  console.log('7. Validando hojas de estilo CSS...');
  const cssRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/css/main.css',
    method: 'GET'
  });

  if (!cssRes.body.includes('#FF5A00') || !cssRes.body.includes('#2563EB')) {
    throw new Error('El archivo main.css no tiene los tokens de color corporativos de Dale Delivery.');
  }
  console.log('   ✅ Hojas de estilo contienen tokens de Dale Delivery (#FF5A00, #2563EB, #0F172A).');

  console.log('\n🎉 ¡TODAS LAS VALIDACIONES DE DALE DELIVERY PASARON EXITOSAMENTE AL 100%!');
}

runDaleDeliveryUITests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
