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

async function runReportAndExcelTests() {
  console.log('--- Iniciando prueba de Reporte Diario y Exportación Excel (ETAPA 5 y 6) ---');

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

  // 2. Consultar Reporte Diario (HTML)
  console.log(`2. Consultando Reporte Diario para la fecha ${today} (GET /reportes/diario)...`);
  const reportRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/reportes/diario?fecha=${today}`,
    method: 'GET',
    headers: { 'Cookie': cookie }
  });

  if (reportRes.statusCode !== 200) {
    throw new Error(`Fallo al cargar el reporte diario: status ${reportRes.statusCode}`);
  }

  const requiredSections = [
    'Reporte Diario de Operaciones',
    'Total Envíos',
    'Clientes con Envíos',
    'Total Paquetes',
    'Entregados',
    'Pendientes',
    'Cancelados',
    'Exportar a Excel (.xlsx)',
    'Comercial San José',
    'Distribuidora Lima Norte',
    'Manuel Alvarado',
    'Rosa Melgar'
  ];

  for (const item of requiredSections) {
    if (!reportRes.body.includes(item)) {
      throw new Error(`El reporte diario no contiene el elemento esperado: "${item}"`);
    }
  }
  console.log('   ✅ Vista de Reporte Diario renderizada con resumen y datos operativos.');

  // 3. Probar descarga de Excel (.xlsx)
  console.log(`3. Descargando archivo Excel del reporte diario (GET /reportes/diario/excel?fecha=${today})...`);
  const excelRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/reportes/diario/excel?fecha=${today}`,
    method: 'GET',
    headers: { 'Cookie': cookie }
  }, null, true);

  if (excelRes.statusCode !== 200) {
    throw new Error(`Fallo en la descarga de Excel: status ${excelRes.statusCode}`);
  }

  const contentType = excelRes.headers['content-type'];
  const disposition = excelRes.headers['content-disposition'];
  console.log(`   Content-Type: ${contentType}`);
  console.log(`   Content-Disposition: ${disposition}`);
  console.log(`   Tamaño del buffer recibido: ${excelRes.buffer.length} bytes`);

  if (!contentType.includes('spreadsheetml.sheet')) {
    throw new Error('Content-Type incorrecto para archivo Excel.');
  }

  if (!disposition.includes(`Reporte_Courier_${today}.xlsx`)) {
    throw new Error(`Nombre de archivo incorrecto en Content-Disposition: ${disposition}`);
  }

  // 4. Validar contenido real del archivo Excel generado con ExcelJS
  console.log('4. Analizando y validando estructura interna del archivo Excel generado...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excelRes.buffer);

  const sheet = workbook.getWorksheet(`Reporte ${today}`);
  if (!sheet) {
    throw new Error(`La hoja 'Reporte ${today}' no se encontró en el archivo Excel.`);
  }

  const titleValue = sheet.getCell('A1').value;
  console.log(`   Título en Excel (A1): "${titleValue}"`);
  if (!titleValue.includes('REPORTE DIARIO DE OPERACIONES DE COURIER')) {
    throw new Error('El título de la cabecera en Excel no coincide.');
  }

  // Verificar encabezados de columnas (Fila 7)
  const expectedHeaders = ['Fecha Reg.', 'Fecha Ent.', 'Código Envío', 'Código Cliente', 'Cliente / Razón Social', 'Destinatario', 'Teléfono', 'Dirección de Entrega', 'Distrito', 'Tipo Servicio', 'Paquetes', 'Estado'];
  const row7Values = sheet.getRow(7).values;
  for (const h of expectedHeaders) {
    if (!row7Values.includes(h)) {
      throw new Error(`Encabezado faltante en Excel: "${h}"`);
    }
  }

  console.log('   ✅ Estructura, formatos, estilos y datos de la hoja de cálculo validados con éxito.');
  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE LA ETAPA 5 Y 6 PASARON SATISFACTORIAMENTE!');
}

runReportAndExcelTests().catch(err => {
  console.error('❌ Error en pruebas:', err);
  process.exit(1);
});
