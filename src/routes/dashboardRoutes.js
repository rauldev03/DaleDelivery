const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/DashboardController');
const { requireAuth } = require('../middlewares/authMiddleware');

router.get('/dashboard', requireAuth, (req, res) => dashboardController.index(req, res));

module.exports = router;
