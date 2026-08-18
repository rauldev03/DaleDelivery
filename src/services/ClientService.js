const clientRepository = require('../repositories/ClientRepository');
const { validateClientInput } = require('../validations/clientValidation');

class ClientService {
  listClients(filters) {
    return clientRepository.findAll(filters);
  }

  getActiveClients() {
    return clientRepository.getAllActive();
  }

  getClientById(id) {
    return clientRepository.findById(id);
  }

  getNextClientCode() {
    return clientRepository.getNextClientCode();
  }

  createClient(dto) {
    const validation = validateClientInput(dto);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    const codigoCliente = clientRepository.getNextClientCode();
    const newClient = clientRepository.create({
      ...dto,
      codigoCliente
    });

    return {
      success: true,
      client: newClient
    };
  }

  updateClient(id, dto) {
    const existing = clientRepository.findById(id);
    if (!existing) {
      return {
        success: false,
        errors: ['El cliente que intenta editar no existe.']
      };
    }

    const validation = validateClientInput(dto, id);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    const updated = clientRepository.update(id, dto);
    return {
      success: true,
      client: updated
    };
  }

  toggleStatus(id, currentUser) {
    const modificadoPor = currentUser ? (currentUser.nombre || currentUser.username) : 'Sistema';
    const updated = clientRepository.toggleStatus(id, modificadoPor);
    if (!updated) {
      return {
        success: false,
        message: 'No se pudo actualizar el estado del cliente.'
      };
    }
    return {
      success: true,
      client: updated
    };
  }
}

module.exports = new ClientService();
