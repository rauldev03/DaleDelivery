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

async function runDashboardTests() {
  console.log('--- Iniciando prueba del Dashboard (ETAPA 4) ---');

  // 1. Autenticación
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, 'username=admin&password=admin123');

  const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
  console.log('   ✅ Sesión obtenida.');

  // 2. GET /dashboard
  console.log('2. Consultando vista de Dashboard...');
  const dashRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/dashboard',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (dashRes.statusCode !== 200) {
    throw new Error(`Error en el dashboard: status ${dashRes.statusCode}`);
  }

  // Verificar que contenga los KPIs del día
  const checks = [
    'Dashboard Operativo',
    'Envíos de Hoy',
    'Clientes Activos',
    'Registrados',
    'En Proceso',
    'Entregados',
    'Cancelados',
    'Últimos Envíos Registrados',
    'ENV-'
  ];

  for (const check of checks) {
    if (!dashRes.body.includes(check)) {
      throw new Error(`El dashboard no contiene la sección/métrica requerida: "${check}"`);
    }
  }

  console.log('   ✅ Todas las tarjetas de KPIs y la tabla de últimos envíos se renderizaron con éxito.');
  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA ETAPA 4 (DASHBOARD) PASARON SATISFACTORIAMENTE!');
}

runDashboardTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
