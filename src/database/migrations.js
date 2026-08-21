const { getDatabase } = require('../config/database');

function runMigrations() {
  const db = getDatabase();

  db.exec(`
    -- Tabla de Usuarios Administrativos
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      nombre TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
      fecha_creacion TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
      fecha_modificacion TEXT,
      creado_por TEXT DEFAULT 'Sistema',
      modificado_por TEXT
    );

    -- Tabla de Clientes
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_cliente TEXT NOT NULL UNIQUE,
      tipo_documento TEXT NOT NULL,
      numero_documento TEXT NOT NULL UNIQUE,
      razon_social_nombre TEXT NOT NULL,
      contacto TEXT,
      telefono TEXT NOT NULL,
      correo TEXT,
      direccion TEXT NOT NULL,
      distrito TEXT NOT NULL,
      provincia TEXT NOT NULL,
      departamento TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'Activo' CHECK(estado IN ('Activo', 'Inactivo')),
      fecha_registro TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
      fecha_creacion TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
      fecha_modificacion TEXT,
      creado_por TEXT,
      modificado_por TEXT
    );

    -- Índices para optimización de consultas de Clientes
    CREATE INDEX IF NOT EXISTS idx_clientes_codigo ON clientes(codigo_cliente);
    CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(numero_documento);
    CREATE INDEX IF NOT EXISTS idx_clientes_estado ON clientes(estado);
    CREATE INDEX IF NOT EXISTS idx_clientes_distrito ON clientes(distrito);

    -- Tabla de Conductores
    CREATE TABLE IF NOT EXISTS conductores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      documento TEXT NOT NULL UNIQUE,
      telefono TEXT,
      vehiculo TEXT NOT NULL,
      placa TEXT,
      capacidad REAL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'Disponible' CHECK(estado IN ('Disponible', 'En ruta', 'No disponible')),
      fecha_creacion TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
      fecha_modificacion TEXT,
      creado_por TEXT DEFAULT 'Sistema',
      modificado_por TEXT
    );

    -- Índices para Conductores
    CREATE INDEX IF NOT EXISTS idx_conductores_documento ON conductores(documento);
    CREATE INDEX IF NOT EXISTS idx_conductores_estado ON conductores(estado);

    -- Tabla de Envíos
    CREATE TABLE IF NOT EXISTS envios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_envio TEXT NOT NULL UNIQUE,
      cliente_id INTEGER NOT NULL,
      conductor_id INTEGER,
      fecha_registro TEXT NOT NULL,
      fecha_entrega TEXT,
      tipo_servicio TEXT NOT NULL,
      destinatario_nombre TEXT NOT NULL,
      destinatario_documento TEXT,
      destinatario_telefono TEXT NOT NULL,
      destinatario_correo TEXT,
      direccion TEXT NOT NULL,
      referencia TEXT,
      distrito TEXT NOT NULL,
      provincia TEXT NOT NULL,
      departamento TEXT NOT NULL,
      link_google_maps TEXT,
      plus_code TEXT,
      latitud REAL,
      longitud REAL,
      cantidad_paquetes INTEGER NOT NULL CHECK(cantidad_paquetes > 0),
      peso REAL DEFAULT 0,
      prioridad TEXT NOT NULL DEFAULT 'Normal' CHECK(prioridad IN ('Baja', 'Normal', 'Alta')),
      orden_ruta INTEGER DEFAULT 0,
      descripcion TEXT,
      observaciones TEXT,
      estado TEXT NOT NULL DEFAULT 'Registrado' CHECK(estado IN ('Registrado', 'En proceso', 'Entregado', 'Cancelado')),
      fecha_creacion TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
      fecha_modificacion TEXT,
      creado_por TEXT,
      modificado_por TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
      FOREIGN KEY (conductor_id) REFERENCES conductores(id) ON DELETE SET NULL
    );

    -- Índices para optimización de filtros y reportería de Envíos
    CREATE INDEX IF NOT EXISTS idx_envios_codigo ON envios(codigo_envio);
    CREATE INDEX IF NOT EXISTS idx_envios_cliente_id ON envios(cliente_id);
    CREATE INDEX IF NOT EXISTS idx_envios_fecha_registro ON envios(fecha_registro);
    CREATE INDEX IF NOT EXISTS idx_envios_estado ON envios(estado);
    CREATE INDEX IF NOT EXISTS idx_envios_distrito ON envios(distrito);
  `);

  // Migración segura para bases de datos existentes
  const columns = db.prepare("PRAGMA table_info(envios)").all();
  const colNames = columns.map(col => col.name);

  if (!colNames.includes('fecha_entrega')) {
    db.exec("ALTER TABLE envios ADD COLUMN fecha_entrega TEXT;");
    console.log('✅ Migración aplicada: Columna fecha_entrega añadida a la tabla envios.');
  }

  if (!colNames.includes('link_google_maps')) {
    db.exec("ALTER TABLE envios ADD COLUMN link_google_maps TEXT;");
    console.log('✅ Migración aplicada: Columna link_google_maps añadida a la tabla envios.');
  }

  if (!colNames.includes('plus_code')) {
    db.exec("ALTER TABLE envios ADD COLUMN plus_code TEXT;");
    console.log('✅ Migración aplicada: Columna plus_code añadida a la tabla envios.');
  }

  if (!colNames.includes('conductor_id')) {
    db.exec("ALTER TABLE envios ADD COLUMN conductor_id INTEGER REFERENCES conductores(id) ON DELETE SET NULL;");
    console.log('✅ Migración aplicada: Columna conductor_id añadida a la tabla envios.');
  }

  if (!colNames.includes('latitud')) {
    db.exec("ALTER TABLE envios ADD COLUMN latitud REAL;");
    console.log('✅ Migración aplicada: Columna latitud añadida a la tabla envios.');
  }

  if (!colNames.includes('longitud')) {
    db.exec("ALTER TABLE envios ADD COLUMN longitud REAL;");
    console.log('✅ Migración aplicada: Columna longitud añadida a la tabla envios.');
  }

  if (!colNames.includes('prioridad')) {
    db.exec("ALTER TABLE envios ADD COLUMN prioridad TEXT DEFAULT 'Normal';");
    console.log('✅ Migración aplicada: Columna prioridad añadida a la tabla envios.');
  }

  if (!colNames.includes('orden_ruta')) {
    db.exec("ALTER TABLE envios ADD COLUMN orden_ruta INTEGER DEFAULT 0;");
    console.log('✅ Migración aplicada: Columna orden_ruta añadida a la tabla envios.');
  }

  // Crear índices de manera segura
  db.exec("CREATE INDEX IF NOT EXISTS idx_envios_fecha_entrega ON envios(fecha_entrega);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_envios_conductor_id ON envios(conductor_id);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_envios_orden_ruta ON envios(orden_ruta);");

  // Autopoblar coordenadas para envíos existentes que no tengan lat/lng
  const { getDistrictCoordinates } = require('../config/districts');
  const nullCoords = db.prepare("SELECT id, distrito FROM envios WHERE latitud IS NULL OR longitud IS NULL").all();
  if (nullCoords.length > 0) {
    const updateStmt = db.prepare("UPDATE envios SET latitud = @lat, longitud = @lng WHERE id = @id");
    const updateAll = db.transaction((rows) => {
      for (const row of rows) {
        const coords = getDistrictCoordinates(row.distrito || 'Cercado de Lima', true);
        updateStmt.run({
          id: row.id,
          lat: coords.lat,
          lng: coords.lng
        });
      }
    });
    updateAll(nullCoords);
    console.log(`✅ Geocodificación retroactiva: ${nullCoords.length} envíos actualizados con coordenadas de su distrito.`);
  }

  console.log('✅ Migraciones ejecutadas correctamente: Tablas e Índices creados.');
}

module.exports = {
  runMigrations
};
