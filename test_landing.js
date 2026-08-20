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

async function testLandingPage() {
  console.log('--- Iniciando prueba de la Landing Page Pública (Dale Delivery) ---');

  // 1. GET / (Pública)
  console.log('1. Probando GET / (Landing pública sin sesión)...');
  const getLanding = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET'
  });

  console.log(`   Status: ${getLanding.statusCode}`);
  if (
    getLanding.statusCode === 200 &&
    getLanding.body.includes('Dale Delivery') &&
    getLanding.body.includes('TU ENVÍO') &&
    getLanding.body.includes('NUESTRA RUTA') &&
    getLanding.body.includes('Red Logística Perú') &&
    getLanding.body.includes('peru-map-svg') &&
    getLanding.body.includes('LIMA (HUB)') &&
    getLanding.body.includes('href="/login"')
  ) {
    console.log('   ✅ Landing Page renderizada correctamente con mapa tecnológico, servicios y enlace a login.');
  } else {
    throw new Error('Fallo al renderizar la Landing Page pública en GET /');
  }

  // 2. GET /login sigue funcionando intacto
  console.log('2. Probando GET /login (Ruta de login existente)...');
  const getLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'GET'
  });

  console.log(`   Status: ${getLogin.statusCode}`);
  if (getLogin.statusCode === 200 && getLogin.body.includes('Iniciar Sesión')) {
    console.log('   ✅ Formulario de Login existente operativo y accesible en /login.');
  } else {
    throw new Error('La ruta /login fue afectada o no responde correctamente.');
  }

  // 3. POST /login con credenciales y verificación de sesión en Landing
  console.log('3. Probando autenticación y comportamiento de Landing con sesión...');
  const postLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }, 'username=admin&password=admin123');

  const setCookie = postLogin.headers['set-cookie'];
  if (postLogin.statusCode === 302 && setCookie) {
    const cookie = setCookie[0].split(';')[0];
    const getLandingAuth = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      headers: {
        'Cookie': cookie
      }
    });

    if (getLandingAuth.statusCode === 200 && getLandingAuth.body.includes('Ir al Dashboard')) {
      console.log('   ✅ Usuario autenticado en Landing visualiza correctamente el botón directo a /dashboard.');
    } else {
      throw new Error('No se reflejó el estado de usuario autenticado en la Landing.');
    }
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA LANDING PAGE PASARON SATISFACTORIAMENTE!');
}

testLandingPage().catch(err => {
  console.error('❌ Error en prueba de Landing:', err);
  process.exit(1);
});
