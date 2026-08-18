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

async function runClientDropdownTests() {
  console.log('--- Iniciando prueba de Listas Desplegables en Módulo de Clientes ---');

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

  // 2. GET /clientes/nuevo
  console.log('2. Consultando formulario de nuevo cliente (GET /clientes/nuevo)...');
  const getCreate = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/clientes/nuevo',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (!getCreate.body.includes('<select name="departamento"') ||
      !getCreate.body.includes('<select name="provincia"') ||
      !getCreate.body.includes('<select name="distrito"')) {
    throw new Error('El formulario de nuevo cliente no tiene los selects de departamento, provincia o distrito.');
  }
  console.log('   ✅ Formulario de nuevo cliente contiene los selects desplegables correctamente.');

  // 3. Crear cliente con datos seleccionados de los desplegables
  console.log('3. Creando cliente con Departamento=Lima, Provincia=Lima, Distrito=Miraflores...');
  const postClient = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/clientes/nuevo',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    }
  }, new URLSearchParams({
    tipoDocumento: 'RUC',
    numeroDocumento: '20601234567',
    razonSocialNombre: 'Corporación Logística del Perú S.A.C.',
    contacto: 'Ing. Fernando Ramos',
    telefono: '998877665',
    correo: 'contacto@corp-logistica.pe',
    direccion: 'Av. Ricardo Palma 650, Of. 302',
    distrito: 'Miraflores',
    provincia: 'Lima',
    departamento: 'Lima',
    estado: 'Activo'
  }).toString());

  if (postClient.statusCode !== 302) {
    throw new Error('Fallo al crear cliente con desplegables.');
  }
  console.log('   ✅ Cliente creado exitosamente.');

  // 4. GET /clientes/1/editar
  console.log('4. Consultando formulario de edición (GET /clientes/1/editar)...');
  const getEdit = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/clientes/1/editar',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (!getEdit.body.includes('<select name="distrito"') || !getEdit.body.includes('value="Miraflores" selected')) {
    throw new Error('El formulario de edición no preseleccionó correctamente el distrito.');
  }
  console.log('   ✅ Formulario de edición preseleccionó el distrito Miraflores en el desplegable.');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LISTAS DESPLEGABLES EN CLIENTES PASARON EXITOSAMENTE!');
}

runClientDropdownTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
