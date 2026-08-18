const express = require('express');
const session = require('express-session');
const path = require('path');
const config = require('./src/config/app');
const { runMigrations } = require('./src/database/migrations');
const { runSeeders } = require('./src/database/seeders');
const { auditContext } = require('./src/middlewares/auditMiddleware');
const { notFoundHandler, globalErrorHandler } = require('./src/middlewares/errorHandler');
const routes = require('./src/routes');

const app = express();

// 1. Inicializar base de datos relacional (Migraciones y Seeders)
try {
  runMigrations();
  runSeeders();
} catch (error) {
  console.error('❌ Error al inicializar la base de datos:', error);
  process.exit(1);
}

// 2. Configurar motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// 3. Middlewares de procesamiento de peticiones y archivos estáticos
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 4. Configurar manejo de sesiones seguras
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8 // 8 horas de sesión
    }
  })
);

// 5. Middleware de contexto y auditoría
app.use(auditContext);

// 6. Enrutador principal
app.use('/', routes);

// 7. Manejo centralizado de errores
app.use(notFoundHandler);
app.use(globalErrorHandler);

// 8. Iniciar Servidor
const server = app.listen(config.port, () => {
  console.log(`🚀 Servidor Courier Pro ejecutándose en http://localhost:${config.port}`);
  console.log(`👤 Usuario administrador por defecto: admin / admin123`);
});

module.exports = { app, server };
