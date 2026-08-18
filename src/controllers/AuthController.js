const authService = require('../services/AuthService');

class AuthController {
  showLoginForm(req, res) {
    res.render('auth/login', {
      title: 'Iniciar Sesión - Courier Pro',
      layout: false, // El login usa su propia estructura completa o layout dedicado
      error: null,
      username: ''
    });
  }

  login(req, res) {
    const { username, password } = req.body;
    const authResult = authService.authenticate(username, password);

    if (!authResult.success) {
      return res.render('auth/login', {
        title: 'Iniciar Sesión - Courier Pro',
        layout: false,
        error: authResult.message,
        username: username || ''
      });
    }

    // Guardar en sesión
    req.session.user = authResult.user;
    req.session.flashSuccess = `Bienvenido al sistema, ${authResult.user.nombre}.`;

    return res.redirect('/dashboard');
  }

  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error al cerrar sesión:', err);
      }
      res.redirect('/login');
    });
  }
}

module.exports = new AuthController();
