/* eslint-disable linebreak-style */
// functions/config.js
const admin = require("firebase-admin");
const {defineString} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

// --- Firebase Admin SDK Initialization (Initialize ONCE here) ---
try {
  // Using unconditional initialize from previous debugging steps
  admin.initializeApp();
  logger.info("Firebase Admin SDK initialized from config.js.");
} catch (e) {
  // Log error but potentially ignore if it's "already exists"
  if (!e.message.includes("already exists")) {
    logger.error("Firebase Admin SDK initialization error in config.js", e);
  } else {
    logger.info("Firebase Admin SDK likely already initialized (config.js).");
  }
}

// --- Define and Export Shared Resources ---
const db = admin.firestore();

// Define SendGrid API key parameter
const sendgridApiKeyParam = defineString("SENDGRID_KEY");
// You still need to set this:
// firebase functions:config:set SENDGRID_KEY="YOUR_KEY"
// OR define in 'functions/.env.local' for emulation: SENDGRID_KEY=YOUR_KEY

// Export shared resources
module.exports = {
  db, // Export Firestore db instance
  sendgridApiKeyParam, // Export the parameter definition
  logger, // Export logger for consistent use
};
