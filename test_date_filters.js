const http = require('http');
const ExcelJS = require('exceljs');

function request(options, data = null, isBinary = false) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: isBinary ? buffer : buffer.toString('utf8'),
          buffer
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testDateFilters() {
  console.log('--- Iniciando prueba de filtros por Fecha de Registro y/o Fecha de Entrega ---');

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

  const today = '2026-08-18';
  const deliveryDate1 = '2026-08-19';
  const deliveryDate2 = '2026-08-20';

  // 2. Crear Envío A con fecha de entrega explícita 2026-08-19
  console.log('2. Creando Envío A (Reg: 2026-08-18, Ent: 2026-08-19, Entregado)...');
  const postA = await request({
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
    fechaEntrega: deliveryDate1,
    tipoServicio: 'Express',
    destinatarioNombre: 'Cliente Entrega Diecinueve',
    destinatarioTelefono: '911222333',
    direccion: 'Av. Larco 743',
    distrito: 'Miraflores',
    provincia: 'Lima',
    departamento: 'Lima',
    cantidadPaquetes: '1',
    estado: 'Entregado'
  }).toString());

  if (postA.statusCode !== 302) throw new Error('Fallo al crear Envío A');
  console.log('   ✅ Envío A creado.');

  // 3. Crear Envío B sin fecha de entrega (Registrado)
  console.log('3. Creando Envío B (Reg: 2026-08-18, Sin Entrega, Registrado)...');
  const postB = await request({
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
    fechaEntrega: '',
    tipoServicio: 'Estándar',
    destinatarioNombre: 'Cliente Sin Entrega Aun',
    destinatarioTelefono: '944555666',
    direccion: 'Av. Arequipa 1200',
    distrito: 'Lince',
    provincia: 'Lima',
    departamento: 'Lima',
    cantidadPaquetes: '2',
    estado: 'Registrado'
  }).toString());

  if (postB.statusCode !== 302) throw new Error('Fallo al crear Envío B');
  console.log('   ✅ Envío B creado.');

  // 4. Filtrar por Fecha de Registro
  console.log(`4. Probando filtro solo por Fecha de Registro = ${today}...`);
  const filterReg = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/envios?fechaRegistro=${today}`,
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (filterReg.body.includes('Cliente Entrega Diecinueve') && filterReg.body.includes('Cliente Sin Entrega Aun')) {
    console.log('   ✅ Filtro por Fecha de Registro retornó ambos envíos registrados en esa fecha.');
  } else {
    throw new Error('Fallo en el filtro por fechaRegistro.');
  }

  // 5. Filtrar por Fecha de Entrega
  console.log(`5. Probando filtro solo por Fecha de Entrega = ${deliveryDate1}...`);
  const filterEnt = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/envios?fechaEntrega=${deliveryDate1}`,
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (filterEnt.body.includes('Cliente Entrega Diecinueve') && !filterEnt.body.includes('Cliente Sin Entrega Aun')) {
    console.log('   ✅ Filtro por Fecha de Entrega discriminó correctamente los envíos.');
  } else {
    throw new Error('Fallo en el filtro por fechaEntrega.');
  }

  // 6. Filtrar por ambas fechas simultáneamente (y/o)
  console.log(`6. Probando filtro combinado Fecha Registro = ${today} AND Fecha Entrega = ${deliveryDate1}...`);
  const filterCombined = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/envios?fechaRegistro=${today}&fechaEntrega=${deliveryDate1}`,
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (filterCombined.body.includes('Cliente Entrega Diecinueve') && !filterCombined.body.includes('Cliente Sin Entrega Aun')) {
    console.log('   ✅ Filtro combinado por Fecha de Registro y Fecha de Entrega funciona a la perfección.');
  } else {
    throw new Error('Fallo en el filtro combinado.');
  }

  // 7. Validar columna en Excel
  console.log('7. Verificando columna "Fecha Ent." en exportación Excel...');
  const excelRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/reportes/diario/excel?fecha=${today}`,
    method: 'GET',
    headers: { 'Cookie': cookie }
  }, null, true);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excelRes.buffer);
  const sheet = workbook.getWorksheet(`Reporte ${today}`);
  const headers = sheet.getRow(7).values;

  if (headers.includes('Fecha Reg.') && headers.includes('Fecha Ent.')) {
    console.log('   ✅ Columnas Fecha Reg. y Fecha Ent. presentes en el Excel.');
  } else {
    throw new Error('Faltan columnas de fecha en la plantilla Excel.');
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE FILTRADO POR FECHA DE REGISTRO Y/O ENTREGA PASARON EXITOSAMENTE!');
}

testDateFilters().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
