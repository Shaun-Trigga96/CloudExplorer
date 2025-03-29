/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// functions/auth.js
const {user} = require("firebase-functions/v1/auth"); // v1 Auth trigger
const {db, logger} = require("../config/config"); // Get shared db and logger
const admin = require("firebase-admin"); // Still need admin for FieldValue

// --- Auth Trigger Function ---
exports.initializeNewUser = user().onCreate(async (userRecord) => {
  // Use logger and db from config.js
  logger.info(`[auth.js] Auth onCreate triggered for new user: ${userRecord.uid}, Email: ${userRecord.email}`);

  const userRef = db.collection("users").doc(userRecord.uid);

  const newUserProfile = {
    uid: userRecord.uid,
    email: userRecord.email || null,
    displayName: userRecord.displayName || "New Explorer",
    photoURL: userRecord.photoURL || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    bio: "",
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    learningProgress: {
      completedModules: [],
      completedQuizzes: [],
      completedExams: [],
      score: 0,
    },
    settings: {
      notificationsEnabled: true,
      darkMode: false,
      emailUpdates: true,
      syncData: true,
      soundEffects: false,
    },
  };

  try {
    await userRef.set(newUserProfile);
    logger.info(`[auth.js] Successfully created Firestore user document for ${userRecord.uid}`);

    const notificationRef = db.collection("notifications").doc();
    await notificationRef.set({
      notificationId: notificationRef.id,
      userId: userRecord.uid,
      title: "Welcome to Cloud Explorer!",
      message: "Your cloud learning adventure begins now. Explore modules and take quizzes!",
      type: "welcome",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.info(`[auth.js] Welcome notification created for user ${userRecord.uid}`);
    return {success: true, message: `User ${userRecord.uid} initialized`};
  } catch (error) {
    logger.error(`[auth.js] Failed to create Firestore document or notification for user ${userRecord.uid}:`, error);
  }
});
