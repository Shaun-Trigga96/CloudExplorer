const express = require('express');
const appController = require('../controllers/appController');

/**
 * @file appRoutes.js
 * @description This file defines routes for general application-level functionalities,
 * such as health checks.
 */

const router = express.Router();

/**
 * @route   GET /api/v1/health
 * @desc    Performs a health check of the application.
 * @access  Public
 */
// Health check route
// GET /api/v1/health
router.get('/health', appController.healthCheck);

// Add other general app routes here if needed

module.exports = router;
