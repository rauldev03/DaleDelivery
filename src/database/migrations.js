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

    -- Tabla de Envíos
    CREATE TABLE IF NOT EXISTS envios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_envio TEXT NOT NULL UNIQUE,
      cliente_id INTEGER NOT NULL,
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
      cantidad_paquetes INTEGER NOT NULL CHECK(cantidad_paquetes > 0),
      peso REAL DEFAULT 0,
      descripcion TEXT,
      observaciones TEXT,
      estado TEXT NOT NULL DEFAULT 'Registrado' CHECK(estado IN ('Registrado', 'En proceso', 'Entregado', 'Cancelado')),
      fecha_creacion TEXT NOT NULL DEFAULT (DATETIME('now', 'localtime')),
      fecha_modificacion TEXT,
      creado_por TEXT,
      modificado_por TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT
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

  // Crear índice de fecha_entrega de manera segura
  db.exec("CREATE INDEX IF NOT EXISTS idx_envios_fecha_entrega ON envios(fecha_entrega);");

  console.log('✅ Migraciones ejecutadas correctamente: Tablas e Índices creados.');
}

module.exports = {
  runMigrations
};
