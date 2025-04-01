// middleware.js
const rateLimit = require('express-rate-limit');

// Specific Limiter for Hugging Face (more restrictive)
const hfApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'development' ? 20 : 5, // Limit AI generation calls per IP
  message:
    'Too many AI generation requests from this IP, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { hfApiLimiter };
