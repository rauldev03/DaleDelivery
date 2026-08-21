const { getDatabase } = require('../config/database');
const Shipment = require('../models/Shipment');

class ShipmentRepository {
  constructor() {
    this.db = getDatabase();
  }

  getNextShipmentCode(dateStr = null) {
    const today = dateStr || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const dateFormatted = today.replace(/-/g, ''); // YYYYMMDD
    const prefix = `ENV-${dateFormatted}-`;

    const row = this.db.prepare(`
      SELECT codigo_envio 
      FROM envios 
      WHERE codigo_envio LIKE ? 
      ORDER BY id DESC 
      LIMIT 1
    `).get(`${prefix}%`);

    if (!row || !row.codigo_envio) {
      return `${prefix}00001`;
    }

    const parts = row.codigo_envio.split('-');
    const lastSeq = parseInt(parts[2], 10) || 0;
    const nextSeq = lastSeq + 1;

    return `${prefix}${String(nextSeq).padStart(5, '0')}`;
  }

  findAll({
    search = '',
    fecha = '',
    fechaRegistro = '',
    fechaEntrega = '',
    clienteId = '',
    conductorId = '',
    codigo = '',
    distrito = '',
    estado = '',
    prioridad = '',
    page = 1,
    limit = 10
  }) {
    let whereClauses = [];
    let params = {};

    if (search && search.trim() !== '') {
      whereClauses.push(`(
        e.codigo_envio LIKE @search OR
        e.destinatario_nombre LIKE @search OR
        e.destinatario_telefono LIKE @search OR
        e.direccion LIKE @search OR
        e.distrito LIKE @search OR
        c.codigo_cliente LIKE @search OR
        c.razon_social_nombre LIKE @search OR
        d.nombre LIKE @search OR
        d.apellidos LIKE @search
      )`);
      params.search = `%${search.trim()}%`;
    }

    // Filtro por Fecha de Registro
    const fRegistro = (fechaRegistro && fechaRegistro.trim() !== '') ? fechaRegistro.trim() : (fecha && fecha.trim() !== '' ? fecha.trim() : '');
    if (fRegistro) {
      whereClauses.push('e.fecha_registro = @fechaRegistro');
      params.fechaRegistro = fRegistro;
    }

    // Filtro por Fecha de Entrega
    if (fechaEntrega && fechaEntrega.trim() !== '') {
      whereClauses.push('e.fecha_entrega = @fechaEntrega');
      params.fechaEntrega = fechaEntrega.trim();
    }

    if (clienteId && String(clienteId).trim() !== '') {
      whereClauses.push('e.cliente_id = @clienteId');
      params.clienteId = parseInt(clienteId, 10);
    }

    if (conductorId !== undefined && conductorId !== null && String(conductorId).trim() !== '') {
      if (conductorId === 'unassigned' || conductorId === '0') {
        whereClauses.push('e.conductor_id IS NULL');
      } else {
        whereClauses.push('e.conductor_id = @conductorId');
        params.conductorId = parseInt(conductorId, 10);
      }
    }

    if (codigo && codigo.trim() !== '') {
      whereClauses.push('e.codigo_envio LIKE @codigo');
      params.codigo = `%${codigo.trim()}%`;
    }

    if (distrito && distrito.trim() !== '') {
      whereClauses.push('e.distrito LIKE @distrito');
      params.distrito = `%${distrito.trim()}%`;
    }

    if (estado && estado.trim() !== '') {
      whereClauses.push('e.estado = @estado');
      params.estado = estado.trim();
    }

    if (prioridad && prioridad.trim() !== '') {
      whereClauses.push('e.prioridad = @prioridad');
      params.prioridad = prioridad.trim();
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Conteo total para paginación
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as total 
      FROM envios e
      JOIN clientes c ON e.cliente_id = c.id
      LEFT JOIN conductores d ON e.conductor_id = d.id
      ${whereSQL}
    `);
    const totalRow = countStmt.get(params);
    const total = totalRow ? totalRow.total : 0;

    // Consulta paginada con JOIN
    const offset = (page - 1) * limit;
    params.limit = limit;
    params.offset = offset;

    const dataStmt = this.db.prepare(`
      SELECT 
        e.*,
        c.codigo_cliente as cliente_codigo,
        c.razon_social_nombre as cliente_nombre,
        c.numero_documento as cliente_documento,
        d.nombre as conductor_nom,
        d.apellidos as conductor_ape,
        (d.nombre || ' ' || d.apellidos) as conductor_nombre,
        d.vehiculo as conductor_vehiculo,
        d.placa as conductor_placa,
        d.telefono as conductor_telefono
      FROM envios e
      JOIN clientes c ON e.cliente_id = c.id
      LEFT JOIN conductores d ON e.conductor_id = d.id
      ${whereSQL}
      ORDER BY e.id DESC 
      LIMIT @limit OFFSET @offset
    `);

    const rows = dataStmt.all(params);
    const shipments = rows.map(r => new Shipment(r));

    return {
      shipments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  findById(id) {
    const row = this.db.prepare(`
      SELECT 
        e.*,
        c.codigo_cliente as cliente_codigo,
        c.razon_social_nombre as cliente_nombre,
        c.numero_documento as cliente_documento,
        d.nombre as conductor_nom,
        d.apellidos as conductor_ape,
        (d.nombre || ' ' || d.apellidos) as conductor_nombre,
        d.vehiculo as conductor_vehiculo,
        d.placa as conductor_placa,
        d.telefono as conductor_telefono
      FROM envios e
      JOIN clientes c ON e.cliente_id = c.id
      LEFT JOIN conductores d ON e.conductor_id = d.id
      WHERE e.id = ?
    `).get(id);

    return row ? new Shipment(row) : null;
  }

  findByCodigo(codigoEnvio) {
    const row = this.db.prepare(`
      SELECT 
        e.*,
        c.codigo_cliente as cliente_codigo,
        c.razon_social_nombre as cliente_nombre,
        c.numero_documento as cliente_documento,
        d.nombre as conductor_nom,
        d.apellidos as conductor_ape,
        (d.nombre || ' ' || d.apellidos) as conductor_nombre,
        d.vehiculo as conductor_vehiculo,
        d.placa as conductor_placa,
        d.telefono as conductor_telefono
      FROM envios e
      JOIN clientes c ON e.cliente_id = c.id
      LEFT JOIN conductores d ON e.conductor_id = d.id
      WHERE e.codigo_envio = ?
    `).get(codigoEnvio);

    return row ? new Shipment(row) : null;
  }

  findByConductor(conductorId, onlyActive = false) {
    let query = `
      SELECT 
        e.*,
        c.codigo_cliente as cliente_codigo,
        c.razon_social_nombre as cliente_nombre,
        c.numero_documento as cliente_documento,
        d.nombre as conductor_nom,
        d.apellidos as conductor_ape,
        (d.nombre || ' ' || d.apellidos) as conductor_nombre,
        d.vehiculo as conductor_vehiculo,
        d.placa as conductor_placa,
        d.telefono as conductor_telefono
      FROM envios e
      JOIN clientes c ON e.cliente_id = c.id
      LEFT JOIN conductores d ON e.conductor_id = d.id
      WHERE e.conductor_id = ?
    `;

    if (onlyActive) {
      query += ` AND e.estado NOT IN ('Entregado', 'Cancelado')`;
    }

    query += ` ORDER BY CASE WHEN e.orden_ruta > 0 THEN e.orden_ruta ELSE 999999 END ASC, e.id ASC`;

    const rows = this.db.prepare(query).all(conductorId);
    return rows.map(r => new Shipment(r));
  }

  findUnassigned({ limit = 100 } = {}) {
    const rows = this.db.prepare(`
      SELECT 
        e.*,
        c.codigo_cliente as cliente_codigo,
        c.razon_social_nombre as cliente_nombre,
        c.numero_documento as cliente_documento
      FROM envios e
      JOIN clientes c ON e.cliente_id = c.id
      WHERE e.conductor_id IS NULL AND e.estado NOT IN ('Entregado', 'Cancelado')
      ORDER BY 
        CASE e.prioridad 
          WHEN 'Alta' THEN 1 
          WHEN 'Normal' THEN 2 
          WHEN 'Baja' THEN 3 
          ELSE 4 
        END ASC,
        e.id DESC
      LIMIT ?
    `).all(limit);

    return rows.map(r => new Shipment(r));
  }

  create(shipmentData) {
    const stmt = this.db.prepare(`
      INSERT INTO envios (
        codigo_envio, cliente_id, conductor_id, fecha_registro, fecha_entrega, tipo_servicio,
        destinatario_nombre, destinatario_documento, destinatario_telefono, destinatario_correo,
        direccion, referencia, distrito, provincia, departamento,
        link_google_maps, plus_code, latitud, longitud,
        cantidad_paquetes, peso, prioridad, orden_ruta, descripcion, observaciones, estado, creado_por
      ) VALUES (
        @codigoEnvio, @clienteId, @conductorId, @fechaRegistro, @fechaEntrega, @tipoServicio,
        @destinatarioNombre, @destinatarioDocumento, @destinatarioTelefono, @destinatarioCorreo,
        @direccion, @referencia, @distrito, @provincia, @departamento,
        @linkGoogleMaps, @plusCode, @latitud, @longitud,
        @cantidadPaquetes, @peso, @prioridad, @ordenRuta, @descripcion, @observaciones, @estado, @creadoPor
      )
    `);

    let fechaEntrega = shipmentData.fechaEntrega || null;
    if (shipmentData.estado === 'Entregado' && !fechaEntrega) {
      fechaEntrega = shipmentData.fechaRegistro || new Date().toISOString().split('T')[0];
    }

    const conductorId = shipmentData.conductorId ? parseInt(shipmentData.conductorId, 10) : null;
    let initialStatus = shipmentData.estado || (conductorId ? 'En proceso' : 'Registrado');
    if (initialStatus === 'Asignado') initialStatus = 'En proceso';

    let lat = shipmentData.latitud !== undefined && shipmentData.latitud !== null && shipmentData.latitud !== '' ? parseFloat(shipmentData.latitud) : null;
    let lng = shipmentData.longitud !== undefined && shipmentData.longitud !== null && shipmentData.longitud !== '' ? parseFloat(shipmentData.longitud) : null;

    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      const { getDistrictCoordinates } = require('../config/districts');
      const coords = getDistrictCoordinates(shipmentData.distrito || 'Cercado de Lima', true);
      lat = coords.lat;
      lng = coords.lng;
    }

    const result = stmt.run({
      codigoEnvio: shipmentData.codigoEnvio,
      clienteId: shipmentData.clienteId,
      conductorId,
      fechaRegistro: shipmentData.fechaRegistro,
      fechaEntrega,
      tipoServicio: shipmentData.tipoServicio || 'Estándar',
      destinatarioNombre: shipmentData.destinatarioNombre,
      destinatarioDocumento: shipmentData.destinatarioDocumento || '',
      destinatarioTelefono: shipmentData.destinatarioTelefono,
      destinatarioCorreo: shipmentData.destinatarioCorreo || '',
      direccion: shipmentData.direccion,
      referencia: shipmentData.referencia || '',
      distrito: shipmentData.distrito,
      provincia: shipmentData.provincia || 'Lima',
      departamento: shipmentData.departamento || 'Lima',
      linkGoogleMaps: shipmentData.linkGoogleMaps || '',
      plusCode: shipmentData.plusCode || '',
      latitud: lat,
      longitud: lng,
      cantidadPaquetes: shipmentData.cantidadPaquetes || 1,
      peso: shipmentData.peso || 0,
      prioridad: shipmentData.prioridad || 'Normal',
      ordenRuta: shipmentData.ordenRuta || 0,
      descripcion: shipmentData.descripcion || '',
      observaciones: shipmentData.observaciones || '',
      estado: initialStatus,
      creadoPor: shipmentData.creadoPor || 'Sistema'
    });

    return this.findById(result.lastInsertRowid);
  }

  update(id, shipmentData) {
    const stmt = this.db.prepare(`
      UPDATE envios
      SET cliente_id = @clienteId,
          conductor_id = @conductorId,
          fecha_registro = @fechaRegistro,
          fecha_entrega = @fechaEntrega,
          tipo_servicio = @tipoServicio,
          destinatario_nombre = @destinatarioNombre,
          destinatario_documento = @destinatarioDocumento,
          destinatario_telefono = @destinatarioTelefono,
          destinatario_correo = @destinatarioCorreo,
          direccion = @direccion,
          referencia = @referencia,
          distrito = @distrito,
          provincia = @provincia,
          departamento = @departamento,
          link_google_maps = @linkGoogleMaps,
          plus_code = @plusCode,
          latitud = @latitud,
          longitud = @longitud,
          cantidad_paquetes = @cantidadPaquetes,
          peso = @peso,
          prioridad = @prioridad,
          orden_ruta = @ordenRuta,
          descripcion = @descripcion,
          observaciones = @observaciones,
          estado = @estado,
          fecha_modificacion = DATETIME('now', 'localtime'),
          modificado_por = @modificadoPor
      WHERE id = @id
    `);

    let fechaEntrega = shipmentData.fechaEntrega || null;
    if (shipmentData.estado === 'Entregado' && !fechaEntrega) {
      fechaEntrega = new Date().toISOString().split('T')[0];
    } else if (shipmentData.estado !== 'Entregado' && !shipmentData.fechaEntrega) {
      fechaEntrega = null;
    }

    const conductorId = shipmentData.conductorId ? parseInt(shipmentData.conductorId, 10) : null;
    let estadoToSave = shipmentData.estado || (conductorId ? 'En proceso' : 'Registrado');
    if (estadoToSave === 'Asignado') estadoToSave = 'En proceso';

    stmt.run({
      id,
      clienteId: shipmentData.clienteId,
      conductorId,
      fechaRegistro: shipmentData.fechaRegistro,
      fechaEntrega,
      tipoServicio: shipmentData.tipoServicio,
      destinatarioNombre: shipmentData.destinatarioNombre,
      destinatarioDocumento: shipmentData.destinatarioDocumento || '',
      destinatarioTelefono: shipmentData.destinatarioTelefono,
      destinatarioCorreo: shipmentData.destinatarioCorreo || '',
      direccion: shipmentData.direccion,
      referencia: shipmentData.referencia || '',
      distrito: shipmentData.distrito,
      provincia: shipmentData.provincia,
      departamento: shipmentData.departamento,
      linkGoogleMaps: shipmentData.linkGoogleMaps || '',
      plusCode: shipmentData.plusCode || '',
      latitud: shipmentData.latitud !== undefined && shipmentData.latitud !== null && shipmentData.latitud !== '' ? parseFloat(shipmentData.latitud) : null,
      longitud: shipmentData.longitud !== undefined && shipmentData.longitud !== null && shipmentData.longitud !== '' ? parseFloat(shipmentData.longitud) : null,
      cantidadPaquetes: shipmentData.cantidadPaquetes,
      peso: shipmentData.peso || 0,
      prioridad: shipmentData.prioridad || 'Normal',
      ordenRuta: shipmentData.ordenRuta || 0,
      descripcion: shipmentData.descripcion || '',
      observaciones: shipmentData.observaciones || '',
      estado: estadoToSave,
      modificadoPor: shipmentData.modificadoPor || 'Sistema'
    });

    return this.findById(id);
  }

  assignToConductor(shipmentId, conductorId, modificadoPor = 'Sistema') {
    const existing = this.findById(shipmentId);
    if (!existing) return null;

    const newStatus = existing.estado === 'Registrado' ? 'En proceso' : existing.estado;

    const stmt = this.db.prepare(`
      UPDATE envios
      SET conductor_id = @conductorId,
          estado = @estado,
          fecha_modificacion = DATETIME('now', 'localtime'),
          modificado_por = @modificadoPor
      WHERE id = @id
    `);

    stmt.run({
      id: shipmentId,
      conductorId: parseInt(conductorId, 10),
      estado: newStatus,
      modificadoPor
    });

    return this.findById(shipmentId);
  }

  unassignFromConductor(shipmentId, modificadoPor = 'Sistema') {
    const existing = this.findById(shipmentId);
    if (!existing) return null;

    const newStatus = existing.estado === 'En proceso' ? 'Registrado' : existing.estado;

    const stmt = this.db.prepare(`
      UPDATE envios
      SET conductor_id = NULL,
          orden_ruta = 0,
          estado = @estado,
          fecha_modificacion = DATETIME('now', 'localtime'),
          modificado_por = @modificadoPor
      WHERE id = @id
    `);

    stmt.run({
      id: shipmentId,
      estado: newStatus,
      modificadoPor
    });

    return this.findById(shipmentId);
  }

  updateCoordinates(shipmentId, lat, lng, modificadoPor = 'Sistema') {
    const stmt = this.db.prepare(`
      UPDATE envios
      SET latitud = @lat,
          longitud = @lng,
          fecha_modificacion = DATETIME('now', 'localtime'),
          modificado_por = @modificadoPor
      WHERE id = @id
    `);

    stmt.run({
      id: shipmentId,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      modificadoPor
    });

    return this.findById(shipmentId);
  }

  updateRouteOrder(shipmentId, ordenRuta, modificadoPor = 'Sistema') {
    const stmt = this.db.prepare(`
      UPDATE envios
      SET orden_ruta = @ordenRuta,
          fecha_modificacion = DATETIME('now', 'localtime'),
          modificado_por = @modificadoPor
      WHERE id = @id
    `);

    stmt.run({
      id: shipmentId,
      ordenRuta: parseInt(ordenRuta, 10),
      modificadoPor
    });

    return this.findById(shipmentId);
  }

  saveRouteOptimizedOrder(orderedShipments, modificadoPor = 'Sistema') {
    // orderedShipments: array of { id, ordenRuta }
    if (!Array.isArray(orderedShipments) || orderedShipments.length === 0) return [];

    const stmt = this.db.prepare(`
      UPDATE envios
      SET orden_ruta = @ordenRuta,
          fecha_modificacion = DATETIME('now', 'localtime'),
          modificado_por = @modificadoPor
      WHERE id = @id
    `);

    const updateAll = this.db.transaction((list) => {
      for (const item of list) {
        stmt.run({
          id: item.id,
          ordenRuta: item.ordenRuta,
          modificadoPor
        });
      }
    });

    updateAll(orderedShipments);
    return true;
  }

  updateStatus(id, newStatus, modificadoPor, fechaEntrega = null) {
    const existing = this.findById(id);
    let finalFechaEntrega = fechaEntrega;

    if (newStatus === 'Entregado') {
      finalFechaEntrega = fechaEntrega || (existing && existing.fechaEntrega) || new Date().toISOString().split('T')[0];
    } else if (newStatus !== 'Entregado' && !fechaEntrega) {
      finalFechaEntrega = null;
    }

    const stmt = this.db.prepare(`
      UPDATE envios 
      SET estado = @estado, 
          fecha_entrega = @fechaEntrega,
          fecha_modificacion = DATETIME('now', 'localtime'),
          modificado_por = @modificadoPor
      WHERE id = @id
    `);

    stmt.run({
      id,
      estado: newStatus,
      fechaEntrega: finalFechaEntrega,
      modificadoPor: modificadoPor || 'Sistema'
    });

    return this.findById(id);
  }

  delete(id) {
    const stmt = this.db.prepare(`DELETE FROM envios WHERE id = ?`);
    const result = stmt.run(id);
    return result.changes > 0;
  }

  createBatch(shipmentsList) {
    if (!Array.isArray(shipmentsList) || shipmentsList.length === 0) {
      return [];
    }

    const stmt = this.db.prepare(`
      INSERT INTO envios (
        codigo_envio, cliente_id, conductor_id, fecha_registro, fecha_entrega, tipo_servicio,
        destinatario_nombre, destinatario_documento, destinatario_telefono, destinatario_correo,
        direccion, referencia, distrito, provincia, departamento,
        link_google_maps, plus_code, latitud, longitud,
        cantidad_paquetes, peso, prioridad, orden_ruta, descripcion, observaciones, estado, creado_por
      ) VALUES (
        @codigoEnvio, @clienteId, @conductorId, @fechaRegistro, @fechaEntrega, @tipoServicio,
        @destinatarioNombre, @destinatarioDocumento, @destinatarioTelefono, @destinatarioCorreo,
        @direccion, @referencia, @distrito, @provincia, @departamento,
        @linkGoogleMaps, @plusCode, @latitud, @longitud,
        @cantidadPaquetes, @peso, @prioridad, @ordenRuta, @descripcion, @observaciones, @estado, @creadoPor
      )
    `);

    // Ejecución atómica en una única transacción
    const runTransaction = this.db.transaction((list) => {
      const inserted = [];
      const dateCounters = {};

      for (const item of list) {
        const dateStr = item.fechaRegistro || new Date().toISOString().split('T')[0];
        const dateFormatted = dateStr.replace(/-/g, '');
        const prefix = `ENV-${dateFormatted}-`;

        if (dateCounters[dateStr] === undefined) {
          const row = this.db.prepare(`
            SELECT codigo_envio 
            FROM envios 
            WHERE codigo_envio LIKE ? 
            ORDER BY id DESC 
            LIMIT 1
          `).get(`${prefix}%`);

          if (row && row.codigo_envio) {
            const parts = row.codigo_envio.split('-');
            dateCounters[dateStr] = parseInt(parts[2], 10) || 0;
          } else {
            dateCounters[dateStr] = 0;
          }
        }

        dateCounters[dateStr] += 1;
        const codigoEnvio = `${prefix}${String(dateCounters[dateStr]).padStart(5, '0')}`;

        let fechaEntrega = item.fechaEntrega || null;
        if (item.estado === 'Entregado' && !fechaEntrega) {
          fechaEntrega = dateStr;
        }

        const conductorId = item.conductorId ? parseInt(item.conductorId, 10) : null;

        const result = stmt.run({
          codigoEnvio,
          clienteId: item.clienteId,
          conductorId,
          fechaRegistro: dateStr,
          fechaEntrega,
          tipoServicio: item.tipoServicio || 'Estándar',
          destinatarioNombre: item.destinatarioNombre,
          destinatarioDocumento: item.destinatarioDocumento || '',
          destinatarioTelefono: item.destinatarioTelefono,
          destinatarioCorreo: item.destinatarioCorreo || '',
          direccion: item.direccion,
          referencia: item.referencia || '',
          distrito: item.distrito,
          provincia: item.provincia || 'Lima',
          departamento: item.departamento || 'Lima',
          linkGoogleMaps: item.linkGoogleMaps || '',
          plusCode: item.plusCode || '',
          latitud: item.latitud !== undefined && item.latitud !== null ? parseFloat(item.latitud) : null,
          longitud: item.longitud !== undefined && item.longitud !== null ? parseFloat(item.longitud) : null,
          cantidadPaquetes: parseInt(item.cantidadPaquetes || 1, 10),
          peso: parseFloat(item.peso || 0),
          prioridad: item.prioridad || 'Normal',
          ordenRuta: item.ordenRuta || 0,
          descripcion: item.descripcion || '',
          observaciones: item.observaciones || '',
          estado: item.estado || (conductorId ? 'Asignado' : 'Registrado'),
          creadoPor: item.creadoPor || 'Sistema'
        });

        inserted.push({
          id: result.lastInsertRowid,
          codigoEnvio,
          ...item
        });
      }

      return inserted;
    });

    return runTransaction(shipmentsList);
  }
}

module.exports = new ShipmentRepository();
