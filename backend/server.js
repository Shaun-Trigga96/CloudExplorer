/* eslint-disable no-useless-escape */
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const morgan = require('morgan');
const {GoogleGenerativeAI} = require('@google/generative-ai');
/**
 * @file server.js
 * @description Main entry point for the Cloud Explorer backend application.
 * This file initializes the Express server, Firebase Admin SDK, Google AI client,
 * sets up middleware, defines routes, and handles global error management.
 */
/**
 * -----------------------------------------------------------------------------
 * Environment Variable Loading
 * -----------------------------------------------------------------------------
 * Loads environment variables from a .env file located at the project root.
 */ dotenv.config({path: path.resolve(__dirname, '..', '.env')});

// --- Firebase Admin SDK Initialization ---
// Attempts to initialize the Firebase Admin SDK using credentials and storage bucket
// specified in environment variables. Exits the process on critical failure.
try {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_PATH environment variable is not set.',
    );
  }
  // Get the relative path from the environment variable (e.g., 'backend/src/config/key.json')
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  // Resolve the absolute path starting from the project root (one level up from __dirname)
  const absoluteCredentialsPath = path.resolve(
    __dirname,
    '..',
    serviceAccountPath,
  );

  console.log(`Loading Firebase credentials from: ${absoluteCredentialsPath}`); // Should now be the correct path
  const serviceAccount = require(absoluteCredentialsPath); // This require should now work

  if (!process.env.FIREBASE_STORAGE_BUCKET) {
    console.warn(
      'FIREBASE_STORAGE_BUCKET environment variable is not set. Storage operations might fail.',
    );
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
} catch (error) {
  console.error(
    'CRITICAL: Failed to initialize Firebase Admin SDK or load credentials:',
    error.message,
  );
  if (error.code === 'MODULE_NOT_FOUND') {
    // This error might still occur if the path in .env is wrong AFTER the fix above
    console.error(
      `Ensure the credentials file exists at the resolved path: ${
        error.path || absoluteCredentialsPath
      }. Check the FIREBASE_SERVICE_ACCOUNT_PATH in your .env file. It should be relative to the project root (e.g., backend/src/config/your-key.json).`,
    );
  }
  process.exit(1); // Exit if Firebase initialization fails
}
// --- Google AI Client (Gemini) Initialization ---
// Initializes the Google Generative AI client if the GEMINI_API_KEY is set.
if (!process.env.GEMINI_API_KEY) {
  console.error(
    'CRITICAL: GEMINI_API_KEY environment variable is not set. AI features will fail.',
  );
} else {
  console.log('GEMINI_API_KEY found, initializing Google AI client...');
}

const googleAiClient = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

if (!googleAiClient) {
  console.warn(
    'Google AI client not initialized due to missing GEMINI_API_KEY.',
  );
}
/**
 * @global
 * @type {GoogleGenerativeAI | null} googleAiClient - Initialized Google AI client instance, or null if API key is missing.
 */
module.exports.googleAiClient = googleAiClient;

/**
 * -----------------------------------------------------------------------------
 * Utility and Middleware Imports
 * -----------------------------------------------------------------------------
 */
const AppError = require('./utils/appError');

// --- Route Imports ---
const userRoutes = require('./routes/userRoutes');
const moduleRoutes = require('./routes/moduleRoutes');
const examRoutes = require('./routes/examRoutes');
const quizRoutes = require('./routes/quizRoutes'); // Added
const appRoutes = require('./routes/appRoutes'); // Added
const emailRoutes = require('./routes/emailRoutes'); // Import email routes
const credlyRoutes = require('./routes/credlyRoutes');
const communityRoutes = require('./routes/communityRoutes'); // <-- Import new routes
const providerPathRoutes = require('./routes/providerPathRoutes'); // Import the new routes

/**
 * -----------------------------------------------------------------------------
 * Express Application Setup
 * ----
 * */
const app = express();

/**
 * -----------------------------------------------------------------------------
 * Global Middleware
 * -----------------------------------------------------------------------------
 * Configures CORS, body parsing (JSON and URL-encoded), and HTTP request logging.
 */
app.use(cors({origin: process.env.CORS_ORIGIN || '*'}));

// Body Parsing
app.use(express.json({limit: '10kb'})); // Limit payload size
app.use(express.urlencoded({extended: true, limit: '10kb'})); // For form data if needed

// Logging (use 'dev' for development, 'combined' for production)
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.use(express.json({limit: '50kb'})); // Increased limit slightly if quiz/exam answers are large
app.use(express.urlencoded({extended: true, limit: '50kb'}));

/**
 * -----------------------------------------------------------------------------
 * API Routes
 * -----------------------------------------------------------------------------
 * Mounts various route handlers for different API resources.
 */
app.use('/api/v1', appRoutes); // General: /api/v1/health
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/quizzes', quizRoutes); // Added: /api/v1/quizzes/...
app.use('/api/v1/exams', examRoutes); // Added/Updated: /api/v1/exams/...
app.use('/api/v1/email', emailRoutes); // Mount email routes under /api/v1/email
app.use('/api/v1/credly', credlyRoutes);
app.use('/api/v1/community', communityRoutes); // <-- Add community routes
app.use('/api/v1', providerPathRoutes);

/**
 * @route GET /health
 * @group Application - Operations related to application status
 * @returns {object} 200 - An object indicating the server status and timestamp.
 * @description Basic health check endpoint to verify the server is running.
 */
app.get('/health', (req, res) => {
  res.status(200).json({status: 'ok', timestamp: new Date()});
});

/**
 * @route GET /
 * @group Application - Operations related to application status
 * @returns {object} 200 - A welcome message with application status and version.
 * @description Root endpoint providing basic information about the API.
 */
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to Cloud Explorer Backend',
    version: '1.0.0',
  });
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

/**
 * -----------------------------------------------------------------------------
 * Global Error Handling Middleware
 * -----------------------------------------------------------------------------
 * Centralized error handler for all Express errors.
 * It logs errors and sends appropriate JSON responses to the client.
 * Differentiates between operational errors (expected) and programming/unknown errors.
 * Provides more detailed error information in development environments.
 */
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
  if (
    err.message?.includes('Inference Face') &&
    err.message?.includes('auth')
  ) {
    err.statusCode = 401; // Unauthorized
    err.message = 'Invalid or missing Inference Face API credentials.';
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

/**
 * -----------------------------------------------------------------------------
 * Server Initialization
 * -----------------------------------------------------------------------------
 * Starts the HTTP server, listening on the port defined by the environment
 * (e.g., for Cloud Run) or a default port for local development.
 * Listens on '0.0.0.0' to accept connections from any IP address.
 */
const port = process.env.PORT || 5001;

app.get('/', (req, res) => {
  res.send('Hello from the backend!');
});

// Important: Listen on '0.0.0.0' to accept connections from any IP,
// which is necessary for Cloud Run.
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on port ${port} and host 0.0.0.0`);
});

/**
 * -----------------------------------------------------------------------------
 * Graceful Shutdown Handling
 * -----------------------------------------------------------------------------
 * Implements graceful shutdown for SIGTERM (e.g., from Cloud Run, Docker)
 * and SIGINT (Ctrl+C) signals. This allows the server to finish processing
 * current requests before exiting.
 * @param {string} signal - The signal received (e.g., 'SIGTERM', 'SIGINT').
 */
const shutdown = signal => {
  console.log(`${signal} signal received: closing HTTP server.`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0); // Exit after server closes
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT')); // Handle Ctrl+C
