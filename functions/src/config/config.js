/* eslint-disable linebreak-style */
// functions/config.js
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {defineString} = require("firebase-functions/params");

// Initialize Firebase Admin SDK
try {
  admin.initializeApp();
  logger.info("Firebase Admin SDK initialized.");
} catch (e) {
  if (!e.message.includes("already exists")) {
    logger.error("Firebase Admin SDK initialization error", e);
  }
}

// Define and export shared resources
const db = admin.firestore();

// Get SendGrid API key from environment
const sendgridApiKey = defineString("SENDGRID_API_KEY");

// Export shared resources
module.exports = {
  db,
  logger,
  sendgridApiKey,
};
