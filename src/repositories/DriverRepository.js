const { getDatabase } = require('../config/database');
const Driver = require('../models/Driver');

class DriverRepository {
  constructor() {
    this.db = getDatabase();
  }

  findAll({
    search = '',
    estado = '',
    page = 1,
    limit = 50
  } = {}) {
    let whereClauses = [];
    let params = {};

    if (search && search.trim() !== '') {
      whereClauses.push(`(
        d.nombre LIKE @search OR
        d.apellidos LIKE @search OR
        d.documento LIKE @search OR
        d.placa LIKE @search OR
        d.telefono LIKE @search
      )`);
      params.search = `%${search.trim()}%`;
    }

    if (estado && estado.trim() !== '') {
      whereClauses.push('d.estado = @estado');
      params.estado = estado.trim();
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Conteo total
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total
      FROM conductores d
      ${whereSQL}
    `);
    const totalRow = countStmt.get(params);
    const total = totalRow ? totalRow.total : 0;

    // Consulta con conteo de envíos asociados
    const offset = (page - 1) * limit;
    params.limit = limit;
    params.offset = offset;

    const dataStmt = this.db.prepare(`
      SELECT 
        d.*,
        COUNT(e.id) as total_envios,
        SUM(CASE WHEN e.estado NOT IN ('Entregado', 'Cancelado') THEN 1 ELSE 0 END) as envios_pendientes
      FROM conductores d
      LEFT JOIN envios e ON e.conductor_id = d.id
      ${whereSQL}
      GROUP BY d.id
      ORDER BY d.nombre ASC, d.apellidos ASC
      LIMIT @limit OFFSET @offset
    `);

    const rows = dataStmt.all(params);
    const drivers = rows.map(r => new Driver(r));

    return {
      drivers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  findAllActive() {
    const rows = this.db.prepare(`
      SELECT 
        d.*,
        COUNT(e.id) as total_envios,
        SUM(CASE WHEN e.estado NOT IN ('Entregado', 'Cancelado') THEN 1 ELSE 0 END) as envios_pendientes
      FROM conductores d
      LEFT JOIN envios e ON e.conductor_id = d.id
      WHERE d.estado != 'No disponible'
      GROUP BY d.id
      ORDER BY d.nombre ASC, d.apellidos ASC
    `).all();

    return rows.map(r => new Driver(r));
  }

  findById(id) {
    const row = this.db.prepare(`
      SELECT 
        d.*,
        COUNT(e.id) as total_envios,
        SUM(CASE WHEN e.estado NOT IN ('Entregado', 'Cancelado') THEN 1 ELSE 0 END) as envios_pendientes
      FROM conductores d
      LEFT JOIN envios e ON e.conductor_id = d.id
      WHERE d.id = ?
      GROUP BY d.id
    `).get(id);

    return row ? new Driver(row) : null;
  }

  findByDocumento(documento) {
    const row = this.db.prepare(`
      SELECT * FROM conductores WHERE documento = ?
    `).get(documento);

    return row ? new Driver(row) : null;
  }

  create(driverData) {
    const stmt = this.db.prepare(`
      INSERT INTO conductores (
        nombre, apellidos, documento, telefono,
        vehiculo, placa, capacidad, estado, creado_por
      ) VALUES (
        @nombre, @apellidos, @documento, @telefono,
        @vehiculo, @placa, @capacidad, @estado, @creadoPor
      )
    `);

    const result = stmt.run({
      nombre: driverData.nombre.trim(),
      apellidos: (driverData.apellidos || '').trim(),
      documento: driverData.documento.trim(),
      telefono: (driverData.telefono || '').trim(),
      vehiculo: driverData.vehiculo || 'Moto',
      placa: (driverData.placa || '').trim().toUpperCase(),
      capacidad: parseFloat(driverData.capacidad || 0),
      estado: driverData.estado || 'Disponible',
      creadoPor: driverData.creadoPor || 'Sistema'
    });

    return this.findById(result.lastInsertRowid);
  }

  update(id, driverData) {
    const stmt = this.db.prepare(`
      UPDATE conductores
      SET nombre = @nombre,
          apellidos = @apellidos,
          documento = @documento,
          telefono = @telefono,
          vehiculo = @vehiculo,
          placa = @placa,
          capacidad = @capacidad,
          estado = @estado,
          fecha_modificacion = DATETIME('now', 'localtime'),
          modificado_por = @modificadoPor
      WHERE id = @id
    `);

    stmt.run({
      id,
      nombre: driverData.nombre.trim(),
      apellidos: (driverData.apellidos || '').trim(),
      documento: driverData.documento.trim(),
      telefono: (driverData.telefono || '').trim(),
      vehiculo: driverData.vehiculo || 'Moto',
      placa: (driverData.placa || '').trim().toUpperCase(),
      capacidad: parseFloat(driverData.capacidad || 0),
      estado: driverData.estado || 'Disponible',
      modificadoPor: driverData.modificadoPor || 'Sistema'
    });

    return this.findById(id);
  }

  updateStatus(id, newStatus, modificadoPor = 'Sistema') {
    const stmt = this.db.prepare(`
      UPDATE conductores
      SET estado = @estado,
          fecha_modificacion = DATETIME('now', 'localtime'),
          modificado_por = @modificadoPor
      WHERE id = @id
    `);

    stmt.run({
      id,
      estado: newStatus,
      modificadoPor
    });

    return this.findById(id);
  }

  delete(id) {
    // Desasignar primero los envíos que tuviese
    this.db.prepare(`
      UPDATE envios 
      SET conductor_id = NULL,
          estado = CASE WHEN estado = 'Asignado' THEN 'Registrado' ELSE estado END
      WHERE conductor_id = ?
    `).run(id);

    const stmt = this.db.prepare(`DELETE FROM conductores WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }
}

module.exports = new DriverRepository();
