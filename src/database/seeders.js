const bcrypt = require('bcryptjs');
const { getDatabase } = require('../config/database');

function runSeeders() {
  const db = getDatabase();

  // Verificar si ya existe el usuario admin
  const userCheck = db.prepare('SELECT id FROM usuarios WHERE username = ?').get('admin');

  if (!userCheck) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin123', salt);

    const insertAdmin = db.prepare(`
      INSERT INTO usuarios (username, password_hash, nombre, estado, creado_por)
      VALUES (?, ?, ?, 'Activo', 'Sistema')
    `);

    insertAdmin.run('admin', passwordHash, 'Administrador Principal');
    console.log('✅ Seeder ejecutado: Usuario admin creado por defecto (admin / admin123).');
  }
}

module.exports = {
  runSeeders
};
