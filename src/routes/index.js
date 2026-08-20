const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const clientRoutes = require('./clientRoutes');
const shipmentRoutes = require('./shipmentRoutes');
const reportRoutes = require('./reportRoutes');
const mapRoutes = require('./mapRoutes');

// Redirección raíz
router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.redirect('/login');
});

router.use('/', authRoutes);
router.use('/', dashboardRoutes);
router.use('/', clientRoutes);
router.use('/', shipmentRoutes);
router.use('/', reportRoutes);
router.use('/', mapRoutes);

module.exports = router;
