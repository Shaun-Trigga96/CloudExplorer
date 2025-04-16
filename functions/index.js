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
const cloudEventsFunctions = require("./src/events/cloudEvents"); // Loads exports from cloudEvents.js
const communityPostFunctions = require("./src/events/posts"); // <-- Add this line

// Export all the loaded functions together.
// Firebase CLI will look at the exports of this file.
module.exports = {
  ...authFunctions, // This includes initializeNewUser as exported by auth.js
  ...emailFunctions, // This includes updateEmailSubscription as exported by email.js
  ...cloudEventsFunctions, // This includes fetchCloudEvents and manualFetchCloudEvents
  ...communityPostFunctions, // <-- Export the post-related functions
};

