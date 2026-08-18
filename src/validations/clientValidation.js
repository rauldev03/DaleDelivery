const clientRepository = require('../repositories/ClientRepository');

function validateClientInput(data, currentClientId = null) {
  const errors = [];

  // 1. Tipo de documento
  if (!data.tipoDocumento || !['DNI', 'RUC', 'CE', 'Pasaporte'].includes(data.tipoDocumento)) {
    errors.push('Seleccione un tipo de documento válido (DNI, RUC, CE, Pasaporte).');
  }

  // 2. Número de documento
  if (!data.numeroDocumento || data.numeroDocumento.trim() === '') {
    errors.push('El número de documento (DNI / RUC) es obligatorio.');
  } else {
    const doc = data.numeroDocumento.trim();
    if (data.tipoDocumento === 'DNI' && !/^\d{8}$/.test(doc)) {
      errors.push('El DNI debe contener exactamente 8 dígitos numéricos.');
    } else if (data.tipoDocumento === 'RUC' && !/^\d{11}$/.test(doc)) {
      errors.push('El RUC debe contener exactamente 11 dígitos numéricos.');
    }

    // Comprobar no duplicidad de DNI / RUC
    const existing = clientRepository.findByDocumento(doc);
    if (existing && (!currentClientId || existing.id !== parseInt(currentClientId, 10))) {
      errors.push(`Ya existe un cliente registrado con el número de documento ${doc} (${existing.razonSocialNombre}).`);
    }
  }

  // 3. Razón social / Nombre
  if (!data.razonSocialNombre || data.razonSocialNombre.trim() === '') {
    errors.push('La razón social o nombre del cliente es obligatorio.');
  } else if (data.razonSocialNombre.trim().length < 3) {
    errors.push('El nombre o razón social debe tener al menos 3 caracteres.');
  }

  // 4. Teléfono
  if (!data.telefono || data.telefono.trim() === '') {
    errors.push('El teléfono de contacto es obligatorio.');
  }

  // 5. Correo electrónico (opcional pero si viene debe ser válido)
  if (data.correo && data.correo.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.correo.trim())) {
      errors.push('El formato del correo electrónico no es válido.');
    }
  }

  // 6. Ubigeo y dirección
  if (!data.direccion || data.direccion.trim() === '') {
    errors.push('La dirección es obligatoria.');
  }
  if (!data.distrito || data.distrito.trim() === '') {
    errors.push('El distrito es obligatorio.');
  }
  if (!data.provincia || data.provincia.trim() === '') {
    errors.push('La provincia es obligatoria.');
  }
  if (!data.departamento || data.departamento.trim() === '') {
    errors.push('El departamento es obligatorio.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  validateClientInput
};
