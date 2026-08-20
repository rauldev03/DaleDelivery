const express = require('express');
const router = express.Router();
const mapController = require('../controllers/mapController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Proteger todas las rutas con autenticación
router.use(requireAuth);

router.get('/mapa', (req, res) => mapController.index(req, res));
router.post('/api/map/resolve', (req, res) => mapController.resolveLocation(req, res));

module.exports = router;
