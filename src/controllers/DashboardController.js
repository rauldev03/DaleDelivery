const dashboardService = require('../services/DashboardService');

class DashboardController {
  index(req, res) {
    const today = new Date().toISOString().split('T')[0];
    const fecha = req.query.fecha || today;
    const metrics = dashboardService.getDashboardMetrics(fecha);

    res.render('dashboard/index', {
      title: 'Dashboard Operativo - Dale Delivery',
      metrics
    });
  }
}

module.exports = new DashboardController();
