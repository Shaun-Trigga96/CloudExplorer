/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// functions/index.js

/**
 * This file acts as the main entry point for Cloud Functions.
 * It loads functions defined in other files (like src/auth/auth.js, src/email/email.js)
 * and exports them so Firebase can discover and deploy them.
 */

// Load the functions exported from your source files
// Make sure the paths are correct relative to index.js
const authFunctions = require("./src/auth/auth"); // Loads exports from auth.js [cite: uploaded:src/auth/auth.js]
const emailFunctions = require("./src/email/email"); // Loads exports from email.js [cite: uploaded:src/email/email.js]
// If you add more function groups (e.g., ./src/payments/payments.js), require them here:
// const paymentFunctions = require("./src/payments/payments");

// Export all the loaded functions together.
// Firebase CLI will look at the exports of this file.
module.exports = {
  ...authFunctions, // This includes initializeNewUser as exported by auth.js
  ...emailFunctions, // This includes updateEmailSubscription as exported by email.js
  // ...paymentFunctions, // Include other groups if you add them
};

