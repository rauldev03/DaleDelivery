const driverRepository = require('../repositories/DriverRepository');

class DriverService {
  listDrivers(filters = {}) {
    return driverRepository.findAll(filters);
  }

  getActiveDrivers() {
    return driverRepository.findAllActive();
  }

  getDriverById(id) {
    return driverRepository.findById(id);
  }

  createDriver(data, currentUser = null) {
    const errors = this.validateDriverData(data);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    const existingDoc = driverRepository.findByDocumento(data.documento.trim());
    if (existingDoc) {
      return { success: false, errors: ['Ya existe un conductor registrado con este número de documento.'] };
    }

    try {
      const driver = driverRepository.create({
        ...data,
        creadoPor: currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema'
      });
      return { success: true, driver };
    } catch (error) {
      console.error('Error al crear conductor:', error);
      return { success: false, errors: ['Error en base de datos al registrar conductor: ' + error.message] };
    }
  }

  updateDriver(id, data, currentUser = null) {
    const existing = driverRepository.findById(id);
    if (!existing) {
      return { success: false, errors: ['El conductor solicitado no existe.'] };
    }

    const errors = this.validateDriverData(data, id);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    const duplicateDoc = driverRepository.findByDocumento(data.documento.trim());
    if (duplicateDoc && duplicateDoc.id !== parseInt(id, 10)) {
      return { success: false, errors: ['Ya existe otro conductor registrado con este número de documento.'] };
    }

    try {
      const driver = driverRepository.update(id, {
        ...data,
        modificadoPor: currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema'
      });
      return { success: true, driver };
    } catch (error) {
      console.error('Error al actualizar conductor:', error);
      return { success: false, errors: ['Error en base de datos al actualizar conductor: ' + error.message] };
    }
  }

  updateStatus(id, newStatus, currentUser = null) {
    const allowed = ['Disponible', 'En ruta', 'No disponible'];
    if (!allowed.includes(newStatus)) {
      return { success: false, errors: ['Estado de conductor no válido.'] };
    }

    try {
      const driver = driverRepository.updateStatus(
        id,
        newStatus,
        currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema'
      );
      return { success: true, driver };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  }

  deleteDriver(id) {
    try {
      const success = driverRepository.delete(id);
      return { success, message: success ? 'Conductor eliminado correctamente' : 'No se pudo eliminar el conductor' };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  }

  validateDriverData(data) {
    const errors = [];
    if (!data.nombre || data.nombre.trim().length < 2) {
      errors.push('El nombre es obligatorio y debe tener al menos 2 caracteres.');
    }
    if (!data.apellidos || data.apellidos.trim().length < 2) {
      errors.push('Los apellidos son obligatorios.');
    }
    if (!data.documento || data.documento.trim().length < 6) {
      errors.push('El documento de identidad es obligatorio y debe ser válido.');
    }
    if (!data.vehiculo || data.vehiculo.trim().length === 0) {
      errors.push('Debe especificar el tipo de vehículo.');
    }
    return errors;
  }
}

module.exports = new DriverService();
