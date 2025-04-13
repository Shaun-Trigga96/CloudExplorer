// backend/controllers/emailController.js
const AppError = require('../utils/appError');
const sgMail = require('@sendgrid/mail'); // Import SendGrid
const {db, logger, sendgridApiKey} = require('../../functions/src/config/config'); // Import SendGrid API key from config


// POST /update-subscription
exports.updateEmailSubscription = async (req, res, next) => {
  try {
    const {userId} = req.body; // Assuming userId is passed in the body
    const {enabled} = req.body; // Whether to enable or disable email updates

    // --- Input Validation ---
    if (!userId || typeof userId !== 'string') {
      return next(
        new AppError('Valid userId is required.', 400, 'INVALID_USER_ID'),
      );
    }
    if (enabled === undefined || typeof enabled !== 'boolean') {
      return next(
        new AppError(
          'Valid "enabled" (boolean) is required.',
          400,
          'INVALID_ENABLED_VALUE',
        ),
      );
    }

    // --- Get User Document ---
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return next(new AppError('User not found.', 404, 'USER_NOT_FOUND'));
    }

    const userData = userDoc.data();
    const emailFromDoc = userData.email;

    // --- Update User Settings in Firestore ---
    await userRef.update({'settings.emailUpdates': enabled});

    // --- Send Confirmation Email (if enabled) ---
    if (enabled && emailFromDoc) {
      try {
        const apiKey = sendgridApiKey.value(); // Get API key from config parameter
        if (!apiKey) {
          logger.error(
            '[email.js] SendGrid API Key is missing or not configured properly. Cannot send welcome email.',
          );
          throw new Error('SendGrid API Key not configured.'); // Prevent sending attempt
        }
        sgMail.setApiKey(apiKey);

        const msg = {
          to: emailFromDoc,
          from: 'cloudexplorer1996@gmail.com', // Replace with your verified sender
          subject: enabled
            ? 'Welcome to Cloud Explorer Updates'
            : 'Cloud Explorer Updates - Unsubscribed',
          text: enabled
            ? 'You have subscribed to receive progress reports and tips!'
            : 'You have unsubscribed from Cloud Explorer updates.',
          html: enabled
            ? `
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
                    .logo {
                        display: block;
                        margin: 0 auto 20px;
                        max-width: 150px;
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
            `
            : `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cloud Explorer Updates - Unsubscribed</title>
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
                    .logo {
                        display: block;
                        margin: 0 auto 20px;
                        max-width: 150px;
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
                </style>
            </head>
            <body>
                <div class="container">
                  <img src="https://firebasestorage.googleapis.com/v0/b/cloud-explorer-c3d98.firebasestorage.app/o/cloud_explorer.png?alt=media&token=cb42c19a-5be2-4b3d-a8ec-fef71d02a698" alt="Cloud Explorer Logo" class="logo">
                    <h1>Cloud Explorer Updates - Unsubscribed</h1>
                    <p>You've successfully unsubscribed from Cloud Explorer updates.</p>
                    <p>You will no longer receive progress reports and tips.</p>
                    <div class="footer">
                        <p>Happy Learning,</p>
                        <p>The Cloud Explorer Team</p>
                    </div>
                </div>
            </body>
            </html>
            `,
        };

        await sgMail.send(msg);
        console.log(
          `Confirmation email sent to ${emailFromDoc} (enabled: ${enabled})`,
        );
      } catch (emailError) {
        console.error(
          `Error sending confirmation email to ${emailFromDoc}:`,
          emailError,
        );
        // Decide if email failure should cause overall failure or just log
      }
    } else if (!emailFromDoc) {
      console.warn(
        `User ${userId} has no email address. Cannot send confirmation.`,
      );
    }

    // --- Respond to Client ---
    res.json({
      message: `Email updates ${enabled ? 'enabled' : 'disabled'} successfully.`,
      emailUpdates: enabled,
    });
  } catch (error) {
    console.error(
      `Error updating email subscription for user ${req.body.userId}:`,
      error,
    );
    next(error);
  }
};
