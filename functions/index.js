/* eslint-disable linebreak-style */
// eslint-disable-next-line linebreak-style
/* eslint-disable no-unused-vars */
/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// functions/index.js

/**
 * @file index.js
 * @description This file serves as the main entry point for all Firebase Cloud Functions
 *              defined in this project. It aggregates functions from various modules
 *              (e.g., authentication, email, event handling) and exports them,
 *              making them discoverable and deployable by the Firebase CLI.
 */

// --- Function Module Imports ---
// Load functions from their respective modules within the 'src' directory.

/**
 * @name authFunctions
 * @description Functions related to user authentication events (e.g., new user creation).
 *              Imported from `c:\Users\thabi\Desktop\CloudExplorer\functions\src\auth\auth.js`.
 */
const authFunctions = require("./src/auth/auth");

/**
 * @name emailFunctions
 * @description Functions related to email services (e.g., sending emails via SendGrid).
 *              Imported from `c:\Users\thabi\Desktop\CloudExplorer\functions\src\email\email.js`.
 */
const emailFunctions = require("./src/email/email");

/**
 * @name cloudEventsFunctions
 * @description Functions for fetching, storing, and notifying about cloud provider events.
 *              Imported from `c:\Users\thabi\Desktop\CloudExplorer\functions\src\events\cloudEvents.js`.
 */
const cloudEventsFunctions = require("./src/events/cloudEvents");

/**
 * @name communityPostFunctions
 * @description Functions related to community posts, such as updating like counts.
 *              Imported from `c:\Users\thabi\Desktop\CloudExplorer\functions\src\events\posts.js`.
 */
const communityPostFunctions = require("./src/events/posts");

/**
 * @name populateLearningOptions
 * @description Admin functions, such as populating initial learning options data.
 *              Imported from `c:\Users\thabi\Desktop\CloudExplorer\functions\src\events\populateLearningOptions.js`.
 */
const populateLearningOptions = require("./src/events/populateLearningOptions");

/**
 * @name indexes
 * @description Firestore index definitions, typically for ensuring query performance.
 *              Imported from `c:\Users\thabi\Desktop\CloudExplorer\functions\firestore.indexes.json`.
 *              Note: While imported, this is usually for reference or build processes,
 *              not directly exported as a deployable function.
 */

// --- Export All Functions ---
// The Firebase CLI inspects the exports of this `index.js` file to determine
// which Cloud Functions to deploy. The spread operator (...) is used to merge
// all exported functions from the imported modules into a single object.
module.exports = {
  ...authFunctions, // Exports functions like `initializeNewUser`.
  ...emailFunctions, // Exports functions like `sendEmail` (if defined and exported in email.js).
  ...cloudEventsFunctions, // Exports functions like `fetchCloudEvents` and `manualFetchCloudEvents`.
  ...communityPostFunctions, // Exports functions like `updatePostLikesCount`.
  ...populateLearningOptions, // Exports functions like `populateLearningOptions`.
  // Note: `indexes` is typically not exported as a function. If it were intended to be a function,
  // it would need to be structured as such. For now, it's assumed to be data.
  // If `indexes` is just data or configuration, it doesn't need to be spread here unless
  // there's a specific reason for it to be part of the deployed functions' exports (uncommon).
  // If it's not a function, you might consider removing it from the final export
  // or clarifying its purpose if it's used by a build step.
  // For example, if it's just data, it might be:
  // firestoreIndexes: indexes, // if you wanted to expose the data for some reason
};
