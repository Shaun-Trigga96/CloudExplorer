const axios = require('axios');
const appError = require('../utils/appError');
const { db } = require('../utils/firestoreHelpers');

// Credly API base URL
const CREDLY_API_BASE_URL = 'https://api.credly.com/v1';

// Get user badges from Credly
exports.getUserBadges = async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return next(new appError('Access token is required', 400));
    }
    
    const response = await axios.get(`${CREDLY_API_BASE_URL}/me/badges`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: response.data
    });
  } catch (error) {
    console.error('Error fetching badges from Credly:', error.response?.data || error.message);
    return next(new appError('Failed to fetch badges from Credly', 500));
  }
};

// Import badges to user profile
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

// Exchange authorization code for access token
exports.getAccessToken = async (req, res, next) => {
  try {
    const { code, clientId, clientSecret, redirectUri } = req.body;
    
    if (!code || !clientId || !clientSecret || !redirectUri) {
      return next(new appError('Missing required OAuth parameters', 400));
    }
    
    const response = await axios.post(`${CREDLY_API_BASE_URL}/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri
    });
    
    res.status(200).json({
      status: 'success',
      data: response.data
    });
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message);
    return next(new appError('Failed to get access token from Credly', 500));
  }
};