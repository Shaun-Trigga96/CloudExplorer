/* eslint-disable linebreak-style */
// eslint-disable-next-line linebreak-style
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// functions/config.js
/**
 * @file config.js
 * @description This file initializes and exports shared configurations and resources
 *              for Firebase Cloud Functions. It includes the Firebase Admin SDK setup,
 *              Firestore database instance, Firebase logger, and environment-specific
 *              parameters like API keys.
 */

// --- Imports ---

/**
 * @name admin
 * @description The Firebase Admin SDK, providing privileged access to Firebase services.
 *              Used here for initializing the app and accessing Firestore.
 */
const admin = require("firebase-admin");

/**
 * @name logger (from firebase-functions)
 * @description Firebase Functions logger instance for logging events and errors
 *              within Cloud Functions.
 */
const {logger} = require("firebase-functions");

/**
 * @name defineString (from firebase-functions/params)
 * @description A Firebase Functions feature for defining and accessing typed parameters,
 *              often used for secrets and environment-specific configurations.
 */
const {defineString} = require("firebase-functions/params");

// --- Firebase Admin SDK Initialization ---
try {
  admin.initializeApp(); // Initializes the Firebase Admin SDK.
  logger.info("Firebase Admin SDK initialized.");
} catch (e) {
  // Checks if the error is due to the app already being initialized (common in some environments/testing).
  if (!e.message.includes("already exists")) {
    logger.error("Firebase Admin SDK initialization error", e);
  }
}

// --- Shared Resources ---

/**
 * @name db
 * @description An instance of the Firestore database, allowing interaction with
 *              the application's NoSQL database.
 */
const db = admin.firestore();

/**
 * @name sendgridApiKey
 * @description A Firebase Functions parameter (secret) that holds the SendGrid API key.
 *              This key is defined in the Firebase environment (e.g., via `firebase functions:secrets:set SENDGRID_KEY`).
 *              `defineString` ensures it's treated as a string parameter.
 */
const sendgridApiKey = defineString("SENDGRID_KEY");

// --- Exports ---
/**
 * @description Exports the shared resources for use in other Cloud Function files.
 */
module.exports = {
  db, // Firestore database instance
  logger, // Firebase Functions logger
  sendgridApiKey, // SendGrid API key parameter
};
