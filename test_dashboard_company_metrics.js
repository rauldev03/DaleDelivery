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

async function testDashboardCompanyMetrics() {
  console.log('--- Probando Dashboard con Selector de Fecha y Envíos por Empresa ---');

  // 1. Iniciar sesión
  const loginPost = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, 'username=admin&password=admin123');

  const cookie = loginPost.headers['set-cookie'][0].split(';')[0];
  console.log('✅ Sesión autenticada.');

  // 2. Probar Dashboard con fecha actual
  const todayStr = new Date().toISOString().split('T')[0];
  const dashRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/dashboard?fecha=${todayStr}`,
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (dashRes.statusCode !== 200) {
    throw new Error(`Error en Dashboard: status ${dashRes.statusCode}`);
  }

  // Verificar presencia del selector de fecha
  if (!dashRes.body.includes('Fecha de Registro:') || !dashRes.body.includes('name="fecha"')) {
    throw new Error('No se encontró el selector de fecha en el Dashboard.');
  }
  console.log('✅ Selector de fecha de registro presente y funcional.');

  // Verificar presencia de las columnas por empresa
  const expectedCols = [
    'Empresa / Cliente',
    'Total Envíos',
    'Registrados',
    'En Proceso',
    'Entregados',
    'Cancelados',
    'Efectividad'
  ];

  for (const col of expectedCols) {
    if (!dashRes.body.includes(col)) {
      throw new Error(`No se encontró la columna "${col}" en el desglose de empresas.`);
    }
  }
  console.log('✅ Todas las columnas requeridas (Registrados, Entregados, Cancelados, En Proceso) están presentes.');

  console.log('\n🎉 ¡PRUEBA DE DASHBOARD CON SELECTOR Y MÉTRICAS POR EMPRESA EXITOSA!');
}

testDashboardCompanyMetrics().catch(err => {
  console.error('❌ Error en prueba:', err);
  process.exit(1);
});
