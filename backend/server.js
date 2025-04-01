/* eslint-disable no-useless-escape */
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const {HfInference} = require('@huggingface/inference'); // Import HF Inference
const { hfApiLimiter } = require('./middleware/middleware'); // Import limiter from middleware.js

// --- Load Environment Variables ---
dotenv.config({path: path.resolve(__dirname, '..', '.env')});

// --- Firebase Initialization ---
try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH environment variable is not set.');
  }
  // Get the relative path from the environment variable (e.g., 'backend/src/config/key.json')
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  // Resolve the absolute path starting from the project root (one level up from __dirname)
  const absoluteCredentialsPath = path.resolve(__dirname, '..', serviceAccountPath);

  console.log(`Loading Firebase credentials from: ${absoluteCredentialsPath}`); // Should now be the correct path
  const serviceAccount = require(absoluteCredentialsPath); // This require should now work

  if (!process.env.FIREBASE_STORAGE_BUCKET) {
      console.warn('FIREBASE_STORAGE_BUCKET environment variable is not set. Storage operations might fail.');
  }

  // Check if the default app is already initialized BEFORE initializing
  if (admin.apps.length === 0) {
      admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      console.log('Firebase Admin SDK Initialized Successfully.');
  } else {
      console.log('Firebase Admin SDK already initialized.');
  }

  // Make sure authenticateGoogleDocs is imported if you uncomment this
  // const { authenticateGoogleDocs } = require('./utils/googleAuth');
  // authenticateGoogleDocs().catch(err => {
  //     console.error('Initial Google Auth failed:', err.message);
  // });

} catch (error) {
  console.error(
      'CRITICAL: Failed to initialize Firebase Admin SDK or load credentials:',
      error.message,
  );
  if (error.code === 'MODULE_NOT_FOUND') {
      // This error might still occur if the path in .env is wrong AFTER the fix above
      console.error(
          `Ensure the credentials file exists at the resolved path: ${error.path || absoluteCredentialsPath}. Check the FIREBASE_SERVICE_ACCOUNT_PATH in your .env file. It should be relative to the project root (e.g., backend/src/config/your-key.json).`,
      );
  }
  process.exit(1); // Exit if Firebase initialization fails
}
// --- Initialize Hugging Face Inference API --- (Do this early)
if (!process.env.HUGGINGFACE_API_KEY) {
  console.warn(
    'HUGGINGFACE_API_KEY not found in .env. AI features will likely fail.',
  );
  // You might choose to throw an error if AI is critical:
  // throw new Error('HUGGINGFACE_API_KEY is required.');
}
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
// Export hf instance so controllers can import it
module.exports.hf = hf; // Make hf available for import

// --- Utils and Middleware ---
const AppError = require('./utils/appError');
const {authenticateGoogleDocs} = require('./utils/googleAuth');

// --- Route Imports ---
const userRoutes = require('./routes/userRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const docRoutes = require('./routes/docRoutes');
const examRoutes = require('./routes/examRoutes');
const quizRoutes = require('./routes/quizRoutes'); // Added
const appRoutes = require('./routes/appRoutes'); // Added

// --- Express App Setup ---
const app = express();

// --- Global Middleware ---
app.use(cors({origin: process.env.CORS_ORIGIN || '*'}));

// General API Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Higher limit for dev
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use(hfApiLimiter); // Apply to all routes by default
// Body Parsing
app.use(express.json({limit: '10kb'})); // Limit payload size
app.use(express.urlencoded({extended: true, limit: '10kb'})); // For form data if needed

// Logging (use 'dev' for development, 'combined' for production)
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));


module.exports.hf = hf;

app.use(express.json({limit: '50kb'})); // Increased limit slightly if quiz/exam answers are large
app.use(express.urlencoded({extended: true, limit: '50kb'}));
app.use(apiLimiter); // Apply to all routes by default


// --- API Routes --- (Add new routers)
app.use('/api/v1', appRoutes); // General: /api/v1/health
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/docs', docRoutes);
app.use('/api/v1/quizzes', quizRoutes); // Added: /api/v1/quizzes/...
app.use('/api/v1/exams', examRoutes); // Added/Updated: /api/v1/exams/...

// --- Health Check Route ---
app.get('/health', (req, res) => {
  res.status(200).json({status: 'ok', timestamp: new Date()});
});

// --- Handle Undefined Routes ---
app.all('*', (req, res, next) => {
  next(
    new AppError(
      `Can't find ${req.originalUrl} on this server!`,
      404,
      'ROUTE_NOT_FOUND',
    ),
  );
});

// --- Global Error Handling Middleware --- (Update to handle AI errors better)
const globalErrorHandler = (err, req, res, next) => {
  console.error('GLOBAL ERROR:', err.name, '-', err.message);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Specific error handling (can add more based on common issues)
  if (
    err.code === 'AI_SERVICE_ERROR' ||
    err.code === 'AI_RESPONSE_PARSE_FAILED'
  ) {
    err.statusCode = err.statusCode || 503; // Service Unavailable or Internal Server Error
  }
  if (err.message?.includes('Hugging Face') && err.message?.includes('auth')) {
    err.statusCode = 401; // Unauthorized
    err.message = 'Invalid or missing Hugging Face API credentials.';
    err.code = 'AI_AUTH_ERROR';
  }
  if (
    (err.status === 429 || err.statusCode === 429) &&
    err.message?.includes('Rate limit')
  ) {
    err.code = 'RATE_LIMIT_EXCEEDED';
  }

  // Respond based on operational status
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      code: err.code,
      errors: err.errors, // Include validation errors if present
      ...(process.env.NODE_ENV === 'development' && {stack: err.stack}), // Stack in dev
    });
  } else {
    // Log detailed non-operational error
    console.error('Non-operational ERROR:', err);
    // Send generic message
    res.status(500).json({
      status: 'error',
      message: 'An unexpected internal server error occurred.',
      // Only detailed info in development
      ...(process.env.NODE_ENV === 'development' && {
        error: {message: err.message, stack: err.stack, name: err.name},
      }),
    });
  }
};
app.use(globalErrorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  // Assign to 'server' for graceful shutdown
  console.log(
    `Server running in ${
      process.env.NODE_ENV || 'development'
    } mode on port ${PORT}`,
  );
});

// --- Graceful Shutdown --- (Good practice)
const shutdown = signal => {
  console.log(`${signal} signal received: closing HTTP server.`);
  server.close(() => {
    console.log('HTTP server closed.');
    // Close database connections if necessary
    // admin.app().delete() // Optional: Cleanup Firebase connection
    // .then(() => console.log('Firebase Admin SDK connection closed.'))
    // .catch(err => console.error('Error closing Firebase connection:', err))
    // .finally(() => process.exit(0));
    process.exit(0); // Exit after server closes
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT')); // Handle Ctrl+C

// Export the Express app instance (optional, useful for testing)
// module.exports.app = app; // Use a different export name than the hf instance
