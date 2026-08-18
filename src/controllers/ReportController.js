const reportService = require('../services/ReportService');
const clientService = require('../services/ClientService');
const excelExportService = require('../services/ExcelExportService');

class ReportController {
  showDailyReport(req, res) {
    const today = new Date().toISOString().split('T')[0];
    const fecha = req.query.fecha || today;
    const clienteId = req.query.clienteId || '';
    const estado = req.query.estado || '';
    const distrito = req.query.distrito || '';

    const reportData = reportService.getDailyReport({
      fecha,
      clienteId,
      estado,
      distrito
    });

    const activeClients = clientService.getActiveClients();

    res.render('reports/daily', {
      title: `Reporte Diario de Envíos (${fecha}) - Courier Pro`,
      reportData,
      clients: activeClients
    });
  }

  async exportDailyReportExcel(req, res, next) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const fecha = req.query.fecha || today;
      const clienteId = req.query.clienteId || '';
      const estado = req.query.estado || '';
      const distrito = req.query.distrito || '';

      const reportData = reportService.getDailyReport({
        fecha,
        clienteId,
        estado,
        distrito
      });

      const buffer = await excelExportService.generateDailyReportExcel(reportData, req.session.user);
      const filename = `Reporte_Courier_${fecha}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);

      return res.send(buffer);
    } catch (error) {
      console.error('Error al exportar reporte Excel:', error);
      next(error);
    }
  }
}

module.exports = new ReportController();
