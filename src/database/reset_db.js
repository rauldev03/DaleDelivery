const { getDatabase } = require('../config/database');
const { runMigrations } = require('./migrations');
const { runSeeders } = require('./seeders');

function resetDatabase() {
  console.log('🧹 Iniciando limpieza completa de la base de datos para producción...');
  const db = getDatabase();

  // Desactivar temporalmente foreign keys para truncar limpiamente
  db.pragma('foreign_keys = OFF');

  // Limpiar tablas de negocio
  db.exec('DELETE FROM envios;');
  db.exec('DELETE FROM clientes;');

  // Resetear contadores AUTOINCREMENT de SQLite para que los IDs y correlativos comiencen desde 1
  try {
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('envios', 'clientes');");
  } catch (e) {
    // sqlite_sequence puede estar vacía
  }

  // Reactivar foreign keys
  db.pragma('foreign_keys = ON');

  // Ejecutar VACUUM para limpiar espacio en disco
  db.exec('VACUUM;');

  // Asegurar que el usuario admin exista
  runSeeders();

  const countEnvios = db.prepare('SELECT COUNT(*) as c FROM envios').get().c;
  const countClientes = db.prepare('SELECT COUNT(*) as c FROM clientes').get().c;
  const countUsuarios = db.prepare('SELECT COUNT(*) as c FROM usuarios').get().c;

  console.log(`✅ Base de datos reseteada con éxito:`);
  console.log(`   - Envíos restantes: ${countEnvios}`);
  console.log(`   - Clientes restantes: ${countClientes}`);
  console.log(`   - Usuarios activos: ${countUsuarios} (admin / admin123)`);
}

if (require.main === module) {
  resetDatabase();
}

module.exports = { resetDatabase };
