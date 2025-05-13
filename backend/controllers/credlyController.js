const axios = require('axios');
const appError = require('../utils/appError');
const { db } = require('../utils/firestoreHelpers');

// Credly API base URL
const CREDLY_OAUTH_API_BASE_URL = 'https://api.credly.com/v1'; // For OAuth and /me endpoints that require user-specific tokens
const CREDLY_PUBLIC_API_BASE_URL = 'https://api.credly.com/v1';

/**
 * @file credlyController.js
 * @description This file contains controller functions for interacting with the Credly API,
 * including fetching public user badges, importing badges to a user's profile,
 * and handling OAuth token exchange for accessing user-specific Credly data.
 */

/**
 * @desc    Fetches public badges for a given Credly username/vanity alias.
 * @route   GET /api/v1/credly/users/:credlyUsername/badges
 * @access  Public (uses a server-side API key for Credly authentication)
 */
exports.getUserBadges = async (req, res, next) => {
  try {
    const { credlyUsername } = req.params;
    if (!credlyUsername) {
      return next(new appError('Credly username is required', 400, 'MISSING_USERNAME_PARAM'));
    }
    console.log(`Fetching badges for username: ${credlyUsername}`);
    let allBadges = [];
    let page = 1;
    let nextPageUrl = `${CREDLY_PUBLIC_API_BASE_URL}/users/${encodeURIComponent(credlyUsername)}/badges?page=${page}`;

    while (nextPageUrl) {
      const response = await axios.get(nextPageUrl, {
        headers: {
          Authorization: `Bearer ${process.env.CREDLY_API_KEY}`,
        },
      });
      allBadges = allBadges.concat(response.data.data || []);
      nextPageUrl = response.data.metadata?.next_page_url || null;
    }

    res.status(200).json({
      status: 'success',
      badges: allBadges,
    });
  } catch (error) {
    console.error(`Error fetching badges for ${req.params.credlyUsername}:`, error);
    if (error.code === 'ENOTFOUND') {
      return next(new appError('DNS resolution failed for Credly API.', 503, 'DNS_ERROR'));
    }
    if (error.response?.status === 401) {
      return next(new appError('Unauthorized: Invalid or missing API key.', 401, 'UNAUTHORIZED'));
    }
    if (error.response?.status === 404) {
      return next(new appError(`Credly user '${req.params.credlyUsername}' not found or has no public badges`, 404, 'CREDLY_USER_NOT_FOUND'));
    }
    return next(new appError(`Failed to fetch badges from Credly: ${error.message}`, error.response?.status || 500, 'CREDLY_API_ERROR'));
  }
};

/**
 * @desc    Imports a list of badges (presumably fetched from Credly) into a user's profile within the application.
 * @route   POST /api/v1/credly/import-badges
 * @access  Private (requires `userId` and implies user authentication)
 */
exports.importBadges = async (req, res, next) => {
  try {
    const { userId, badges } = req.body;
    
    if (!userId || !badges || !Array.isArray(badges)) {
      return next(new appError('User ID and badges array are required', 400));
    }
    
    const certificationsRef = db.collection('users').doc(userId).collection('certifications');
    
    // Process each badge and add to Firestore
    const importPromises = badges.map(async (badge) => {
      // Convert Credly badge to our app's certification format
      const certification = {
        title: badge.badge.name,
        issuingOrganization: badge.issuer.name,
        issuedDate: badge.issued_at,
        expiryDate: badge.expires_at || null,
        badgeUrl: badge.image_url,
        url: badge.badge_url,
        credentialId: badge.id,
        description: badge.badge.description,
        sourceType: 'credly',
        importedAt: new Date().toISOString()
      };
      
      // Add to Firestore
      return certificationsRef.add(certification);
    });
    
    await Promise.all(importPromises);
    
    res.status(201).json({
      status: 'success',
      message: `Successfully imported ${badges.length} badges`
    });
  } catch (error) {
    console.error('Error importing badges:', error);
    return next(new appError('Failed to import badges', 500));
  }
};

/**
 * @desc    Exchanges a Credly OAuth authorization code for an access token.
 * @route   GET /api/v1/credly/oauth/token (or POST, depending on OAuth flow implementation)
 * @access  Public (part of the OAuth 2.0 authorization code grant flow)
 */
exports.getAccessToken = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      return next(new appError('Authorization code is required', 400, 'MISSING_AUTH_CODE'));
    }
    const response = await axios.post(
      `${CREDLY_OAUTH_API_BASE_URL}/oauth/token`,
      {
        client_id: process.env.CREDLY_CLIENT_ID,
        client_secret: process.env.CREDLY_CLIENT_SECRET,
        code,
        redirect_uri: process.env.CREDLY_REDIRECT_URI,
        grant_type: 'authorization_code',
      }
    );
    res.status(200).json({
      status: 'success',
      access_token: response.data.access_token,
    });
  } catch (error) {
    console.error('Error getting access token:', error);
    return next(new appError('Failed to get access token', error.response?.status || 500, 'OAUTH_ERROR'));
  }
};

/**
 * @desc    Fetches badges for the authenticated Credly user using an OAuth access token.
 * @route   GET /api/v1/credly/me/badges
 * @access  Private (requires a valid Credly OAuth `access_token` for the user)
 */
exports.getUserBadgesWithToken = async (req, res, next) => {
  try {
    const { access_token } = req.query;
    if (!access_token) {
      return next(new appError('Access token is required', 400, 'MISSING_ACCESS_TOKEN'));
    }
    let allBadges = [];
    let page = 1;
    let nextPageUrl = `${CREDLY_OAUTH_API_BASE_URL}/me/badges?page=${page}`;

    while (nextPageUrl) {
      const response = await axios.get(nextPageUrl, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      allBadges = allBadges.concat(response.data.data || []);
      nextPageUrl = response.data.metadata?.next_page_url || null;
    }

    res.status(200).json({
      status: 'success',
      badges: allBadges,
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    return next(new appError('Failed to fetch badges', error.response?.status || 500, 'CREDLY_API_ERROR'));
  }
};