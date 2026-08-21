class Driver {
  constructor(data = {}) {
    this.id = data.id || null;
    this.nombre = data.nombre || '';
    this.apellidos = data.apellidos || '';
    this.documento = data.documento || '';
    this.telefono = data.telefono || '';
    this.vehiculo = data.vehiculo || 'Moto'; // 'Moto' | 'Auto' | 'Furgoneta' | 'Bicicleta'
    this.placa = data.placa || '';
    this.capacidad = parseFloat(data.capacidad || 0);
    this.estado = data.estado || 'Disponible'; // 'Disponible' | 'En ruta' | 'No disponible'
    this.fechaCreacion = data.fecha_creacion || data.fechaCreacion || null;
    this.fechaModificacion = data.fecha_modificacion || data.fechaModificacion || null;
    this.creadoPor = data.creado_por || data.creadoPor || null;
    this.modificadoPor = data.modificado_por || data.modificadoPor || null;

    // Campos calculados / agregados
    this.totalEnvios = data.total_envios !== undefined ? parseInt(data.total_envios, 10) : (data.totalEnvios || 0);
    this.enviosPendientes = data.envios_pendientes !== undefined ? parseInt(data.envios_pendientes, 10) : (data.enviosPendientes || 0);
  }

  get nombreCompleto() {
    return `${this.nombre} ${this.apellidos}`.trim();
  }

  getStatusBadgeClass() {
    switch (this.estado) {
      case 'Disponible':
        return 'badge-success';
      case 'En ruta':
        return 'badge-primary';
      case 'No disponible':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }

  getVehiculoIcon() {
    switch (this.vehiculo?.toLowerCase()) {
      case 'moto':
      case 'motocicleta':
        return '🏍️';
      case 'auto':
      case 'automóvil':
        return '🚗';
      case 'furgoneta':
      case 'camioneta':
        return '🚐';
      case 'bicicleta':
        return '🚲';
      default:
        return '🚚';
    }
  }
}

module.exports = Driver;
