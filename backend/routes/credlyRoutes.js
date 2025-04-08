const express = require('express');
const credlyController = require('../controllers/credlyController');
const router = express.Router();

// Get Access Token
router.post('/get-token', credlyController.getAccessToken);

// Get Badges
router.post('/get-badges', credlyController.getUserBadges);

// Import Badges
router.post('/import-badges', credlyController.importBadges);

module.exports = router;