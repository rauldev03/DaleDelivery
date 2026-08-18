const express = require('express');
const router = express.Router();
const reportController = require('../controllers/ReportController');
const { requireAuth } = require('../middlewares/authMiddleware');

// Proteger todas las rutas de reportes
router.use(requireAuth);

router.get('/reportes/diario', (req, res) => reportController.showDailyReport(req, res));
router.get('/reportes/diario/excel', (req, res, next) => reportController.exportDailyReportExcel(req, res, next));

module.exports = router;
