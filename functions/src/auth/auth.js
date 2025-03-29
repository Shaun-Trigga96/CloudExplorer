/* eslint-disable linebreak-style */
// eslint-disable-next-line linebreak-style
/* eslint-disable padded-blocks */
/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// functions/auth.js
const {user} = require("firebase-functions/v1/auth"); // v1 Auth trigger
const {db, logger, sendgridApiKeyParam} = require("../config/config"); // Get shared db and logger
const admin = require("firebase-admin"); // Still need admin for FieldValue
const sgMail = require("@sendgrid/mail"); // *** Add SendGrid require ***

// --- Auth Trigger Function ---
exports.initializeNewUser = user().onCreate(async (userRecord) => {
  // Use logger and db from config.js
  logger.info(`[auth.js] Auth onCreate triggered for new user: ${userRecord.uid}, Email: ${userRecord.email}`);

  // --- Basic check for email ---
  if (!userRecord.email) {
    logger.warn(`[auth.js] User ${userRecord.uid} created without an email address. Skipping welcome email.`);
    // Proceed to create profile without sending email
  }

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

  // 3. *** Send Welcome Email via SendGrid ***
  if (userRecord.email) { // Only attempt if email exists
    try {
      const apiKey = sendgridApiKeyParam.value(); // Get API key from config parameter
      if (!apiKey) {
        logger.error("[auth.js] SendGrid API Key is missing or not configured properly. Cannot send welcome email.");
        throw new Error("SendGrid API Key not configured."); // Prevent sending attempt
      }
      sgMail.setApiKey(apiKey);

      const msg = {
        to: userRecord.email, // Use email from userRecord
        from: "cloudexplorer1996@gmail.com", // *** Use your verified SendGrid sender email ***
        subject: "Welcome to Cloud Explorer!",
        // You can use HTML content for richer emails
        text: `Welcome aboard, ${newUserProfile.displayName}!\n\nWe're excited to have you join Cloud Explorer. Start exploring GCP concepts today!\n\nHappy Learning,\nThe Cloud Explorer Team`,
        // html: "<strong>HTML version of the email</strong>", // Optional HTML content
      };

      logger.info(`[auth.js] Attempting to send welcome email to ${userRecord.email}...`);
      await sgMail.send(msg);
      logger.info(`[auth.js] Welcome email successfully sent to ${userRecord.email}.`);

    } catch (emailError) {
      logger.error(`[auth.js] Failed to send welcome email to ${userRecord.email} for user ${userRecord.uid}:`, emailError);
      // Log the error but don't prevent the function from completing successfully overall
      // If email is critical, you might want to re-throw or handle differently
    }
  } else {
    logger.info(`[auth.js] No email address provided for user ${userRecord.uid}, skipping welcome email send.`);
  }

  return {success: true, message: `User ${userRecord.uid} initialized successfully.`};
});
