const express = require('express');
const credlyController = require('../controllers/credlyController');
/**
 * @file credlyRoutes.js
 * @description This file defines routes for interacting with the Credly API,
 * including OAuth token exchange, fetching public badges, and importing badges
 * into a user's profile. All routes defined here are prefixed with `/api/v1/credly`.
 */
const router = express.Router();

// Get Access Token
/**
 * @route   POST /get-token
 * @desc    Exchanges a Credly OAuth authorization code for an access token.
 *          (Note: The HTTP method might be GET depending on the exact OAuth flow implementation,
 *          e.g., if the code is passed as a query parameter).
 * @access  Public (Part of the OAuth 2.0 authorization code grant flow)
 */
router.post('/get-token', credlyController.getAccessToken);

// Get Badges
/**
 * @route   GET /badges/:credlyUsername
 * @desc    Fetches public badges for a given Credly username/vanity alias.
 * @access  Public (Uses a server-side API key for Credly authentication if needed by the controller)
 * @param   {string} req.params.credlyUsername - The Credly username or vanity alias.
 */
router.get('/badges/:credlyUsername', credlyController.getUserBadges);

// Import Badges
/**
 * @route   POST /import-badges
 * @desc    Imports a list of badges (presumably fetched from Credly) into a user's profile within the application.
 * @access  Private (Requires user authentication and `userId` in the request body)
 */
router.post('/import-badges', credlyController.importBadges);

module.exports = router;