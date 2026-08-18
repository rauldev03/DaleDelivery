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

async function runShipmentTests() {
  console.log('--- Iniciando prueba del Módulo de Envíos (ETAPA 3) ---');

  // 1. Autenticación
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

  const today = new Date().toISOString().split('T')[0];

  // 2. Intentar crear envío sin cliente (debe fallar la validación)
  console.log('2. Probando validación: Envío sin cliente obligatorio...');
  const invalidRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/nuevo',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    }
  }, new URLSearchParams({
    clienteId: '',
    fechaRegistro: today,
    tipoServicio: 'Estándar',
    destinatarioNombre: 'Juan Pérez',
    destinatarioTelefono: '999888777',
    direccion: 'Av. Brasil 500',
    distrito: 'Jesús María',
    provincia: 'Lima',
    departamento: 'Lima',
    cantidadPaquetes: '1'
  }).toString());

  if (invalidRes.statusCode === 200 && invalidRes.body.includes('Debe seleccionar un cliente obligatorio')) {
    console.log('   ✅ Bloqueo correcto de envío sin cliente.');
  } else {
    throw new Error('No se validó el cliente obligatorio.');
  }

  // 3. Crear Envío 1 para Cliente 1 (Comercial San José)
  console.log('3. Creando Envío 1 (Estándar, Registrado)...');
  const postEnvio1 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/nuevo',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    }
  }, new URLSearchParams({
    clienteId: '1',
    fechaRegistro: today,
    tipoServicio: 'Estándar',
    destinatarioNombre: 'Manuel Alvarado',
    destinatarioDocumento: '44556677',
    destinatarioTelefono: '987112233',
    destinatarioCorreo: 'manuel@correo.com',
    direccion: 'Calle Los Cedros 340',
    referencia: 'Frente al parque Los Cedros',
    distrito: 'San Isidro',
    provincia: 'Lima',
    departamento: 'Lima',
    cantidadPaquetes: '2',
    peso: '3.5',
    descripcion: 'Documentos contables y muestras',
    observaciones: 'Entregar en recepción',
    estado: 'Registrado'
  }).toString());

  if (postEnvio1.statusCode === 302) {
    console.log('   ✅ Envío 1 registrado con éxito.');
  } else {
    throw new Error('Fallo al crear Envío 1.');
  }

  // 4. Crear Envío 2 para Cliente 2 (Distribuidora Lima Norte)
  console.log('4. Creando Envío 2 (Express, En proceso)...');
  const postEnvio2 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/nuevo',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    }
  }, new URLSearchParams({
    clienteId: '2',
    fechaRegistro: today,
    tipoServicio: 'Express',
    destinatarioNombre: 'Rosa Melgar',
    destinatarioTelefono: '944332211',
    direccion: 'Av. Benavides 2150',
    referencia: 'Edificio Platinum 5to piso',
    distrito: 'Miraflores',
    provincia: 'Lima',
    departamento: 'Lima',
    cantidadPaquetes: '1',
    peso: '1.2',
    descripcion: 'Caja con accesorios tecnológicos',
    observaciones: 'Urgente antes de las 2pm',
    estado: 'En proceso'
  }).toString());

  if (postEnvio2.statusCode === 302) {
    console.log('   ✅ Envío 2 registrado con éxito.');
  } else {
    throw new Error('Fallo al crear Envío 2.');
  }

  // 5. Consultar listado de envíos
  console.log('5. Consultando listado de envíos (GET /envios)...');
  const listRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  const todayFormatted = today.replace(/-/g, '');
  if (listRes.body.includes(`ENV-${todayFormatted}-`) && listRes.body.includes('Rosa Melgar')) {
    console.log(`   ✅ Códigos correlativos generados correctamente con prefijo ENV-${todayFormatted}- y registros visibles.`);
  } else {
    throw new Error('No se encontraron los envíos generados en el listado.');
  }

  // 6. Probar filtrado por estado 'En proceso'
  console.log('6. Probando filtro por estado = En proceso...');
  const filterRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios?estado=En+proceso',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (filterRes.body.includes('Rosa Melgar') && !filterRes.body.includes('Manuel Alvarado')) {
    console.log('   ✅ Filtro por estado validado correctamente.');
  } else {
    throw new Error('Fallo en el filtro por estado de envíos.');
  }

  // 7. Cambiar estado de Envío 1 a 'Entregado'
  console.log('7. Actualizando estado de Envío 1 a Entregado...');
  const statusRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/1/estado',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    }
  }, 'estado=Entregado');

  if (statusRes.statusCode === 302) {
    console.log('   ✅ Estado actualizado a Entregado.');
  } else {
    throw new Error('Fallo al actualizar estado de envío.');
  }

  // 8. Consultar detalle de Envío 1
  console.log('8. Consultando detalle del Envío 1 (GET /envios/1)...');
  const showRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/1',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (showRes.body.includes('Entregado') && showRes.body.includes('Manuel Alvarado') && showRes.body.includes('Comercial San José')) {
    console.log('   ✅ Vista de detalle muestra el cliente emisor, destinatario y nuevo estado Entregado.');
  } else {
    throw new Error('Fallo en la visualización detallada del envío.');
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA ETAPA 3 (ENVÍOS) PASARON SATISFACTORIAMENTE!');
}

runShipmentTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
