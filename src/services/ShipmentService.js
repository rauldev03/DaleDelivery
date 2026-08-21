const shipmentRepository = require('../repositories/ShipmentRepository');
const { validateShipmentInput } = require('../validations/shipmentValidation');

class ShipmentService {
  listShipments(filters) {
    return shipmentRepository.findAll(filters);
  }

  getShipmentById(id) {
    return shipmentRepository.findById(id);
  }

  getNextShipmentCode(dateStr) {
    return shipmentRepository.getNextShipmentCode(dateStr);
  }

  createShipment(dto) {
    const validation = validateShipmentInput(dto);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    const codigoEnvio = shipmentRepository.getNextShipmentCode(dto.fechaRegistro);
    const newShipment = shipmentRepository.create({
      ...dto,
      codigoEnvio
    });

    return {
      success: true,
      shipment: newShipment
    };
  }

  updateShipment(id, dto) {
    const existing = shipmentRepository.findById(id);
    if (!existing) {
      return {
        success: false,
        errors: ['El envío solicitado no existe.']
      };
    }

    const validation = validateShipmentInput(dto);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    const updated = shipmentRepository.update(id, dto);
    return {
      success: true,
      shipment: updated
    };
  }

  updateShipmentStatus(id, newStatus, currentUser, fechaEntrega = null) {
    const validStatuses = ['Registrado', 'En proceso', 'Entregado', 'Cancelado'];
    if (!validStatuses.includes(newStatus)) {
      return {
        success: false,
        message: 'Estado de envío no válido.'
      };
    }

    const modificadoPor = currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema';
    const updated = shipmentRepository.updateStatus(id, newStatus, modificadoPor, fechaEntrega);
    if (!updated) {
      return {
        success: false,
        message: 'No se pudo actualizar el estado del envío.'
      };
    }

    return {
      success: true,
      shipment: updated
    };
  }

  createBatchShipments({ clienteId, fechaRegistro, items }, currentUser) {
    const clientRepository = require('../repositories/ClientRepository');
    const errors = [];

    // 1. Validar cliente
    if (!clienteId || isNaN(clienteId)) {
      errors.push('Debe seleccionar un cliente obligatorio para el lote de envíos.');
    } else {
      const client = clientRepository.findById(clienteId);
      if (!client) {
        errors.push('El cliente seleccionado no existe en el sistema.');
      } else if (client.estado !== 'Activo') {
        errors.push(`El cliente ${client.razonSocialNombre} se encuentra inactivo.`);
      }
    }

    // 2. Validar fecha
    const fecha = fechaRegistro && /^\d{4}-\d{2}-\d{2}$/.test(fechaRegistro.trim()) 
      ? fechaRegistro.trim() 
      : new Date().toISOString().split('T')[0];

    if (!Array.isArray(items) || items.length === 0) {
      errors.push('Debe ingresar al menos una fila con datos de envío.');
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const modificadoPor = currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema';
    const validItemsToInsert = [];
    let nonEmptyRowCount = 0;

    items.forEach((row, idx) => {
      const rowNum = idx + 1;

      // Verificar si la fila está completamente vacía
      const hasContent = (row.destinatarioNombre && row.destinatarioNombre.trim() !== '') ||
                         (row.destinatarioTelefono && row.destinatarioTelefono.trim() !== '') ||
                         (row.direccion && row.direccion.trim() !== '');

      if (!hasContent) {
        // Ignorar filas totalmente vacías
        return;
      }

      nonEmptyRowCount++;
      const rowErrors = [];

      if (!row.destinatarioNombre || row.destinatarioNombre.trim().length < 3) {
        rowErrors.push(`Fila #${rowNum}: El nombre del destinatario es obligatorio (mínimo 3 caracteres).`);
      }

      if (!row.destinatarioTelefono || row.destinatarioTelefono.trim() === '') {
        rowErrors.push(`Fila #${rowNum}: El teléfono del destinatario es obligatorio.`);
      }

      if (!row.direccion || row.direccion.trim() === '') {
        rowErrors.push(`Fila #${rowNum}: La dirección de entrega es obligatoria.`);
      }

      if (!row.distrito || row.distrito.trim() === '') {
        rowErrors.push(`Fila #${rowNum}: El distrito es obligatorio.`);
      }

      const cantidadPaquetes = parseInt(row.cantidadPaquetes || 1, 10);
      if (isNaN(cantidadPaquetes) || cantidadPaquetes <= 0) {
        rowErrors.push(`Fila #${rowNum}: La cantidad de paquetes debe ser mayor a 0.`);
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validItemsToInsert.push({
          clienteId: parseInt(clienteId, 10),
          fechaRegistro: fecha,
          fechaEntrega: row.fechaEntrega && row.fechaEntrega.trim() !== '' ? row.fechaEntrega.trim() : null,
          tipoServicio: row.tipoServicio ? row.tipoServicio.trim() : 'Estándar',
          destinatarioNombre: row.destinatarioNombre.trim(),
          destinatarioDocumento: row.destinatarioDocumento ? row.destinatarioDocumento.trim() : '',
          destinatarioTelefono: row.destinatarioTelefono.trim(),
          destinatarioCorreo: row.destinatarioCorreo ? row.destinatarioCorreo.trim() : '',
          direccion: row.direccion.trim(),
          referencia: row.referencia ? row.referencia.trim() : '',
          distrito: row.distrito.trim(),
          provincia: row.provincia ? row.provincia.trim() : 'Lima',
          departamento: row.departamento ? row.departamento.trim() : 'Lima',
          linkGoogleMaps: row.linkGoogleMaps ? row.linkGoogleMaps.trim() : (row.link_google_maps ? row.link_google_maps.trim() : ''),
          plusCode: row.plusCode ? row.plusCode.trim() : (row.plus_code ? row.plus_code.trim() : ''),
          cantidadPaquetes,
          peso: parseFloat(row.peso || 0),
          descripcion: row.descripcion ? row.descripcion.trim() : '',
          observaciones: row.observaciones ? row.observaciones.trim() : '',
          estado: row.estado ? row.estado.trim() : 'Registrado',
          creadoPor: modificadoPor
        });
      }
    });

    if (nonEmptyRowCount === 0) {
      return {
        success: false,
        errors: ['Debe ingresar los datos de al menos un envío en la tabla.']
      };
    }

    if (errors.length > 0) {
      return {
        success: false,
        errors
      };
    }

    // Insertar en bloque
    const insertedShipments = shipmentRepository.createBatch(validItemsToInsert);

    return {
      success: true,
      count: insertedShipments.length,
      shipments: insertedShipments
    };
  }

  assignShipmentToDriver(shipmentId, driverId, currentUser = null) {
    const modificadoPor = currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema';
    const updated = shipmentRepository.assignToConductor(shipmentId, driverId, modificadoPor);
    if (!updated) {
      return { success: false, message: 'Envío no encontrado.' };
    }
    return { success: true, shipment: updated };
  }

  unassignShipmentFromDriver(shipmentId, currentUser = null) {
    const modificadoPor = currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema';
    const updated = shipmentRepository.unassignFromConductor(shipmentId, modificadoPor);
    if (!updated) {
      return { success: false, message: 'Envío no encontrado.' };
    }
    return { success: true, shipment: updated };
  }

  updateCoordinates(shipmentId, lat, lng, currentUser = null) {
    const modificadoPor = currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema';
    const updated = shipmentRepository.updateCoordinates(shipmentId, lat, lng, modificadoPor);
    if (!updated) {
      return { success: false, message: 'Envío no encontrado.' };
    }
    return { success: true, shipment: updated };
  }
}

module.exports = new ShipmentService();
