function notFoundHandler(req, res, next) {
  res.status(404).render('errors/404', {
    title: 'Página no encontrada',
    layout: req.session && req.session.user ? 'layouts/main' : 'layouts/auth',
    message: 'El recurso solicitado no existe o fue trasladado.'
  });
}

function globalErrorHandler(err, req, res, next) {
  console.error('❌ Error no controlado:', err);
  
  res.status(err.status || 500).render('errors/500', {
    title: 'Error Interno del Servidor',
    layout: req.session && req.session.user ? 'layouts/main' : 'layouts/auth',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Ocurrió un error inesperado en el servidor.'
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
