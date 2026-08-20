const { execSync } = require('child_process');

console.log('====================================================');
console.log('EJECUCIÓN DE BATERÍA DE PRUEBAS INTEGRALES DEL SISTEMA');
console.log('====================================================\n');

const tests = [
  'test_landing.js',
  'test_auth.js',
  'test_clients.js',
  'test_shipments.js',
  'test_dashboard.js',
  'test_reports_excel.js',
  'test_date_filters.js',
  'test_batch_shipments.js',
  'test_excel_paste_and_districts.js',
  'test_maps_and_plus_code.js',
  'test_map_viewer.js'
];

let allPassed = true;

for (const test of tests) {
  try {
    console.log(`▶ Ejecutando: ${test}`);
    const output = execSync(`node ${test}`, { encoding: 'utf8' });
    console.log(output);
  } catch (err) {
    console.error(`❌ Falló la prueba ${test}:`, err.stdout || err.message);
    allPassed = false;
    break;
  }
}

if (allPassed) {
  console.log('====================================================');
  console.log('🎉 TODAS LAS 6 ETAPAS DEL SISTEMA FUNCIONAN AL 100%');
  console.log('====================================================');
} else {
  process.exit(1);
}
