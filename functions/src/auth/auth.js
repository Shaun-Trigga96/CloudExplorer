/* eslint-disable linebreak-style */
// eslint-disable-next-line linebreak-style
/* eslint-disable padded-blocks */
/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// functions/auth.js
/**
 * @file auth.js
 * @description This file contains Firebase Cloud Functions related to user authentication events.
 * Specifically, it handles the creation of new users, initializing their profiles,
 * sending welcome notifications, and dispatching welcome emails via SendGrid.
 */

// --- Imports ---

/**
 * @name user (from firebase-functions/v1/auth)
 * @description Firebase Functions v1 Authentication trigger. Used to listen for user creation events.
 */
const {user} = require("firebase-functions/v1/auth");

/**
 * @name db, logger, sendgridApiKey (from ../config/config)
 * @description Shared application configurations:
 * - `db`: Firestore database instance.
 * - `logger`: Firebase Functions logger instance.
 * - `sendgridApiKey`: Firebase Functions secret parameter for the SendGrid API key.
 */
const {db, logger, sendgridApiKey} = require("../config/config");
const admin = require("firebase-admin"); // Firebase Admin SDK, used here for FieldValue.serverTimestamp().
const sgMail = require("@sendgrid/mail"); // SendGrid Mail SDK for sending emails.

// --- Auth Trigger Function ---

/**
 * @name initializeNewUser
 * @description Firebase Cloud Function triggered when a new Firebase Authentication user is created.
 * @purpose This function performs several initialization tasks for a new user:
 * 1. Creates a user profile document in the Firestore 'users' collection.
 * 2. Creates a welcome notification for the user in the 'notifications' collection.
 * 3. Sends a welcome email to the user via SendGrid (if an email address is provided).
 *
 * @param {functions.auth.UserRecord} userRecord - The Firebase Auth UserRecord object for the newly created user.
 * @returns {Promise<{success: boolean, message: string}>} A promise that resolves with a success object or throws an error.
 */
exports.initializeNewUser = user().onCreate(async (userRecord) => {
  // Use logger and db from config.js
  logger.info(`[auth.js] Auth onCreate triggered for new user: ${userRecord.uid}, Email: ${userRecord.email}`);

  // --- Basic check for email ---
  if (!userRecord.email) {
    logger.warn(`[auth.js] User ${userRecord.uid} created without an email address. Skipping welcome email.`);
    // Proceed to create profile without sending email
  }

  const userRef = db.collection("users").doc(userRecord.uid);

  /**
   * @name newUserProfile
   * @description An object representing the structure and initial data for a new user's profile
   *              to be stored in the Firestore 'users' collection.
   */
  const newUserProfile = {
    uid: userRecord.uid,
    email: userRecord.email || null,
    displayName: userRecord.displayName || "New Explorer",
    photoURL: userRecord.photoURL || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    bio: "",
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    learningPathsCount: 0,
    hasActivePath: false, // Indicates if the user has an active learning path
    activePath: null,
    settings: {
      notificationsEnabled: false,
      darkMode: false,
      emailUpdates: false,
      syncData: false,
      soundEffects: false,
    },
  };

  try {
    // Step 1: Create user profile document in Firestore
    await userRef.set(newUserProfile);
    logger.info(`[auth.js] Successfully created Firestore user document for ${userRecord.uid}`);

    // Step 2: Create a welcome notification for the user
    // This notification will appear in-app.
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

    // Step 3: Send Welcome Email via SendGrid, if the user has an email address.
    if (userRecord.email) {
      try {
        // Retrieve the SendGrid API key from Firebase Functions secrets.
        // The `sendgridApiKey` is a SecretParam defined in config.js.
        const apiKey = sendgridApiKey.value();
        logger.info(`[auth.js] SendGrid API key retrieved: ${apiKey ? "Yes" : "No"}`);

        if (!apiKey) {
          logger.error("[auth.js] SendGrid API Key is missing or not configured properly. Cannot send welcome email.");
          throw new Error("SendGrid API Key not configured.");
        }

        // Set the API key for the SendGrid mail client for this specific operation.
        sgMail.setApiKey(apiKey);

        /**
         * @name msg
         * @description The email message object configured for SendGrid.
         *              Includes recipient, sender, subject, plain text content, and HTML content.
         */
        const msg = {
          to: userRecord.email,
          from: "cloudexplorer1996@gmail.com", // IMPORTANT: This email address must be a verified sender in SendGrid.
          subject: "Welcome to Cloud Explorer!",
          text: `Welcome aboard, ${newUserProfile.displayName}!\n\nWe're excited to have you join Cloud Explorer. Start exploring cloud concepts today!\n\nHappy Learning,\nThe Cloud Explorer Team`,
          // HTML content for a richer email experience.
          html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to Cloud Explorer!</title>
              <style>
                  body {
                      font-family: Arial, sans-serif;
                      background-color: #f4f4f4;
                      color: #333;
                      margin: 0;
                      padding: 0;
                  }
                  .container {
                      max-width: 600px;
                      margin: 20px auto;
                      background-color: #fff;
                      padding: 30px;
                      border-radius: 5px;
                      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                  }
                  h1 {
                      color: #007bff;
                  }
                  p {
                      line-height: 1.6;
                  }
                  .button {
                      display: inline-block;
                      background-color: #007bff;
                      color: #fff;
                      padding: 10px 20px;
                      text-decoration: none;
                      border-radius: 5px;
                  }
                  .footer {
                      margin-top: 20px;
                      font-size: 0.8em;
                      color: #777;
                  }
                  .logo {
                     display: block;
                     margin: 0 auto 20px;
                    max-width: 150px;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <img src="https://firebasestorage.googleapis.com/v0/b/cloud-explorer-c3d98.firebasestorage.app/o/cloud_explorer.png?alt=media&token=cb42c19a-5be2-4b3d-a8ec-fef71d02a698" alt="Cloud Explorer Logo" class="logo">
                  <h1>Welcome to Cloud Explorer, ${newUserProfile.displayName}!</h1>
                  <p>We're thrilled to welcome you to the Cloud Explorer community! Your journey into the world of cloud computing starts now.</p>
                  <p>Get ready to explore, learn, and master the concepts of cloud platforms. We've got a ton of resources to help you on your way.</p>
                  <a href="https://your-cloud-explorer-app-url.com" class="button">Start Exploring</a>
                  <div class="footer">
                      <p>Happy Learning,</p>
                      <p>The Cloud Explorer Team</p>
                  </div>
              </div>
          </body>
          </html>
          `,
        };

        logger.info(`[auth.js] Attempting to send welcome email to ${userRecord.email}...`);

        // Send the email using SendGrid.
        try {
          const [response] = await sgMail.send(msg);
          logger.info(`[auth.js] Welcome email successfully sent to ${userRecord.email}. Status: ${response.statusCode || "Unknown"}`);
        } catch (sendError) { // Catch errors specifically from sgMail.send()
          // Log detailed error information
          logger.error(`[auth.js] SendGrid send error:`, {
            message: sendError.message,
            code: sendError.code,
            response: (sendError.response && sendError.response.data && sendError.response.data.body) || null,
          });
          throw sendError; // Re-throw to be caught by outer catch
        }
      } catch (emailError) {
        logger.error(`[auth.js] Failed to send welcome email to ${userRecord.email} for user ${userRecord.uid}:`, emailError);
        // Log but don't fail the function
      }
    } else {
      logger.info(`[auth.js] No email address provided for user ${userRecord.uid}, skipping welcome email send.`);
    }

    return {success: true, message: `User ${userRecord.uid} initialized successfully.`};
  } catch (error) {
    logger.error(`[auth.js] Failed to create Firestore document or notification for user ${userRecord.uid}:`, error);
    throw error; // Re-throw to mark function as failed
  }
});
// --- End of Auth Trigger Function ---
