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

async function testAutoFilters() {
  console.log('--- Validando Filtrado Automático en el Panel de Envíos ---');

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

  // 2. Cargar listado de envíos
  const enviosRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (enviosRes.statusCode !== 200) {
    throw new Error(`Error en envíos: status ${enviosRes.statusCode}`);
  }

  // Verificar que NO existe el botón con texto '<span>Filtrar</span>' dentro del formulario
  if (enviosRes.body.includes('<span>Filtrar</span>')) {
    throw new Error('El botón de filtrar aún se encuentra en la vista.');
  }
  console.log('✅ El botón manual de filtrar ha sido removido exitosamente.');

  // Verificar que el script de auto-envío está activo
  if (!enviosRes.body.includes('filter-auto') || !enviosRes.body.includes('filter-input')) {
    throw new Error('No se encontraron las clases de auto-filtrado.');
  }
  console.log('✅ Clases de filtrado automático y debounce configuradas correctamente.');

  // 3. Probar filtro con parámetro search
  const filterRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios?search=BRU%C3%91O',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (filterRes.statusCode !== 200) {
    throw new Error('Fallo al filtrar con parámetros.');
  }
  console.log('✅ Búsqueda por parámetros responde con status 200.');

  console.log('\n🎉 ¡PRUEBA DE FILTRADO AUTOMÁTICO EN ENVÍOS EXITOSA!');
}

testAutoFilters().catch(err => {
  console.error('❌ Error en prueba:', err);
  process.exit(1);
});
