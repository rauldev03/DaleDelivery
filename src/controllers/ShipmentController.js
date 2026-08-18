const shipmentService = require('../services/ShipmentService');
const clientService = require('../services/ClientService');
const excelExportService = require('../services/ExcelExportService');
const ShipmentDTO = require('../dtos/ShipmentDTO');
const { LIMA_CALLAO_DISTRICTS } = require('../config/districts');

class ShipmentController {
  index(req, res) {
    const search = req.query.search || '';
    const fecha = req.query.fecha || '';
    const fechaRegistro = req.query.fechaRegistro || (fecha || '');
    const fechaEntrega = req.query.fechaEntrega || '';
    const clienteId = req.query.clienteId || '';
    const codigo = req.query.codigo || '';
    const distrito = req.query.distrito || '';
    const estado = req.query.estado || '';
    const page = parseInt(req.query.page || 1, 10);
    const limit = 10;

    const result = shipmentService.listShipments({
      search,
      fechaRegistro,
      fechaEntrega,
      clienteId,
      codigo,
      distrito,
      estado,
      page,
      limit
    });

    const activeClients = clientService.getActiveClients();

    res.render('shipments/index', {
      title: 'Gestión de Envíos - Courier Pro',
      shipments: result.shipments,
      clients: activeClients,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      },
      filters: {
        search,
        fechaRegistro,
        fechaEntrega,
        clienteId,
        codigo,
        distrito,
        estado
      }
    });
  }

  showCreateForm(req, res) {
    const activeClients = clientService.getActiveClients();
    const today = new Date().toISOString().split('T')[0];
    const preselectedClientId = req.query.clienteId ? parseInt(req.query.clienteId, 10) : null;
    const nextCode = shipmentService.getNextShipmentCode(today);

    res.render('shipments/create', {
      title: 'Registrar Nuevo Envío - Courier Pro',
      clients: activeClients,
      districts: LIMA_CALLAO_DISTRICTS,
      today,
      nextCode,
      shipment: {
        clienteId: preselectedClientId,
        fechaRegistro: today,
        fechaEntrega: '',
        tipoServicio: 'Estándar',
        cantidadPaquetes: 1,
        peso: 1.0,
        estado: 'Registrado',
        distrito: 'San Isidro',
        provincia: 'Lima',
        departamento: 'Lima'
      },
      errors: []
    });
  }

  create(req, res) {
    const dto = ShipmentDTO.fromRequest(req.body, req.session.user);
    const result = shipmentService.createShipment(dto);

    if (!result.success) {
      const activeClients = clientService.getActiveClients();
      const nextCode = shipmentService.getNextShipmentCode(dto.fechaRegistro);

      return res.render('shipments/create', {
        title: 'Registrar Nuevo Envío - Courier Pro',
        clients: activeClients,
        districts: LIMA_CALLAO_DISTRICTS,
        today: dto.fechaRegistro,
        nextCode,
        shipment: req.body,
        errors: result.errors
      });
    }

    req.session.flashSuccess = `Envío ${result.shipment.codigoEnvio} registrado correctamente para el cliente ${result.shipment.clienteNombre || ''}.`;
    return res.redirect('/envios');
  }

  showEditForm(req, res) {
    const id = parseInt(req.params.id, 10);
    const shipment = shipmentService.getShipmentById(id);

    if (!shipment) {
      req.session.flashError = 'El envío solicitado no existe.';
      return res.redirect('/envios');
    }

    const activeClients = clientService.getActiveClients();

    res.render('shipments/edit', {
      title: `Editar Envío ${shipment.codigoEnvio} - Courier Pro`,
      clients: activeClients,
      districts: LIMA_CALLAO_DISTRICTS,
      shipment,
      errors: []
    });
  }

  update(req, res) {
    const id = parseInt(req.params.id, 10);
    const dto = ShipmentDTO.fromRequest(req.body, req.session.user);
    const result = shipmentService.updateShipment(id, dto);

    if (!result.success) {
      const currentShipment = shipmentService.getShipmentById(id);
      const activeClients = clientService.getActiveClients();

      return res.render('shipments/edit', {
        title: `Editar Envío ${currentShipment ? currentShipment.codigoEnvio : ''} - Courier Pro`,
        shipment: { ...req.body, id, codigoEnvio: currentShipment ? currentShipment.codigoEnvio : '' },
        clients: activeClients,
        errors: result.errors
      });
    }

    req.session.flashSuccess = `Envío ${result.shipment.codigoEnvio} actualizado correctamente.`;
    return res.redirect('/envios');
  }

  show(req, res) {
    const id = parseInt(req.params.id, 10);
    const shipment = shipmentService.getShipmentById(id);

    if (!shipment) {
      req.session.flashError = 'El envío solicitado no existe.';
      return res.redirect('/envios');
    }

    res.render('shipments/show', {
      title: `Detalle del Envío ${shipment.codigoEnvio} - Courier Pro`,
      shipment
    });
  }

  updateStatus(req, res) {
    const id = parseInt(req.params.id, 10);
    const { estado, fechaEntrega } = req.body;
    const result = shipmentService.updateShipmentStatus(id, estado, req.session.user, fechaEntrega);

    if (!result.success) {
      req.session.flashError = result.message;
    } else {
      req.session.flashSuccess = `El estado del envío ${result.shipment.codigoEnvio} fue cambiado a "${result.shipment.estado}".`;
    }

    res.redirect(req.get('Referrer') || '/envios');
  }

  showBatchCreateForm(req, res) {
    const activeClients = clientService.getActiveClients();
    const today = new Date().toISOString().split('T')[0];
    const preselectedClientId = req.query.clienteId ? parseInt(req.query.clienteId, 10) : '';

    // Iniciar con 5 filas por defecto
    const initialRows = Array.from({ length: 5 }, () => ({
      tipoServicio: 'Estándar',
      destinatarioNombre: '',
      destinatarioDocumento: '',
      destinatarioTelefono: '',
      destinatarioCorreo: '',
      direccion: '',
      referencia: '',
      distrito: 'San Isidro',
      provincia: 'Lima',
      departamento: 'Lima',
      cantidadPaquetes: 1,
      peso: 1.0,
      descripcion: '',
      observaciones: '',
      estado: 'Registrado'
    }));

    res.render('shipments/batch_create', {
      title: 'Registro Masivo de Envíos en Tabla - Courier Pro',
      clients: activeClients,
      districts: LIMA_CALLAO_DISTRICTS,
      today,
      selectedClientId: preselectedClientId,
      batchDate: today,
      rows: initialRows,
      errors: []
    });
  }

  createBatch(req, res) {
    const { clienteId, fechaRegistro } = req.body;
    let items = [];

    if (req.body.items) {
      if (Array.isArray(req.body.items)) {
        items = req.body.items;
      } else if (typeof req.body.items === 'object') {
        items = Object.values(req.body.items);
      }
    }

    const result = shipmentService.createBatchShipments(
      { clienteId, fechaRegistro, items },
      req.session.user
    );

    if (!result.success) {
      const activeClients = clientService.getActiveClients();
      const today = new Date().toISOString().split('T')[0];

      return res.render('shipments/batch_create', {
        title: 'Registro Masivo de Envíos en Tabla - Courier Pro',
        clients: activeClients,
        districts: LIMA_CALLAO_DISTRICTS,
        today,
        selectedClientId: clienteId ? parseInt(clienteId, 10) : '',
        batchDate: fechaRegistro || today,
        rows: items.length > 0 ? items : Array.from({ length: 5 }, () => ({})),
        errors: result.errors
      });
    }

    req.session.flashSuccess = `¡Se registraron exitosamente ${result.count} envíos en bloque!`;
    return res.redirect('/envios');
  }

  async downloadTemplate(req, res, next) {
    try {
      const buffer = await excelExportService.generateShipmentsTemplate();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="plantilla_envios_masivos.xlsx"');
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ShipmentController();
