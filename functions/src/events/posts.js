/* eslint-disable linebreak-style */
// eslint-disable-next-line linebreak-style
/* eslint-disable padded-blocks */
/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// functions/src/community/posts.js
/**
 * @file posts.js
 * @description This file contains Firebase Cloud Functions triggered by Firestore events
 *              related to community posts, specifically for managing like counts.
 */

// --- Imports ---
/**
 * @name onDocumentWritten (from firebase-functions/v2/firestore)
 * @description Firebase Functions v2 Firestore trigger that fires when a document is created, updated, or deleted.
 */
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
/**
 * @name logger (from firebase-functions)
 * @description Firebase Functions logger instance.
 */
const {logger} = require("firebase-functions");
const admin = require("firebase-admin"); // Firebase Admin SDK for server-side operations.
/**
 * @name getFirestore, FieldValue (from firebase-admin/firestore)
 * @description Firestore specific utilities from the Firebase Admin SDK.
 * - `getFirestore`: Gets the Firestore service.
 * - `FieldValue`: Provides special values for database operations (e.g., serverTimestamp, increment).
 */
const {getFirestore, FieldValue} = require("firebase-admin/firestore");

// --- Firebase Admin SDK Initialization ---
// Ensures the Admin SDK is initialized once.
try {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (e) {
  logger.error("[posts.js] Admin SDK initialization error:", e);
}

// --- Firestore Database Instance ---
const db = getFirestore();

/**
 * @name updatePostLikesCount
 * @description Firebase Firestore Trigger (v2) that listens for write events (create, delete, update)
 *              on documents within the `likes` subcollection of any post (`posts/{postId}/likes/{userId}`).
 * @purpose Automatically updates the `likes` count field on the parent post document
 *          whenever a like is added or removed.
 * @param {functions.Event<functions.Change<functions.firestore.DocumentSnapshot>>} event - The event object containing
 *        data about the Firestore document change, including `params` for wildcards and `data` for before/after snapshots.
 * @returns {Promise<null>|null} A promise that resolves to null, or null directly, to indicate successful execution or no action needed.
 */
exports.updatePostLikesCount = onDocumentWritten("posts/{postId}/likes/{userId}", async (event) => {
  // event.params contains the wildcard values from the path
  const postId = event.params.postId;
  // event.data contains the Change object (before and after snapshots)
  const change = event.data;

  const postRef = db.collection("posts").doc(postId);

  let incrementValue = 0;

  // Determine if it was a like (create) or unlike (delete)
  if (!change.before.exists && change.after.exists) {
    // Document created: A user liked the post
    incrementValue = 1;
    logger.info(`Like created for post ${postId} by user ${event.params.userId}. Incrementing count.`);
  } else if (change.before.exists && !change.after.exists) {
    // Document deleted: A user unliked the post
    incrementValue = -1;
    logger.info(`Like deleted for post ${postId} by user ${event.params.userId}. Decrementing count.`);
  } else {
    // Document updated: This shouldn't happen for the like/unlike pattern, but we ignore it.
    logger.info(`Like document updated for post ${postId}. No count change needed.`);
    return null; // Exit function gracefully
  }

  // Only proceed if there's a change in count needed
  if (incrementValue !== 0) {
    try {
      // Atomically update the likes count on the parent post document
      await postRef.update({
        likes: FieldValue.increment(incrementValue),
        // You could also update an 'updatedAt' field here if desired
        // updatedAt: FieldValue.serverTimestamp()
      });
      logger.info(`Successfully updated likes count for post ${postId} by ${incrementValue}.`);
    } catch (error) {
      logger.error(`Error updating likes count for post ${postId}:`, error);
      // Optional: Re-throw error if you want the function to retry (be cautious with counters)
      // throw error;
    }
  }

  return null; // Indicate successful execution
});

// Add other post-related triggers here if needed (e.g., comment count)
