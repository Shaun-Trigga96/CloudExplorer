// middleware.js
const rateLimit = require('express-rate-limit');

/**
 * @file middleware.js
 * @description This file contains custom middleware functions for the application,
 * such as rate limiters.
 */

/**
 * @desc    Rate limiter specifically designed for API endpoints that interact with
 *          computationally intensive services like the Hugging Face AI model.
 *          It's more restrictive to prevent abuse and manage resource consumption.
 */
const hfApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 20 : 5, // Limit AI generation calls per IP
  message:
    'Too many AI generation requests from this IP, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { hfApiLimiter };
