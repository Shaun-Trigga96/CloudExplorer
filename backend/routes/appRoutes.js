const express = require('express');
const appController = require('../controllers/appController');

const router = express.Router();

// Health check route
// GET /api/v1/health
router.get('/health', appController.healthCheck);

// Add other general app routes here if needed

module.exports = router;
