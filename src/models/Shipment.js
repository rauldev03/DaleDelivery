class Shipment {
  constructor(data = {}) {
    this.id = data.id || null;
    this.codigoEnvio = data.codigo_envio || data.codigoEnvio || '';
    this.clienteId = data.cliente_id || data.clienteId || null;
    this.fechaRegistro = data.fecha_registro || data.fechaRegistro || '';
    this.fechaEntrega = data.fecha_entrega || data.fechaEntrega || null;
    this.tipoServicio = data.tipo_servicio || data.tipoServicio || 'Estándar';
    this.destinatarioNombre = data.destinatario_nombre || data.destinatarioNombre || '';
    this.destinatarioDocumento = data.destinatario_documento || data.destinatarioDocumento || '';
    this.destinatarioTelefono = data.destinatario_telefono || data.destinatarioTelefono || '';
    this.destinatarioCorreo = data.destinatario_correo || data.destinatarioCorreo || '';
    this.direccion = data.direccion || '';
    this.referencia = data.referencia || '';
    this.distrito = data.distrito || '';
    this.provincia = data.provincia || '';
    this.departamento = data.departamento || '';
    this.linkGoogleMaps = data.link_google_maps || data.linkGoogleMaps || '';
    this.plusCode = data.plus_code || data.plusCode || '';
    this.cantidadPaquetes = parseInt(data.cantidad_paquetes || data.cantidadPaquetes || 1, 10);
    this.peso = parseFloat(data.peso || 0);
    this.descripcion = data.descripcion || '';
    this.observaciones = data.observaciones || '';
    this.estado = data.estado || 'Registrado'; // 'Registrado' | 'En proceso' | 'Entregado' | 'Cancelado'
    this.fechaCreacion = data.fecha_creacion || data.fechaCreacion || null;
    this.fechaModificacion = data.fecha_modificacion || data.fechaModificacion || null;
    this.creadoPor = data.creado_por || data.creadoPor || null;
    this.modificadoPor = data.modificado_por || data.modificadoPor || null;

    // Relaciones pobladas (joins)
    this.clienteCodigo = data.cliente_codigo || data.codigo_cliente || '';
    this.clienteNombre = data.cliente_nombre || data.razon_social_nombre || '';
    this.clienteDocumento = data.cliente_documento || data.numero_documento || '';
  }

  getStatusBadgeClass() {
    switch (this.estado) {
      case 'Registrado':
        return 'badge-info';
      case 'En proceso':
        return 'badge-warning';
      case 'Entregado':
        return 'badge-success';
      case 'Cancelado':
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  }
}

module.exports = Shipment;
