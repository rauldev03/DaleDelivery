const http = require('http');
const { LIMA_CALLAO_DISTRICTS, normalizeDistrict, isStandardDistrict } = require('./src/config/districts');

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

async function runTests() {
  console.log('--- Iniciando prueba de Pegado desde Excel y Advertencia de Distritos ---');

  // 1. Probar catálogo y normalizador de distritos
  console.log('1. Probando catálogo y normalizador de distritos de Lima y Callao...');
  if (!Array.isArray(LIMA_CALLAO_DISTRICTS) || LIMA_CALLAO_DISTRICTS.length < 40) {
    throw new Error('Catálogo de distritos incompleto.');
  }

  const testsSynonyms = [
    { input: 'sjl', expected: 'San Juan de Lurigancho' },
    { input: 'surco', expected: 'Santiago de Surco' },
    { input: 'smp', expected: 'San Martín de Porres' },
    { input: 'miraflores', expected: 'Miraflores' },
    { input: 'SAN ISIDRO', expected: 'San Isidro' },
    { input: 'lince', expected: 'Lince' }
  ];

  for (const t of testsSynonyms) {
    const norm = normalizeDistrict(t.input);
    if (norm !== t.expected) {
      throw new Error(`Fallo al normalizar '${t.input}': esperado '${t.expected}', obtenido '${norm}'`);
    }
  }

  if (isStandardDistrict('DistritoDesconocidoXYZ') !== false) {
    throw new Error('isStandardDistrict debe retornar false para distritos desconocidos.');
  }
  console.log(`   ✅ Catálogo de ${LIMA_CALLAO_DISTRICTS.length} distritos y normalizador validados correctamente.`);

  // 2. Iniciar sesión
  console.log('2. Autenticando como administrador...');
  const loginRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  }, 'username=admin&password=admin123');

  const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
  console.log('   ✅ Sesión obtenida.');

  // 3. Consultar /envios/masivo y validar elementos UI
  console.log('3. Consultando GET /envios/masivo y validando componentes de Excel y advertencias...');
  const getRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/masivo',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (!getRes.body.includes('distritos-lima') || 
      !getRes.body.includes('paste-modal') || 
      !getRes.body.includes('district-warning-banner')) {
    throw new Error('Faltan componentes en la vista de batch_create.');
  }
  console.log('   ✅ Datalist de distritos, modal de Excel y banner de advertencias presentes en la vista.');

  // 4. Enviar un lote con datos simulados de Excel (incluyendo distritos válidos y uno no estandarizado)
  console.log('4. Enviando lote simulado de pegado Excel con distritos diversos...');
  const today = new Date().toISOString().split('T')[0];

  const postData = new URLSearchParams({
    clienteId: '1',
    fechaRegistro: today,
    'items[0][destinatarioNombre]': 'Carlos Ruiz Excel',
    'items[0][destinatarioTelefono]': '987111222',
    'items[0][direccion]': 'Av. Larco 456',
    'items[0][distrito]': 'Miraflores',
    'items[0][tipoServicio]': 'Express',
    'items[0][cantidadPaquetes]': '2',

    'items[1][destinatarioNombre]': 'Ana Morales Excel',
    'items[1][destinatarioTelefono]': '987333444',
    'items[1][direccion]': 'Calle Los Pinos 123',
    'items[1][distrito]': 'Santiago de Surco',
    'items[1][tipoServicio]': 'Estándar',
    'items[1][cantidadPaquetes]': '1',

    // Fila con distrito no estandarizado (debe permitir guardarse manteniendo trazabilidad)
    'items[2][destinatarioNombre]': 'Pedro Alvares Especial',
    'items[2][destinatarioTelefono]': '987555666',
    'items[2][direccion]': 'Carretera Central km 22',
    'items[2][distrito]': 'Zona Rural Este',
    'items[2][tipoServicio]': 'Estándar',
    'items[2][cantidadPaquetes]': '1'
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
    throw new Error(`Fallo en el guardado de lote con distritos: status ${postRes.statusCode}`);
  }
  console.log('   ✅ Lote con distritos mixtos guardado exitosamente.');

  // 5. Verificar que figuren en la base de datos
  console.log('5. Verificando que los envíos figuren en el listado general...');
  const listRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios?search=Excel',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (listRes.body.includes('Carlos Ruiz Excel') && listRes.body.includes('Ana Morales Excel')) {
    console.log('   ✅ Envíos guardados y buscables correctamente.');
  } else {
    throw new Error('No se encontraron los envíos en la búsqueda.');
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE PEGADO EXCEL Y ADVERTENCIA DE DISTRITOS PASARON EXITOSAMENTE!');
}

runTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
