const { getDatabase } = require('../config/database');
const Shipment = require('../models/Shipment');

class ReportService {
  constructor() {
    this.db = getDatabase();
  }

  getDailyReport({ fecha = null, clienteId = '', estado = '', distrito = '' }) {
    const selectedDate = fecha || new Date().toISOString().split('T')[0];

    let whereClauses = ['e.fecha_registro = @fecha'];
    let params = { fecha: selectedDate };

    if (clienteId && String(clienteId).trim() !== '') {
      whereClauses.push('e.cliente_id = @clienteId');
      params.clienteId = parseInt(clienteId, 10);
    }

    if (estado && estado.trim() !== '') {
      whereClauses.push('e.estado = @estado');
      params.estado = estado.trim();
    }

    if (distrito && distrito.trim() !== '') {
      whereClauses.push('e.distrito LIKE @distrito');
      params.distrito = `%${distrito.trim()}%`;
    }

    const whereSQL = `WHERE ${whereClauses.join(' AND ')}`;

    // 1. Resumen del Día (KPIs agregados)
    const summaryStmt = this.db.prepare(`
      SELECT 
        COUNT(e.id) as totalEnvios,
        COUNT(DISTINCT e.cliente_id) as totalClientes,
        COALESCE(SUM(e.cantidad_paquetes), 0) as totalPaquetes,
        COALESCE(SUM(CASE WHEN e.estado = 'Entregado' THEN 1 ELSE 0 END), 0) as totalEntregados,
        COALESCE(SUM(CASE WHEN e.estado IN ('Registrado', 'En proceso') THEN 1 ELSE 0 END), 0) as totalPendientes,
        COALESCE(SUM(CASE WHEN e.estado = 'Cancelado' THEN 1 ELSE 0 END), 0) as totalCancelados
      FROM envios e
      JOIN clientes c ON e.cliente_id = c.id
      ${whereSQL}
    `);

    const summary = summaryStmt.get(params) || {
      totalEnvios: 0,
      totalClientes: 0,
      totalPaquetes: 0,
      totalEntregados: 0,
      totalPendientes: 0,
      totalCancelados: 0
    };

    // 2. Detalle completo de envíos
    const dataStmt = this.db.prepare(`
      SELECT 
        e.*,
        c.codigo_cliente as cliente_codigo,
        c.razon_social_nombre as cliente_nombre,
        c.numero_documento as cliente_documento
      FROM envios e
      JOIN clientes c ON e.cliente_id = c.id
      ${whereSQL}
      ORDER BY e.id ASC
    `);

    const rows = dataStmt.all(params);
    const shipments = rows.map(r => new Shipment(r));

    return {
      fecha: selectedDate,
      summary,
      shipments,
      filters: {
        fecha: selectedDate,
        clienteId,
        estado,
        distrito
      }
    };
  }
}

module.exports = new ReportService();
