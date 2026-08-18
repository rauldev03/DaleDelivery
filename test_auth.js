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

async function testAuthFlow() {
  console.log('--- Iniciando prueba de autenticación (ETAPA 1) ---');

  // 1. GET /login
  console.log('1. Probando GET /login...');
  const getLogin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'GET'
  });
  console.log(`   Status: ${getLogin.statusCode}`);
  if (getLogin.statusCode === 200 && getLogin.body.includes('Iniciar Sesión')) {
    console.log('   ✅ Vista de Login renderizada correctamente.');
  } else {
    throw new Error('Fallo al renderizar la vista de Login.');
  }

  // 2. POST /login con credenciales inválidas
  console.log('2. Probando POST /login con credenciales inválidas...');
  const postInvalid = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }, 'username=admin&password=wrongpassword');
  console.log(`   Status: ${postInvalid.statusCode}`);
  if (postInvalid.body.includes('Credenciales inválidas')) {
    console.log('   ✅ Rechazo correcto ante credenciales erróneas.');
  } else {
    throw new Error('No se validó el error de credenciales.');
  }

  // 3. POST /login con credenciales válidas (admin / admin123)
  console.log('3. Probando POST /login con credenciales válidas (admin / admin123)...');
  const postValid = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  }, 'username=admin&password=admin123');

  console.log(`   Status: ${postValid.statusCode}`);
  console.log(`   Location: ${postValid.headers.location}`);
  const setCookie = postValid.headers['set-cookie'];
  if (postValid.statusCode === 302 && postValid.headers.location === '/dashboard' && setCookie) {
    console.log('   ✅ Login exitoso y redirección a /dashboard con cookie de sesión.');
  } else {
    throw new Error('Fallo en el inicio de sesión válido.');
  }

  // 4. GET /dashboard con la cookie de sesión obtenida
  console.log('4. Probando GET /dashboard con sesión autenticada...');
  const cookie = setCookie[0].split(';')[0];
  const getDashboard = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/dashboard',
    method: 'GET',
    headers: {
      'Cookie': cookie
    }
  });

  console.log(`   Status: ${getDashboard.statusCode}`);
  if (getDashboard.statusCode === 200 && getDashboard.body.includes('Dashboard Operativo') && getDashboard.body.includes('Administrador Principal')) {
    console.log('   ✅ Acceso a Dashboard verificado con usuario autenticado.');
  } else {
    throw new Error('Fallo al acceder al dashboard con sesión.');
  }

  // 5. GET /dashboard sin cookie de sesión
  console.log('5. Probando GET /dashboard sin sesión (debe redirigir a /login)...');
  const getUnauth = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/dashboard',
    method: 'GET'
  });
  console.log(`   Status: ${getUnauth.statusCode}, Location: ${getUnauth.headers.location}`);
  if (getUnauth.statusCode === 302 && getUnauth.headers.location === '/login') {
    console.log('   ✅ Middleware de protección de ruta funcionó correctamente.');
  } else {
    throw new Error('Middleware de autenticación no protegió la ruta privada.');
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA ETAPA 1 PASARON SATISFACTORIAMENTE!');
}

testAuthFlow().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
