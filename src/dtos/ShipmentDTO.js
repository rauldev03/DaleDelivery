class ShipmentDTO {
  static fromRequest(body, currentUser = null) {
    return {
      clienteId: body.clienteId ? parseInt(body.clienteId, 10) : null,
      fechaRegistro: body.fechaRegistro ? body.fechaRegistro.trim() : new Date().toISOString().split('T')[0],
      fechaEntrega: body.fechaEntrega && body.fechaEntrega.trim() !== '' ? body.fechaEntrega.trim() : null,
      tipoServicio: body.tipoServicio ? body.tipoServicio.trim() : 'Estándar',
      destinatarioNombre: body.destinatarioNombre ? body.destinatarioNombre.trim() : '',
      destinatarioDocumento: body.destinatarioDocumento ? body.destinatarioDocumento.trim() : '',
      destinatarioTelefono: body.destinatarioTelefono ? body.destinatarioTelefono.trim() : '',
      destinatarioCorreo: body.destinatarioCorreo ? body.destinatarioCorreo.trim() : '',
      direccion: body.direccion ? body.direccion.trim() : '',
      referencia: body.referencia ? body.referencia.trim() : '',
      distrito: body.distrito ? body.distrito.trim() : '',
      provincia: body.provincia ? body.provincia.trim() : '',
      departamento: body.departamento ? body.departamento.trim() : '',
      linkGoogleMaps: body.linkGoogleMaps ? body.linkGoogleMaps.trim() : (body.link_google_maps ? body.link_google_maps.trim() : ''),
      plusCode: body.plusCode ? body.plusCode.trim() : (body.plus_code ? body.plus_code.trim() : ''),
      cantidadPaquetes: body.cantidadPaquetes ? parseInt(body.cantidadPaquetes, 10) : 1,
      peso: body.peso ? parseFloat(body.peso) : 0,
      descripcion: body.descripcion ? body.descripcion.trim() : '',
      observaciones: body.observaciones ? body.observaciones.trim() : '',
      estado: body.estado ? body.estado.trim() : 'Registrado',
      creadoPor: currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema',
      modificadoPor: currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema'
    };
  }
}

module.exports = ShipmentDTO;
