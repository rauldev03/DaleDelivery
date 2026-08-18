const { getDatabase } = require('../config/database');
const Client = require('../models/Client');

class ClientRepository {
  constructor() {
    this.db = getDatabase();
  }

  getNextClientCode() {
    // Obtener el mayor número de cliente actual
    const row = this.db.prepare(`
      SELECT codigo_cliente 
      FROM clientes 
      ORDER BY id DESC 
      LIMIT 1
    `).get();

    if (!row || !row.codigo_cliente) {
      return 'CLI-000001';
    }

    const match = row.codigo_cliente.match(/CLI-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `CLI-${String(nextNum).padStart(6, '0')}`;
    }

    return `CLI-${String(Date.now()).slice(-6)}`;
  }

  findAll({ search = '', estado = '', page = 1, limit = 10 }) {
    let whereClauses = [];
    let params = {};

    if (search && search.trim() !== '') {
      whereClauses.push(`(
        codigo_cliente LIKE @search OR
        numero_documento LIKE @search OR
        razon_social_nombre LIKE @search OR
        contacto LIKE @search OR
        telefono LIKE @search OR
        distrito LIKE @search
      )`);
      params.search = `%${search.trim()}%`;
    }

    if (estado && estado.trim() !== '') {
      whereClauses.push('estado = @estado');
      params.estado = estado.trim();
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Conteo total para paginación
    const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM clientes ${whereSQL}`);
    const totalRow = countStmt.get(params);
    const total = totalRow ? totalRow.total : 0;

    // Consulta paginada
    const offset = (page - 1) * limit;
    params.limit = limit;
    params.offset = offset;

    const dataStmt = this.db.prepare(`
      SELECT * FROM clientes 
      ${whereSQL}
      ORDER BY id DESC 
      LIMIT @limit OFFSET @offset
    `);

    const rows = dataStmt.all(params);
    const clients = rows.map(r => new Client(r));

    return {
      clients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    };
  }

  getAllActive() {
    const rows = this.db.prepare(`
      SELECT * FROM clientes 
      WHERE estado = 'Activo' 
      ORDER BY razon_social_nombre ASC
    `).all();
    return rows.map(r => new Client(r));
  }

  findById(id) {
    const row = this.db.prepare('SELECT * FROM clientes WHERE id = ?').get(id);
    return row ? new Client(row) : null;
  }

  findByCodigo(codigoCliente) {
    const row = this.db.prepare('SELECT * FROM clientes WHERE codigo_cliente = ?').get(codigoCliente);
    return row ? new Client(row) : null;
  }

  findByDocumento(numeroDocumento) {
    const row = this.db.prepare('SELECT * FROM clientes WHERE numero_documento = ?').get(numeroDocumento);
    return row ? new Client(row) : null;
  }

  create(clientData) {
    const stmt = this.db.prepare(`
      INSERT INTO clientes (
        codigo_cliente, tipo_documento, numero_documento, razon_social_nombre,
        contacto, telefono, correo, direccion, distrito, provincia, departamento,
        estado, creado_por
      ) VALUES (
        @codigoCliente, @tipoDocumento, @numeroDocumento, @razonSocialNombre,
        @contacto, @telefono, @correo, @direccion, @distrito, @provincia, @departamento,
        @estado, @creadoPor
      )
    `);

    const result = stmt.run({
      codigoCliente: clientData.codigoCliente,
      tipoDocumento: clientData.tipoDocumento,
      numeroDocumento: clientData.numeroDocumento,
      razonSocialNombre: clientData.razonSocialNombre,
      contacto: clientData.contacto || '',
      telefono: clientData.telefono,
      correo: clientData.correo || '',
      direccion: clientData.direccion,
      distrito: clientData.distrito,
      provincia: clientData.provincia,
      departamento: clientData.departamento,
      estado: clientData.estado || 'Activo',
      creadoPor: clientData.creadoPor || 'Sistema'
    });

    return this.findById(result.lastInsertRowid);
  }

  update(id, clientData) {
    const stmt = this.db.prepare(`
      UPDATE clientes
      SET tipo_documento = @tipoDocumento,
          numero_documento = @numeroDocumento,
          razon_social_nombre = @razonSocialNombre,
          contacto = @contacto,
          telefono = @telefono,
          correo = @correo,
          direccion = @direccion,
          distrito = @distrito,
          provincia = @provincia,
          departamento = @departamento,
          estado = @estado,
          fecha_modificacion = DATETIME('now', 'localtime'),
          modificado_por = @modificadoPor
      WHERE id = @id
    `);

    stmt.run({
      id,
      tipoDocumento: clientData.tipoDocumento,
      numeroDocumento: clientData.numeroDocumento,
      razonSocialNombre: clientData.razonSocialNombre,
      contacto: clientData.contacto || '',
      telefono: clientData.telefono,
      correo: clientData.correo || '',
      direccion: clientData.direccion,
      distrito: clientData.distrito,
      provincia: clientData.provincia,
      departamento: clientData.departamento,
      estado: clientData.estado || 'Activo',
      modificadoPor: clientData.modificadoPor || 'Sistema'
    });

    return this.findById(id);
  }

  toggleStatus(id, modificadoPor) {
    const client = this.findById(id);
    if (!client) return null;

    const newStatus = client.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const stmt = this.db.prepare(`
      UPDATE clientes 
      SET estado = ?, 
          fecha_modificacion = DATETIME('now', 'localtime'),
          modificado_por = ?
      WHERE id = ?
    `);
    stmt.run(newStatus, modificadoPor || 'Sistema', id);
    return this.findById(id);
  }
}

module.exports = new ClientRepository();
