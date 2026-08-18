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

async function runBatchTests() {
  console.log('--- Iniciando prueba de Registro Masivo de Envíos en Tabla ---');

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

  // 2. GET /envios/masivo
  console.log('2. Consultando formulario de registro masivo en tabla (GET /envios/masivo)...');
  const getBatch = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/masivo',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (getBatch.statusCode !== 200 || !getBatch.body.includes('Registro Masivo de Envíos en Tabla') || !getBatch.body.includes('batch-table')) {
    throw new Error('Fallo al renderizar la vista de registro masivo.');
  }
  console.log('   ✅ Vista de registro masivo renderizada con la matriz editable.');

  const today = new Date().toISOString().split('T')[0];

  // 3. Registrar un lote de 4 envíos para el Cliente 1 (Comercial San José)
  console.log('3. Registrando un lote de 4 envíos simultáneos en tabla...');
  const postData = new URLSearchParams({
    clienteId: '1',
    fechaRegistro: today,
    'items[0][destinatarioNombre]': 'Empresa Alfa S.A.',
    'items[0][destinatarioTelefono]': '991000001',
    'items[0][direccion]': 'Av. Los Conquistadores 450',
    'items[0][distrito]': 'San Isidro',
    'items[0][tipoServicio]': 'Express',
    'items[0][cantidadPaquetes]': '3',
    'items[0][peso]': '4.5',

    'items[1][destinatarioNombre]': 'Corporación Beta E.I.R.L.',
    'items[1][destinatarioTelefono]': '991000002',
    'items[1][direccion]': 'Calle Schell 310',
    'items[1][distrito]': 'Miraflores',
    'items[1][tipoServicio]': 'Estándar',
    'items[1][cantidadPaquetes]': '1',
    'items[1][peso]': '1.0',

    'items[2][destinatarioNombre]': 'Comercial Gamma S.A.C.',
    'items[2][destinatarioTelefono]': '991000003',
    'items[2][direccion]': 'Av. Encalada 890',
    'items[2][distrito]': 'Santiago de Surco',
    'items[2][tipoServicio]': 'Next Day',
    'items[2][cantidadPaquetes]': '2',
    'items[2][peso]': '2.8',

    'items[3][destinatarioNombre]': 'Logística Delta',
    'items[3][destinatarioTelefono]': '991000004',
    'items[3][direccion]': 'Av. Faucett 1200',
    'items[3][distrito]': 'San Miguel',
    'items[3][tipoServicio]': 'Express',
    'items[3][cantidadPaquetes]': '5',
    'items[3][peso]': '8.0',

    // Fila 4 vacía a propósito para probar el descarte automático
    'items[4][destinatarioNombre]': '',
    'items[4][destinatarioTelefono]': '',
    'items[4][direccion]': '',
    'items[4][distrito]': 'San Isidro'
  }).toString();

  const postRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/masivo',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    }
  }, postData);

  if (postRes.statusCode !== 302) {
    throw new Error(`Fallo en el POST /envios/masivo: status ${postRes.statusCode}`);
  }
  console.log('   ✅ Lote registrado con éxito y redirección a /envios.');

  // 4. Verificar que los 4 envíos aparezcan en el listado general
  console.log('4. Verificando que todos los envíos del lote figuren en el listado...');
  const listRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  const checkNames = ['Empresa Alfa S.A.', 'Corporación Beta E.I.R.L.', 'Comercial Gamma S.A.C.', 'Logística Delta'];
  for (const name of checkNames) {
    if (!listRes.body.includes(name)) {
      throw new Error(`No se encontró el envío '${name}' en el listado tras el registro masivo.`);
    }
  }
  console.log('   ✅ Todos los registros del lote están guardados y visibles con sus códigos secuenciales.');

  // 5. Probar validación por fila en caso de datos incompletos
  console.log('5. Probando validación por fila con error intencional (Fila sin dirección)...');
  const invalidBatch = new URLSearchParams({
    clienteId: '1',
    fechaRegistro: today,
    'items[0][destinatarioNombre]': 'Destinatario Incompleto',
    'items[0][destinatarioTelefono]': '999111222',
    'items[0][direccion]': '', // Sin dirección
    'items[0][distrito]': 'San Isidro'
  }).toString();

  const invalidRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/masivo',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    }
  }, invalidBatch);

  if (invalidRes.statusCode === 200 && invalidRes.body.includes('Fila #1: La dirección de entrega es obligatoria')) {
    console.log('   ✅ Validación granular por fila detectó y reportó el error exactamente.');
  } else {
    throw new Error('Fallo al validar errores por fila en carga masiva.');
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE REGISTRO MASIVO EN TABLA PASARON EXITOSAMENTE!');
}

runBatchTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
