const express = require('express');
const router = express.Router();
const routeOptimizationController = require('../controllers/RouteOptimizationController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Proteger todas las rutas del módulo con autenticación
router.use(requireAuth);

// Vista Principal del Módulo
router.get('/rutas', (req, res) => routeOptimizationController.index(req, res));

// Endpoints API: Conductores
router.get('/api/rutas/conductores', (req, res) => routeOptimizationController.listDrivers(req, res));
router.post('/api/rutas/conductores', (req, res) => routeOptimizationController.createDriver(req, res));
router.put('/api/rutas/conductores/:id', (req, res) => routeOptimizationController.updateDriver(req, res));
router.delete('/api/rutas/conductores/:id', (req, res) => routeOptimizationController.deleteDriver(req, res));

// Endpoints API: Envíos
router.get('/api/rutas/envios', (req, res) => routeOptimizationController.listShipments(req, res));
router.post('/api/rutas/envios', (req, res) => routeOptimizationController.createShipment(req, res));
router.post('/api/rutas/coordenadas', (req, res) => routeOptimizationController.updateCoordinates(req, res));

// Endpoints API: Asignaciones
router.post('/api/rutas/asignar', (req, res) => routeOptimizationController.assignShipment(req, res));
router.post('/api/rutas/desasignar', (req, res) => routeOptimizationController.unassignShipment(req, res));

// Endpoints API: Optimización de Rutas
router.post('/api/rutas/optimizar', (req, res) => routeOptimizationController.optimize(req, res));

module.exports = router;
