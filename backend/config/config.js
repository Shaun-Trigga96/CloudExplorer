/* eslint-disable linebreak-style */
// functions/config.js
/**
 * @file config.js
 * @description This file initializes and exports shared resources for the application,
 * primarily focusing on Firebase Admin SDK setup and environment-specific configurations
 * like API keys. It's intended for use within a Firebase Functions environment but can be adapted.
 */
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {defineString} = require("firebase-functions/params");

// --- Firebase Admin SDK Initialization ---
// Initializes the Firebase Admin SDK. It checks if the SDK has already been initialized
// to prevent errors if this module is imported multiple times.
try {
  admin.initializeApp();
  logger.info("Firebase Admin SDK initialized.");
} catch (e) {
  if (!e.message.includes("already exists")) {
    logger.error("Firebase Admin SDK initialization error", e);
  }
}

/**
 * @desc Firestore database instance from the initialized Firebase Admin SDK.
 * @type {admin.firestore.Firestore}
 */
const db = admin.firestore();

/**
 * @desc Firebase Functions logger instance for standardized logging.
 * @type {logger}
 */
// The logger is already imported and used, so it's implicitly available.
// If you were re-exporting it under a different name or modifying it, you'd document that.

/**
 * @desc SendGrid API key, defined as a Firebase Functions environment parameter.
 *       This allows the API key to be securely managed and configured per environment.
 * @type {import('firebase-functions/params').StringParam}
 */
const sendgridApiKey = defineString("SENDGRID_KEY");

module.exports = {
  db,
  logger,
  sendgridApiKey,
};
