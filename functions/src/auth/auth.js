/* eslint-disable linebreak-style */
// eslint-disable-next-line linebreak-style
/* eslint-disable padded-blocks */
/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// functions/auth.js

const {user} = require("firebase-functions/v1/auth"); // v1 Auth trigger
const {db, logger, sendgridApiKey} = require("../config/config"); // Import from config
const admin = require("firebase-admin"); // Still need admin for FieldValue
const sgMail = require("@sendgrid/mail"); // SendGrid require

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
      notificationsEnabled: false,
      darkMode: false,
      emailUpdates: true,
      syncData: false,
      soundEffects: false,
    },
  };

  try {
    // Create user profile in Firestore
    await userRef.set(newUserProfile);
    logger.info(`[auth.js] Successfully created Firestore user document for ${userRecord.uid}`);

    // Create welcome notification
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

    // Send Welcome Email via SendGrid
    if (userRecord.email) {
      try {
        // Get API key value using the params approach
        const apiKey = sendgridApiKey.value();
        logger.info(`[auth.js] SendGrid API key retrieved: ${apiKey ? "Yes" : "No"}`);

        if (!apiKey) {
          logger.error("[auth.js] SendGrid API Key is missing or not configured properly. Cannot send welcome email.");
          throw new Error("SendGrid API Key not configured.");
        }

        // Set the API key for this request
        sgMail.setApiKey(apiKey);

        const msg = {
          to: userRecord.email,
          from: "cloudexplorer1996@gmail.com", // Your verified sender
          subject: "Welcome to Cloud Explorer!",
          text: `Welcome aboard, ${newUserProfile.displayName}!\n\nWe're excited to have you join Cloud Explorer. Start exploring GCP concepts today!\n\nHappy Learning,\nThe Cloud Explorer Team`,
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
                  <p>Get ready to explore, learn, and master the concepts of GCP. We've got a ton of resources to help you on your way.</p>
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

        // Add detailed error capture
        try {
          const [response] = await sgMail.send(msg);
          logger.info(`[auth.js] Welcome email successfully sent to ${userRecord.email}. Status: ${response.data.statusCode}`);
        } catch (sendError) {
          // Log detailed error information
          logger.error(`[auth.js] SendGrid send error:`, {
            message: sendError.message,
            code: sendError.code,
            response: sendError.response.data.body || null,
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
