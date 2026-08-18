const { getDatabase } = require('../config/database');
const User = require('../models/User');

class UserRepository {
  constructor() {
    this.db = getDatabase();
  }

  findByUsername(username) {
    const stmt = this.db.prepare('SELECT * FROM usuarios WHERE username = ? COLLATE NOCASE');
    const row = stmt.get(username);
    return row ? new User(row) : null;
  }

  findById(id) {
    const stmt = this.db.prepare('SELECT * FROM usuarios WHERE id = ?');
    const row = stmt.get(id);
    return row ? new User(row) : null;
  }

  create(userData) {
    const stmt = this.db.prepare(`
      INSERT INTO usuarios (username, password_hash, nombre, estado, creado_por)
      VALUES (@username, @passwordHash, @nombre, @estado, @creadoPor)
    `);

    const result = stmt.run({
      username: userData.username,
      passwordHash: userData.passwordHash,
      nombre: userData.nombre,
      estado: userData.estado || 'Activo',
      creadoPor: userData.creadoPor || 'Sistema'
    });

    return this.findById(result.lastInsertRowid);
  }

  update(id, userData) {
    const stmt = this.db.prepare(`
      UPDATE usuarios
      SET nombre = @nombre,
          estado = @estado,
          fecha_modificacion = DATETIME('now', 'localtime'),
          modificado_por = @modificadoPor
      WHERE id = @id
    `);

    stmt.run({
      id,
      nombre: userData.nombre,
      estado: userData.estado,
      modificadoPor: userData.modificadoPor || 'Sistema'
    });

    return this.findById(id);
  }
}

module.exports = new UserRepository();
