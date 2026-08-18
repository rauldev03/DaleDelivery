const clientService = require('../services/ClientService');
const ClientDTO = require('../dtos/ClientDTO');
const { LIMA_CALLAO_DISTRICTS, PERU_DEPARTMENTS, LIMA_PROVINCES } = require('../config/districts');

class ClientController {
  index(req, res) {
    const search = req.query.search || '';
    const estado = req.query.estado || '';
    const page = parseInt(req.query.page || 1, 10);
    const limit = 10;

    const result = clientService.listClients({ search, estado, page, limit });

    res.render('clients/index', {
      title: 'Gestión de Clientes - Courier Pro',
      clients: result.clients,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      },
      filters: {
        search,
        estado
      }
    });
  }

  showCreateForm(req, res) {
    const nextCode = clientService.getNextClientCode();
    res.render('clients/create', {
      title: 'Registrar Nuevo Cliente - Courier Pro',
      nextCode,
      districts: LIMA_CALLAO_DISTRICTS,
      departments: PERU_DEPARTMENTS,
      provinces: LIMA_PROVINCES,
      client: {
        departamento: 'Lima',
        provincia: 'Lima',
        distrito: 'San Isidro',
        estado: 'Activo'
      },
      errors: []
    });
  }

  create(req, res) {
    const dto = ClientDTO.fromRequest(req.body, req.session.user);
    const result = clientService.createClient(dto);

    if (!result.success) {
      const nextCode = clientService.getNextClientCode();
      return res.render('clients/create', {
        title: 'Registrar Nuevo Cliente - Courier Pro',
        nextCode,
        districts: LIMA_CALLAO_DISTRICTS,
        departments: PERU_DEPARTMENTS,
        provinces: LIMA_PROVINCES,
        client: req.body,
        errors: result.errors
      });
    }

    req.session.flashSuccess = `Cliente ${result.client.codigoCliente} (${result.client.razonSocialNombre}) registrado con éxito.`;
    return res.redirect('/clientes');
  }

  showEditForm(req, res) {
    const id = parseInt(req.params.id, 10);
    const client = clientService.getClientById(id);

    if (!client) {
      req.session.flashError = 'El cliente solicitado no existe.';
      return res.redirect('/clientes');
    }

    res.render('clients/edit', {
      title: `Editar Cliente ${client.codigoCliente} - Courier Pro`,
      client,
      districts: LIMA_CALLAO_DISTRICTS,
      departments: PERU_DEPARTMENTS,
      provinces: LIMA_PROVINCES,
      errors: []
    });
  }

  update(req, res) {
    const id = parseInt(req.params.id, 10);
    const dto = ClientDTO.fromRequest(req.body, req.session.user);
    const result = clientService.updateClient(id, dto);

    if (!result.success) {
      const currentClient = clientService.getClientById(id);
      return res.render('clients/edit', {
        title: `Editar Cliente ${currentClient ? currentClient.codigoCliente : ''} - Courier Pro`,
        client: { ...req.body, id, codigoCliente: currentClient ? currentClient.codigoCliente : '' },
        districts: LIMA_CALLAO_DISTRICTS,
        departments: PERU_DEPARTMENTS,
        provinces: LIMA_PROVINCES,
        errors: result.errors
      });
    }

    req.session.flashSuccess = `Cliente ${result.client.codigoCliente} actualizado correctamente.`;
    return res.redirect('/clientes');
  }

  show(req, res) {
    const id = parseInt(req.params.id, 10);
    const client = clientService.getClientById(id);

    if (!client) {
      req.session.flashError = 'El cliente solicitado no existe.';
      return res.redirect('/clientes');
    }

    res.render('clients/show', {
      title: `Detalle del Cliente ${client.codigoCliente} - Courier Pro`,
      client
    });
  }

  toggleStatus(req, res) {
    const id = parseInt(req.params.id, 10);
    const result = clientService.toggleStatus(id, req.session.user);

    if (!result.success) {
      req.session.flashError = result.message;
    } else {
      req.session.flashSuccess = `El estado del cliente ${result.client.codigoCliente} ahora es: ${result.client.estado}.`;
    }

    res.redirect(req.get('Referrer') || '/clientes');
  }
}

module.exports = new ClientController();
