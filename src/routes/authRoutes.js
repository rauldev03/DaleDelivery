const express = require('express');
const router = express.Router();
const authController = require('../controllers/AuthController');
const { redirectIfAuthenticated, requireAuth } = require('../middlewares/authMiddleware');

router.get('/login', redirectIfAuthenticated, (req, res) => authController.showLoginForm(req, res));
router.post('/login', redirectIfAuthenticated, (req, res) => authController.login(req, res));
router.get('/logout', requireAuth, (req, res) => authController.logout(req, res));
router.post('/logout', requireAuth, (req, res) => authController.logout(req, res));

module.exports = router;
