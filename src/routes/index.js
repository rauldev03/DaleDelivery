const express = require('express');
const router = express.Router();

const landingRoutes = require('./landingRoutes');
const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const clientRoutes = require('./clientRoutes');
const shipmentRoutes = require('./shipmentRoutes');
const reportRoutes = require('./reportRoutes');
const mapRoutes = require('./mapRoutes');
const routeOptimizationRoutes = require('./routeOptimizationRoutes');

// Rutas públicas y privadas del sistema
router.use('/', landingRoutes);

router.use('/', authRoutes);
router.use('/', dashboardRoutes);
router.use('/', clientRoutes);
router.use('/', shipmentRoutes);
router.use('/', reportRoutes);
router.use('/', mapRoutes);
router.use('/', routeOptimizationRoutes);

module.exports = router;
