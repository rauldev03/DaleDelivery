function auditContext(req, res, next) {
  // Proporcionar información del usuario autenticado a las vistas (res.locals)
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.currentPath = req.path;
  
  // Flash messages en sesión
  res.locals.flashSuccess = req.session.flashSuccess || null;
  res.locals.flashError = req.session.flashError || null;
  res.locals.flashWarning = req.session.flashWarning || null;

  // Limpiar mensajes flash después de consumirlos
  delete req.session.flashSuccess;
  delete req.session.flashError;
  delete req.session.flashWarning;

  next();
}

module.exports = {
  auditContext
};
