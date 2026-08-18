class User {
  constructor(data = {}) {
    this.id = data.id || null;
    this.username = data.username ? data.username.trim() : '';
    this.passwordHash = data.password_hash || data.passwordHash || '';
    this.nombre = data.nombre ? data.nombre.trim() : '';
    this.estado = data.estado || 'Activo';
    this.fechaCreacion = data.fecha_creacion || data.fechaCreacion || null;
    this.fechaModificacion = data.fecha_modificacion || data.fechaModificacion || null;
    this.creadoPor = data.creado_por || data.creadoPor || null;
    this.modificadoPor = data.modificado_por || data.modificadoPor || null;
  }

  isActive() {
    return this.estado === 'Activo';
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      nombre: this.nombre,
      estado: this.estado,
      fechaCreacion: this.fechaCreacion
    };
  }
}

module.exports = User;
