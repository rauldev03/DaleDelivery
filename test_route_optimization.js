const { runMigrations } = require('./src/database/migrations');
const driverService = require('./src/services/DriverService');
const shipmentService = require('./src/services/ShipmentService');
const shipmentRepository = require('./src/repositories/ShipmentRepository');
const clientRepository = require('./src/repositories/ClientRepository');
const routeOptimizationService = require('./src/services/RouteOptimizationService');

async function runTests() {
  console.log('🧪 Iniciando pruebas del módulo de Optimización de Rutas...\n');

  // 1. Ejecutar migraciones
  console.log('1. Ejecutando migraciones de base de datos...');
  runMigrations();
  console.log('✅ Migraciones ejecutadas sin errores.');

  // 2. Crear Cliente de prueba si no existe
  let client = clientRepository.findAll({ limit: 1 }).clients[0];
  if (!client) {
    console.log('Creando cliente de prueba...');
    client = clientRepository.create({
      codigoCliente: 'CLI-TEST-001',
      tipoDocumento: 'RUC',
      numeroDocumento: '20601234567',
      razonSocialNombre: 'Empresa Logística Test S.A.C.',
      contacto: 'Juan Pérez',
      telefono: '999888777',
      correo: 'test@empresa.pe',
      direccion: 'Av. Las Begonias 441',
      distrito: 'San Isidro',
      provincia: 'Lima',
      departamento: 'Lima',
      estado: 'Activo'
    });
  }
  console.log(`✅ Cliente verificado: ID ${client.id} - ${client.razonSocialNombre}`);

  // 3. Probar CRUD de Conductores
  console.log('\n2. Probando CRUD de Conductores...');
  const testDoc = '7' + Math.floor(1000000 + Math.random() * 9000000);
  const driverRes = driverService.createDriver({
    nombre: 'Carlos',
    apellidos: 'Mendoza López',
    documento: testDoc,
    telefono: '987654321',
    vehiculo: 'Moto',
    placa: '4567-MN',
    capacidad: 25,
    estado: 'Disponible'
  });

  if (!driverRes.success) {
    throw new Error('Error al crear conductor: ' + JSON.stringify(driverRes.errors));
  }
  const driver = driverRes.driver;
  console.log(`✅ Conductor creado: ID ${driver.id} - ${driver.nombreCompleto} (${driver.vehiculo})`);

  // Actualizar conductor
  const updateRes = driverService.updateDriver(driver.id, {
    nombre: 'Carlos Alberto',
    apellidos: 'Mendoza López',
    documento: testDoc,
    telefono: '987654321',
    vehiculo: 'Moto',
    placa: '4567-MN',
    capacidad: 30,
    estado: 'Disponible'
  });
  if (!updateRes.success) throw new Error('Error al actualizar conductor');
  console.log(`✅ Conductor actualizado correctamente.`);

  // 4. Crear Envíos con Coordenadas y Asignación
  console.log('\n3. Creando envíos con geolocalización y asignación...');
  const testShipments = [
    {
      clienteId: client.id,
      destinatarioNombre: 'Cliente Miraflores (Parada A)',
      destinatarioTelefono: '911111111',
      direccion: 'Av. Larco 123',
      distrito: 'Miraflores',
      latitud: -12.1219,
      longitud: -77.0298,
      prioridad: 'Alta',
      conductorId: driver.id,
      peso: 2.5
    },
    {
      clienteId: client.id,
      destinatarioNombre: 'Cliente San Isidro (Parada B)',
      destinatarioTelefono: '922222222',
      direccion: 'Av. Rivera Navarrete 500',
      distrito: 'San Isidro',
      latitud: -12.0950,
      longitud: -77.0280,
      prioridad: 'Normal',
      conductorId: driver.id,
      peso: 1.2
    },
    {
      clienteId: client.id,
      destinatarioNombre: 'Cliente Surco (Parada C)',
      destinatarioTelefono: '933333333',
      direccion: 'Av. Primavera 650',
      distrito: 'Santiago de Surco',
      latitud: -12.1120,
      longitud: -76.9850,
      prioridad: 'Normal',
      conductorId: driver.id,
      peso: 3.0
    }
  ];

  const createdShipments = [];
  for (const s of testShipments) {
    const code = shipmentRepository.getNextShipmentCode();
    const created = shipmentRepository.create({
      ...s,
      codigoEnvio: code,
      fechaRegistro: new Date().toISOString().split('T')[0]
    });
    createdShipments.push(created);
    console.log(`  📦 Envío creado: ${created.codigoEnvio} -> ${created.destinatarioNombre} (Lat: ${created.latitud}, Lng: ${created.longitud})`);
  }

  // 5. Probar Algoritmo de Optimización de Rutas
  console.log('\n4. Ejecutando Algoritmo de Optimización de Rutas...');
  const optResult = await routeOptimizationService.optimizeRoutes({
    driverId: driver.id
  });

  if (!optResult.success || !optResult.results || optResult.results.length === 0) {
    throw new Error('Error en el servicio de optimización de rutas.');
  }

  const driverOpt = optResult.results.find(r => r.driverId === driver.id);
  console.log(`✅ Optimización completada para ${driverOpt.driverName}:`);
  console.log(`  • Total de paradas: ${driverOpt.totalShipments}`);
  console.log(`  • Distancia estimada: ${driverOpt.totalDistanceKm} km`);
  console.log(`  • Tiempo estimado: ${driverOpt.estimatedDurationMinutes} minutos`);
  console.log('  • Secuencia de paradas optimizada:');
  driverOpt.stops.forEach(stop => {
    console.log(`    Parada #${stop.order} -> [${stop.codigoEnvio}] ${stop.destinatarioNombre} (${stop.distrito}) - Prioridad: ${stop.prioridad}`);
  });

  // Verificar persistencia de orden_ruta
  const refreshedShipments = shipmentRepository.findByConductor(driver.id);
  const allHaveOrder = refreshedShipments.every(s => s.ordenRuta > 0);
  if (!allHaveOrder) {
    throw new Error('Falló la persistencia de orden_ruta en la base de datos.');
  }
  console.log('✅ Persistencia de orden_ruta en SQLite validada con éxito.');

  // 6. Probar desasignación
  console.log('\n5. Probando desasignación...');
  const unassigned = shipmentService.unassignShipmentFromDriver(createdShipments[0].id);
  if (!unassigned.success) throw new Error('Error al desasignar envío.');
  console.log(`✅ Envío ${createdShipments[0].codigoEnvio} desasignado correctamente.`);

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DEL MÓDULO PASARON EXITOSAMENTE!');
}

runTests().catch(err => {
  console.error('❌ Error durante las pruebas:', err);
  process.exit(1);
});
