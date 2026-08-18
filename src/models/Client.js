class Client {
  constructor(data = {}) {
    this.id = data.id || null;
    this.codigoCliente = data.codigo_cliente || data.codigoCliente || '';
    this.tipoDocumento = data.tipo_documento || data.tipoDocumento || 'DNI';
    this.numeroDocumento = data.numero_documento || data.numeroDocumento || '';
    this.razonSocialNombre = data.razon_social_nombre || data.razonSocialNombre || '';
    this.contacto = data.contacto || '';
    this.telefono = data.telefono || '';
    this.correo = data.correo || '';
    this.direccion = data.direccion || '';
    this.distrito = data.distrito || '';
    this.provincia = data.provincia || '';
    this.departamento = data.departamento || '';
    this.estado = data.estado || 'Activo';
    this.fechaRegistro = data.fecha_registro || data.fechaRegistro || null;
    this.fechaCreacion = data.fecha_creacion || data.fechaCreacion || null;
    this.fechaModificacion = data.fecha_modificacion || data.fechaModificacion || null;
    this.creadoPor = data.creado_por || data.creadoPor || null;
    this.modificadoPor = data.modificado_por || data.modificadoPor || null;
  }

  isActive() {
    return this.estado === 'Activo';
  }

  getDisplayName() {
    return `${this.codigoCliente} - ${this.razonSocialNombre} (${this.numeroDocumento})`;
  }
}

module.exports = Client;
