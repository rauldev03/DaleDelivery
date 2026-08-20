const shipmentRepository = require('../repositories/shipmentRepository');
const clientRepository = require('../repositories/clientRepository');
const geoService = require('../services/geoService');
const config = require('../config/app');

class MapController {
  async index(req, res) {
    try {
      // Obtener envíos recientes con información de geolocalización
      const result = shipmentRepository.findAll({
        limit: 100,
        page: 1
      });

      const clientsResult = clientRepository.findAll({ limit: 200 });
      const clients = clientsResult.clients || [];

      // Filtrar envíos que tengan datos de ubicación
      const shipments = result.shipments.map(s => ({
        id: s.id,
        codigoEnvio: s.codigoEnvio,
        clienteNombre: s.clienteNombre,
        destinatarioNombre: s.destinatarioNombre,
        destinatarioTelefono: s.destinatarioTelefono,
        direccion: s.direccion,
        distrito: s.distrito,
        linkGoogleMaps: s.linkGoogleMaps,
        plusCode: s.plusCode,
        estado: s.estado,
        fechaRegistro: s.fechaRegistro
      }));

      res.render('map/index', {
        title: 'Visor de Mapa y Localizador - Dale Delivery',
        currentPath: '/mapa',
        user: req.session.user,
        shipments,
        clients,
        googleMapsApiKey: config.googleMapsApiKey,
        initialQuery: req.query.q || ''
      });
    } catch (error) {
      console.error('Error al cargar la vista de mapa:', error);
      res.status(500).render('errors/500', {
        title: 'Error del Servidor',
        error: error.message,
        currentPath: '/mapa',
        user: req.session.user
      });
    }
  }

  async resolveLocation(req, res) {
    try {
      const { input, refLat, refLng } = req.body;
      if (!input || !input.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Debe proporcionar un código Plus, link de Google Maps o coordenadas.'
        });
      }

      const result = await geoService.parseLocationInput(
        input,
        refLat ? parseFloat(refLat) : undefined,
        refLng ? parseFloat(refLng) : undefined
      );

      return res.json(result);
    } catch (error) {
      console.error('Error en resolveLocation:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al procesar la ubicación: ' + error.message
      });
    }
  }
}

module.exports = new MapController();
