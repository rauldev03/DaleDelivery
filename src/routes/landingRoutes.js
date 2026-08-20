const express = require('express');
const router = express.Router();
const landingController = require('../controllers/LandingController');

router.get('/', (req, res) => landingController.showLandingPage(req, res));

module.exports = router;
