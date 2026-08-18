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

async function runClientTests() {
  console.log('--- Iniciando prueba del Módulo de Clientes (ETAPA 2) ---');

  // 1. Iniciar sesión
  console.log('1. Autenticando como admin...');
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
  console.log('2. Consultando formulario de nuevo cliente...');
  const getCreate = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/clientes/nuevo',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });
  if (getCreate.body.includes('CLI-')) {
    console.log('   ✅ Código correlativo generado correctamente (Formato CLI-XXXXXX).');
  } else {
    throw new Error('No se generó el código de cliente esperado.');
  }

  // Generar DNI y RUC únicos para pruebas idempotentes
  const randomSuffix = String(Math.floor(1000 + Math.random() * 9000));
  const testDni = `8888${randomSuffix}`;
  const testRuc = `2099999${randomSuffix}`;

  // 3. Crear Cliente 1
  console.log(`3. Creando Cliente 1 (DNI: ${testDni})...`);
  const postClient1 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/clientes/nuevo',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    }
  }, new URLSearchParams({
    tipoDocumento: 'DNI',
    numeroDocumento: testDni,
    razonSocialNombre: 'Comercial San José S.A.C.',
    contacto: 'José Santos',
    telefono: '987654321',
    correo: 'contacto@sanjose.com',
    direccion: 'Av. Las Palmeras 123',
    distrito: 'Los Olivos',
    provincia: 'Lima',
    departamento: 'Lima',
    estado: 'Activo'
  }).toString());

  if (postClient1.statusCode === 302) {
    console.log('   ✅ Cliente 1 creado con éxito.');
  } else {
    throw new Error('Fallo al crear Cliente 1.');
  }

  // 4. Crear Cliente 2
  console.log(`4. Creando Cliente 2 (RUC: ${testRuc})...`);
  const postClient2 = await request({
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
    numeroDocumento: testRuc,
    razonSocialNombre: 'Distribuidora Lima Norte E.I.R.L.',
    contacto: 'Carla Morales',
    telefono: '912345678',
    correo: 'ventas@limanorte.com',
    direccion: 'Jr. Huancavelica 560',
    distrito: 'San Martín de Porres',
    provincia: 'Lima',
    departamento: 'Lima',
    estado: 'Activo'
  }).toString());

  if (postClient2.statusCode === 302) {
    console.log('   ✅ Cliente 2 creado con éxito.');
  } else {
    throw new Error('Fallo al crear Cliente 2.');
  }

  // 5. Intentar crear cliente duplicado con el mismo DNI
  console.log(`5. Probando validación de DNI duplicado (DNI: ${testDni})...`);
  const postDuplicate = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/clientes/nuevo',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    }
  }, new URLSearchParams({
    tipoDocumento: 'DNI',
    numeroDocumento: testDni,
    razonSocialNombre: 'Otro Cliente Duplicado',
    telefono: '999888777',
    direccion: 'Calle Falsa 123',
    distrito: 'Lima',
    provincia: 'Lima',
    departamento: 'Lima'
  }).toString());

  if (postDuplicate.statusCode === 200 && postDuplicate.body.includes(`Ya existe un cliente registrado con el número de documento ${testDni}`)) {
    console.log('   ✅ Validación de documento duplicado funcionó correctamente.');
  } else {
    throw new Error('No se bloqueó el registro de DNI duplicado.');
  }

  // 6. Búsqueda y listado
  console.log('6. Probando buscador de clientes por término "San José"...');
  const searchRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/clientes?search=San+Jos%C3%A9',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (searchRes.body.includes('Comercial San José')) {
    console.log('   ✅ Filtro de búsqueda preciso.');
  } else {
    throw new Error('Error en el filtro de búsqueda de clientes.');
  }

  // 7. Cambiar estado a Inactivo
  console.log('7. Cambiando estado de Cliente a Inactivo...');
  const toggleRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/clientes/1/estado',
    method: 'POST',
    headers: { 'Cookie': cookie }
  });
  if (toggleRes.statusCode === 302) {
    console.log('   ✅ Estado alternado exitosamente.');
  } else {
    throw new Error('Fallo al alternar estado de cliente.');
  }

  // 8. Reactivar cliente
  console.log('8. Reactivando Cliente...');
  await request({
    hostname: 'localhost',
    port: 3000,
    path: '/clientes/1/estado',
    method: 'POST',
    headers: { 'Cookie': cookie }
  });
  console.log('   ✅ Cliente reactivado.');

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA ETAPA 2 (CLIENTES) PASARON SATISFACTORIAMENTE!');
}

runClientTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
