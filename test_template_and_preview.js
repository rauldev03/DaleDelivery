const http = require('http');
const ExcelJS = require('exceljs');

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
          body: buffer.toString('utf-8'),
          rawBuffer: buffer
        });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTemplateAndPreviewTests() {
  console.log('--- Iniciando prueba de Descarga de Plantilla Excel y Asistente de Carga ---');

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

  // 2. Probar descarga de plantilla Excel
  console.log('2. Descargando plantilla Excel (GET /envios/plantilla-excel)...');
  const templateRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/plantilla-excel',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (templateRes.statusCode !== 200) {
    throw new Error(`Error al descargar plantilla. Código de estado: ${templateRes.statusCode}`);
  }

  const contentType = templateRes.headers['content-type'];
  const disposition = templateRes.headers['content-disposition'];

  if (!contentType.includes('spreadsheetml') || !disposition.includes('plantilla_envios_masivos.xlsx')) {
    throw new Error(`Cabeceras inválidas al descargar plantilla: ${contentType} | ${disposition}`);
  }

  // 3. Inspeccionar el contenido del Excel descargado con ExcelJS
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(templateRes.rawBuffer);

  const sheet1 = workbook.getWorksheet('Plantilla de Envíos');
  const sheet2 = workbook.getWorksheet('Distritos Oficiales');

  if (!sheet1 || !sheet2) {
    throw new Error('El archivo de plantilla no contiene las 2 hojas esperadas ("Plantilla de Envíos" y "Distritos Oficiales").');
  }

  console.log(`   ✅ Plantilla válida descargada (${templateRes.rawBuffer.length} bytes).`);
  console.log(`   ✅ Hoja 1: ${sheet1.name} tiene ${sheet1.rowCount} filas.`);
  console.log(`   ✅ Hoja 2: ${sheet2.name} tiene ${sheet2.rowCount} filas con el catálogo de distritos oficiales.`);

  // 4. Verificar que la vista /envios/masivo tiene los botones y scripts
  console.log('4. Verificando interfaz de subida y descarga en GET /envios/masivo...');
  const viewRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/envios/masivo',
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (!viewRes.body.includes('xlsx.full.min.js') ||
      !viewRes.body.includes('/envios/plantilla-excel') ||
      !viewRes.body.includes('handleExcelFileUpload') ||
      !viewRes.body.includes('triggerFileUpload')) {
    throw new Error('La vista /envios/masivo no contiene los componentes de descarga y subida de Excel.');
  }

  console.log('   ✅ La vista contiene los botones de descarga de plantilla, selector de archivo y lector SheetJS.');
  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE PLANTILLA EXCEL Y SUBIDA PASARON EXITOSAMENTE!');
}

runTemplateAndPreviewTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
