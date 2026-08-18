const { getDatabase } = require('../config/database');
const Shipment = require('../models/Shipment');

class DashboardService {
  constructor() {
    this.db = getDatabase();
  }

  getDashboardMetrics(dateStr = null) {
    const selectedDate = dateStr || new Date().toISOString().split('T')[0];

    // 1. Total clientes activos en el sistema
    const totalClientsRow = this.db.prepare("SELECT COUNT(*) as total FROM clientes WHERE estado = 'Activo'").get();
    const totalClients = totalClientsRow ? totalClientsRow.total : 0;

    // 2. Conteo global de envíos de la fecha seleccionada por estado
    const statsRow = this.db.prepare(`
      SELECT 
        COUNT(*) as totalEnvios,
        SUM(CASE WHEN estado = 'Registrado' THEN 1 ELSE 0 END) as registrados,
        SUM(CASE WHEN estado = 'En proceso' THEN 1 ELSE 0 END) as enProceso,
        SUM(CASE WHEN estado = 'Entregado' THEN 1 ELSE 0 END) as entregados,
        SUM(CASE WHEN estado = 'Cancelado' THEN 1 ELSE 0 END) as cancelados
      FROM envios
      WHERE fecha_registro = ?
    `).get(selectedDate);

    // 3. Desglose y conteo de envíos por Empresa / Cliente para la fecha de registro seleccionada
    const companyStatsRows = this.db.prepare(`
      SELECT 
        c.id as clienteId,
        c.codigo_cliente as clienteCodigo,
        c.razon_social_nombre as clienteNombre,
        c.numero_documento as clienteDocumento,
        c.telefono as clienteTelefono,
        COUNT(e.id) as totalEnvios,
        COALESCE(SUM(CASE WHEN e.estado = 'Registrado' THEN 1 ELSE 0 END), 0) as registrados,
        COALESCE(SUM(CASE WHEN e.estado = 'En proceso' THEN 1 ELSE 0 END), 0) as enProceso,
        COALESCE(SUM(CASE WHEN e.estado = 'Entregado' THEN 1 ELSE 0 END), 0) as entregados,
        COALESCE(SUM(CASE WHEN e.estado = 'Cancelado' THEN 1 ELSE 0 END), 0) as cancelados,
        COALESCE(SUM(e.cantidad_paquetes), 0) as totalPaquetes
      FROM envios e
      JOIN clientes c ON e.cliente_id = c.id
      WHERE e.fecha_registro = ?
      GROUP BY c.id, c.codigo_cliente, c.razon_social_nombre, c.numero_documento, c.telefono
      ORDER BY totalEnvios DESC, c.razon_social_nombre ASC
    `).all(selectedDate);

    const companyMetrics = companyStatsRows.map(row => {
      const pct = row.totalEnvios > 0 ? Math.round((row.entregados / row.totalEnvios) * 100) : 0;
      return {
        ...row,
        porcentajeEntrega: pct
      };
    });

    return {
      today: selectedDate,
      selectedDate,
      totalClients,
      totalEnvios: statsRow ? statsRow.totalEnvios : 0,
      registrados: statsRow ? (statsRow.registrados || 0) : 0,
      enProceso: statsRow ? (statsRow.enProceso || 0) : 0,
      entregados: statsRow ? (statsRow.entregados || 0) : 0,
      cancelados: statsRow ? (statsRow.cancelados || 0) : 0,
      companyMetrics
    };
  }
}

module.exports = new DashboardService();
