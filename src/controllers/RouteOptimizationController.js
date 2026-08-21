const driverService = require('../services/DriverService');
const shipmentRepository = require('../repositories/ShipmentRepository');
const shipmentService = require('../services/ShipmentService');
const clientService = require('../services/ClientService');
const routeOptimizationService = require('../services/RouteOptimizationService');
const geoService = require('../services/geoService');
const config = require('../config/app');
const { LIMA_CALLAO_DISTRICTS } = require('../config/districts');

class RouteOptimizationController {
  async index(req, res) {
    try {
      const drivers = driverService.getActiveDrivers();
      const clients = clientService.getActiveClients();
      const unassignedShipments = shipmentRepository.findUnassigned({ limit: 100 });

      // Obtener envíos para la tabla inicial y mapa
      const allShipmentsResult = shipmentRepository.findAll({ limit: 200, page: 1 });
      const shipments = allShipmentsResult.shipments || [];

      res.render('routes/index', {
        title: 'Optimización de Rutas - Dale Delivery',
        currentPath: '/rutas',
        user: req.session.user,
        drivers,
        clients,
        unassignedShipments,
        shipments,
        districts: LIMA_CALLAO_DISTRICTS,
        googleMapsApiKey: config.googleMapsApiKey || ''
      });
    } catch (error) {
      console.error('Error al cargar la vista de optimización de rutas:', error);
      res.status(500).render('errors/500', {
        title: 'Error del Servidor',
        error: error.message,
        currentPath: '/rutas',
        user: req.session.user
      });
    }
  }

  // --- API: CONDUCTORES ---

  async listDrivers(req, res) {
    try {
      const drivers = driverService.getActiveDrivers();
      const driversWithShipments = drivers.map(driver => {
        const shipments = shipmentRepository.findByConductor(driver.id, true);
        return {
          ...driver,
          shipments
        };
      });

      return res.json({ success: true, drivers: driversWithShipments });
    } catch (error) {
      console.error('Error al listar conductores:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async createDriver(req, res) {
    try {
      const result = driverService.createDriver(req.body, req.session.user);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json({ success: true, driver: result.driver });
    } catch (error) {
      console.error('Error en createDriver:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateDriver(req, res) {
    try {
      const { id } = req.params;
      const result = driverService.updateDriver(id, req.body, req.session.user);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json({ success: true, driver: result.driver });
    } catch (error) {
      console.error('Error en updateDriver:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async deleteDriver(req, res) {
    try {
      const { id } = req.params;
      const result = driverService.deleteDriver(id);
      return res.json(result);
    } catch (error) {
      console.error('Error en deleteDriver:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // --- API: ENVÍOS ---

  async listShipments(req, res) {
    try {
      const { search, conductorId, estado, prioridad, limit = 200 } = req.query;
      const result = shipmentRepository.findAll({
        search,
        conductorId,
        estado,
        prioridad,
        limit: parseInt(limit, 10),
        page: 1
      });
      return res.json({ success: true, shipments: result.shipments, total: result.total });
    } catch (error) {
      console.error('Error al listar envíos:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async createShipment(req, res) {
    try {
      const data = { ...req.body };
      const dateStr = data.fechaRegistro || new Date().toISOString().split('T')[0];
      const codigoEnvio = shipmentRepository.getNextShipmentCode(dateStr);

      // Si no vienen lat/lng pero viene plusCode o linkGoogleMaps, intentar resolver coordenadas
      if ((!data.latitud || !data.longitud) && (data.plusCode || data.linkGoogleMaps)) {
        const input = data.plusCode || data.linkGoogleMaps;
        const resolved = await geoService.parseLocationInput(input);
        if (resolved.success) {
          data.latitud = resolved.lat;
          data.longitud = resolved.lng;
          if (resolved.plusCode && !data.plusCode) data.plusCode = resolved.plusCode;
        }
      }

      const shipment = shipmentRepository.create({
        ...data,
        codigoEnvio,
        creadoPor: req.session.user ? req.session.user.nombre : 'Sistema'
      });

      return res.json({ success: true, shipment });
    } catch (error) {
      console.error('Error en createShipment:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // --- API: ASIGNACIONES ---

  async assignShipment(req, res) {
    try {
      const { shipmentId, driverId } = req.body;
      if (!shipmentId || !driverId) {
        return res.status(400).json({ success: false, message: 'ID de envío y conductor son obligatorios.' });
      }

      const result = shipmentService.assignShipmentToDriver(shipmentId, driverId, req.session.user);
      return res.json(result);
    } catch (error) {
      console.error('Error en assignShipment:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async unassignShipment(req, res) {
    try {
      const { shipmentId } = req.body;
      if (!shipmentId) {
        return res.status(400).json({ success: false, message: 'ID de envío es obligatorio.' });
      }

      const result = shipmentService.unassignShipmentFromDriver(shipmentId, req.session.user);
      return res.json(result);
    } catch (error) {
      console.error('Error en unassignShipment:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async updateCoordinates(req, res) {
    try {
      const { shipmentId, lat, lng } = req.body;
      if (!shipmentId || lat === undefined || lng === undefined) {
        return res.status(400).json({ success: false, message: 'Datos incompletos para actualizar coordenadas.' });
      }

      const result = shipmentService.updateCoordinates(shipmentId, lat, lng, req.session.user);
      return res.json(result);
    } catch (error) {
      console.error('Error en updateCoordinates:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // --- API: OPTIMIZACIÓN DE RUTAS ---

  async optimize(req, res) {
    try {
      const { driverId, origin } = req.body;
      const result = await routeOptimizationService.optimizeRoutes({
        driverId: driverId ? parseInt(driverId, 10) : null,
        origin: origin || undefined,
        currentUser: req.session.user
      });

      return res.json(result);
    } catch (error) {
      console.error('Error en optimización de rutas:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new RouteOptimizationController();
