const express = require('express');
const router = express.Router();
const clientController = require('../controllers/ClientController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Todas las rutas de clientes requieren sesión administrativa
router.use(requireAuth);

router.get('/clientes', (req, res) => clientController.index(req, res));
router.get('/clientes/nuevo', (req, res) => clientController.showCreateForm(req, res));
router.post('/clientes/nuevo', (req, res) => clientController.create(req, res));
router.get('/clientes/:id/editar', (req, res) => clientController.showEditForm(req, res));
router.post('/clientes/:id/editar', (req, res) => clientController.update(req, res));
router.get('/clientes/:id', (req, res) => clientController.show(req, res));
router.post('/clientes/:id/estado', (req, res) => clientController.toggleStatus(req, res));

module.exports = router;
