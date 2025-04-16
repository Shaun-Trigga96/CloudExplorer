/* eslint-disable linebreak-style */
// eslint-disable-next-line linebreak-style
/* eslint-disable padded-blocks */
/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// functions/src/community/posts.js
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");

// Initialize Admin SDK if not already done (usually in index.js or a config file)
try {
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (e) {
  logger.error("Admin SDK initialization error in posts.js:", e);
}

const db = getFirestore();

/**
 * Triggered when a document in the 'likes' subcollection of any post is written (created, updated, deleted).
 * Updates the 'likes' count on the parent post document.
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
