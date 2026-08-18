class ClientDTO {
  static fromRequest(body, currentUser = null) {
    return {
      tipoDocumento: body.tipoDocumento ? body.tipoDocumento.trim() : 'DNI',
      numeroDocumento: body.numeroDocumento ? body.numeroDocumento.trim() : '',
      razonSocialNombre: body.razonSocialNombre ? body.razonSocialNombre.trim() : '',
      contacto: body.contacto ? body.contacto.trim() : '',
      telefono: body.telefono ? body.telefono.trim() : '',
      correo: body.correo ? body.correo.trim() : '',
      direccion: body.direccion ? body.direccion.trim() : '',
      distrito: body.distrito ? body.distrito.trim() : '',
      provincia: body.provincia ? body.provincia.trim() : '',
      departamento: body.departamento ? body.departamento.trim() : '',
      estado: body.estado ? body.estado.trim() : 'Activo',
      creadoPor: currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema',
      modificadoPor: currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema'
    };
  }
}

module.exports = ClientDTO;
