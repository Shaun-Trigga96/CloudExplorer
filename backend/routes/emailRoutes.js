// backend/routes/emailRoutes.js
const express = require('express');
const emailController = require('../controllers/emailController');
// const { protect } = require('../middleware/authMiddleware'); // Import if needed

const router = express.Router();

// --- Email Subscription Route ---
// POST /api/v1/email/update-subscription
router.post('/update-subscription', /* protect, */ emailController.updateEmailSubscription);

module.exports = router;
