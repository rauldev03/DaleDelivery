const express = require('express');
const router = express.Router();
const shipmentController = require('../controllers/ShipmentController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Todas las rutas de envíos requieren sesión activa
router.use(requireAuth);

router.get('/envios', (req, res) => shipmentController.index(req, res));
router.get('/envios/nuevo', (req, res) => shipmentController.showCreateForm(req, res));
router.post('/envios/nuevo', (req, res) => shipmentController.create(req, res));
router.get('/envios/masivo', (req, res) => shipmentController.showBatchCreateForm(req, res));
router.post('/envios/masivo', (req, res) => shipmentController.createBatch(req, res));
router.get('/envios/plantilla-excel', (req, res, next) => shipmentController.downloadTemplate(req, res, next));
router.get('/envios/:id/editar', (req, res) => shipmentController.showEditForm(req, res));
router.post('/envios/:id/editar', (req, res) => shipmentController.update(req, res));
router.get('/envios/:id', (req, res) => shipmentController.show(req, res));
router.post('/envios/:id/estado', (req, res) => shipmentController.updateStatus(req, res));

module.exports = router;
