/* eslint-disable linebreak-style */
/* eslint-disable padded-blocks */
/* eslint-disable brace-style */
/* eslint-disable linebreak-style */
/* eslint-disable max-len */
// functions/src/email/index.js
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const sgMail = require("@sendgrid/mail");
const {db, logger, sendgridApiKeyParam} = require("../config/config"); // Import SendGrid API key from config

// NOTE: The 'canSendEmail' variable and consistent API key handling
// (using sendgridApiKeyParam.value()) still need to be addressed as discussed before.
// This code reflects the state before those specific debugging suggestions were applied.

exports.updateEmailSubscription = onCall(async (request) => {
  if (!request.auth) {
    logger.warn("[email.js] Function called without authentication."); throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }
  const userId = request.auth.uid;
  const {enabled} = request.data;

  if (typeof enabled !== "boolean") {
    logger.error("[email.js] Invalid argument type for \"enabled\"."); throw new HttpsError("invalid-argument", "The function must be called with a boolean \"enabled\" argument.");
  }

  logger.info(`[email.js] User ${userId} setting subscription to: ${enabled} (PARAM TEST)`);

  const apiKey = sendgridApiKeyParam.value();
  sgMail.setApiKey(apiKey);

  // Define canSendEmail (required based on previous analysis)
  const canSendEmail = true; // Example: Set true or determine from env/config

  // 4. Firestore Interaction
  const userRef = db.collection("users").doc(userId);
  try {
    // ... Firestore get/check userDoc ...
    const userDoc = await userRef.get();
    if (!userDoc.exists) {logger.error(`[email.js] User document not found: ${userId}`); throw new HttpsError("not-found", "User profile not found.");}


    const userData = userDoc && userDoc.data();
    const emailFromDoc = userData && userData.email;


    if (enabled) {
      // Only attempt to send if NOT using the fake key (adjust as needed)
      if (emailFromDoc && canSendEmail) { // Use canSendEmail flag
        // Add message object details back in
        const msg = {
          to: emailFromDoc,
          from: "cloudexplorer1996@gmail.com", // Verified sender
          subject: "Welcome to CloudExplorer Updates",
          text: "You’ve subscribed to receive progress reports and tips!",
          html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Welcome to Cloud Explorer Updates</title>
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
                  <h1>Welcome to Cloud Explorer Updates!</h1>
                  <p>You've successfully subscribed to receive progress reports and tips from Cloud Explorer.</p>
                  <p>Stay tuned for the latest updates and insights to help you on your cloud learning journey.</p>
                  <div class="footer">
                      <p>Happy Learning,</p>
                      <p>The Cloud Explorer Team</p>
                  </div>
              </div>
          </body>
          </html>
          `,
        };

        try {await sgMail.send(msg); logger.info(`[email.js] Welcome email sent to ${emailFromDoc}.`);}
        catch (emailError) {logger.error(`[email.js] SendGrid error sending to ${userId}:`, emailError);}
      } else if (emailFromDoc && !canSendEmail) {
        logger.warn(`[email.js] Would send email to ${emailFromDoc}, but email sending is disabled for test.`);
      } else if (!emailFromDoc) {
        logger.warn(`[email.js] Cannot send welcome email, user ${userId} has no email address.`);
      }

      await userRef.update({"settings.emailUpdates": true});
      // ... log success, return message ...
      logger.info(`[email.js] User ${userId} subscribed.`);
      return {message: "Successfully subscribed (param test)."};


    } else {
      // ... handle unsubscribe ...
      await userRef.update({"settings.emailUpdates": false});
      logger.info(`[email.js] User ${userId} unsubscribed.`);
      return {message: "Successfully unsubscribed (param test)."};
    }
  } catch (error) {
    // ... handle errors ...
    logger.error(`[email.js] Error processing subscription for ${userId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "An unexpected error occurred.");
  }
});
