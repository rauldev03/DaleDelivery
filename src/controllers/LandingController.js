class LandingController {
  showLandingPage(req, res) {
    const isLoggedIn = Boolean(req.session && req.session.user);
    const user = isLoggedIn ? req.session.user : null;

    res.render('landing/index', {
      title: 'Dale Delivery | Courier Rápido, Seguro y Conectado - Cobertura Perú',
      isLoggedIn,
      user,
      activeRoutesCount: 18,
      onTimeRate: '99.4%'
    });
  }
}

module.exports = new LandingController();
