const clientRepository = require('../repositories/ClientRepository');

function validateShipmentInput(data) {
  const errors = [];

  // 1. Cliente obligatorio y existente
  if (!data.clienteId || isNaN(data.clienteId)) {
    errors.push('Debe seleccionar un cliente obligatorio para el envío.');
  } else {
    const client = clientRepository.findById(data.clienteId);
    if (!client) {
      errors.push('El cliente seleccionado no existe en el sistema.');
    } else if (client.estado !== 'Activo') {
      errors.push(`El cliente ${client.razonSocialNombre} se encuentra inactivo. Solo clientes activos pueden registrar envíos.`);
    }
  }

  // 2. Fecha de registro
  if (!data.fechaRegistro || !/^\d{4}-\d{2}-\d{2}$/.test(data.fechaRegistro)) {
    errors.push('La fecha de registro del envío es inválida (Formato requerido: YYYY-MM-DD).');
  }

  // 3. Tipo de servicio
  if (!data.tipoServicio || data.tipoServicio.trim() === '') {
    errors.push('El tipo de servicio es obligatorio.');
  }

  // 4. Datos del destinatario
  if (!data.destinatarioNombre || data.destinatarioNombre.trim() === '') {
    errors.push('El nombre del destinatario es obligatorio.');
  } else if (data.destinatarioNombre.trim().length < 3) {
    errors.push('El nombre del destinatario debe tener al menos 3 caracteres.');
  }

  if (!data.destinatarioTelefono || data.destinatarioTelefono.trim() === '') {
    errors.push('El teléfono del destinatario es obligatorio.');
  }

  if (data.destinatarioCorreo && data.destinatarioCorreo.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.destinatarioCorreo.trim())) {
      errors.push('El formato del correo del destinatario no es válido.');
    }
  }

  // 5. Dirección de entrega
  if (!data.direccion || data.direccion.trim() === '') {
    errors.push('La dirección de entrega es obligatoria.');
  }
  if (!data.distrito || data.distrito.trim() === '') {
    errors.push('El distrito de entrega es obligatorio.');
  }
  if (!data.provincia || data.provincia.trim() === '') {
    errors.push('La provincia de entrega es obligatoria.');
  }
  if (!data.departamento || data.departamento.trim() === '') {
    errors.push('El departamento de entrega es obligatorio.');
  }

  // 6. Paquetes y peso
  if (!data.cantidadPaquetes || isNaN(data.cantidadPaquetes) || parseInt(data.cantidadPaquetes, 10) <= 0) {
    errors.push('La cantidad de paquetes debe ser un número entero mayor a 0.');
  }

  if (data.peso !== undefined && data.peso !== null && isNaN(data.peso)) {
    errors.push('El peso del envío debe ser un valor numérico.');
  }

  // 7. Estado
  const validStatuses = ['Registrado', 'En proceso', 'Entregado', 'Cancelado'];
  if (data.estado && !validStatuses.includes(data.estado)) {
    errors.push(`El estado "${data.estado}" no es válido. Debe ser: Registrado, En proceso, Entregado o Cancelado.`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateShipmentInput
};
