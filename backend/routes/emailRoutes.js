// backend/routes/emailRoutes.js
const express = require('express');
const emailController = require('../controllers/emailController');
// const { protect } = require('../middleware/authMiddleware'); // Import if needed
/**
 * @file emailRoutes.js
 * @description This file defines routes for email-related functionalities,
 * such as managing user email subscription preferences. All routes defined here
 * are typically prefixed with `/api/v1/email` (or `/api/v1/users` if user-scoped).
 */

const router = express.Router();

// --- Email Subscription Route ---
/**
 * @route   POST /update-subscription
 * @desc    Updates a user's email subscription status (enable/disable email updates).
 * @access  Private (Requires user authentication, `userId` is typically derived from the authenticated user or passed in the body)
 */
router.post('/update-subscription', /* protect, */ emailController.updateEmailSubscription);

module.exports = router;
