/* eslint-disable linebreak-style */
/* eslint-disable padded-blocks */
/* eslint-disable brace-style */
/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/**
 * @file email.js
 * @description This module provides a reusable function for sending emails using SendGrid.
 *              It handles the configuration of the SendGrid API key and the construction
 *              and dispatch of email messages.
 */

// --- Imports ---

/**
 * @name sgMail
 * @description The SendGrid Mail SDK for Node.js, used to interact with the SendGrid API.
 */
const sgMail = require("@sendgrid/mail");

/**
 * @name logger, sendgridApiKey (from ../config/config)
 * @description Shared application configurations:
 * - `logger`: Firebase Functions logger instance.
 * - `sendgridApiKey`: Firebase Functions secret parameter for the SendGrid API key.
 */
const {logger, sendgridApiKey} = require("../config/config"); // Import logger and SendGrid API key from config

// --- SendGrid Initialization (Initial Attempt) ---
// Note: While this sets the API key globally at module load,
// the sendEmail function re-retrieves and sets it per call for robustness,
// especially considering how Firebase Functions params (secrets) are resolved.
if (sendgridApiKey && sendgridApiKey.value()) {
  sgMail.setApiKey(sendgridApiKey.value());
  logger.info("[email.js] SendGrid API key configured at module initialization.");
} else {
  logger.warn("[email.js] SendGrid API key not available at module initialization. Will attempt to retrieve per sendEmail call.");
}

/**
 * @name sendEmail
 * @description Asynchronously sends an email using the SendGrid service.
 * @async
 * @param {object} emailData - An object containing the details for the email.
 * @param {string} emailData.to - The recipient's email address.
 * @param {string} emailData.subject - The subject line of the email.
 * @param {string} emailData.text - The plain text content of the email.
 * @param {string} [emailData.html] - The HTML content of the email. If not provided, `emailData.text` will be used for HTML.
 * @returns {Promise<object>} A promise that resolves with the SendGrid API response upon successful email dispatch.
 * @throws {Error} Throws an error if the SendGrid API key is not configured or if SendGrid fails to send the email.
 */
const sendEmail = async (emailData) => {
  try {
    // Retrieve the SendGrid API key value. This is important as `sendgridApiKey` is a SecretParam.
    const apiKey = sendgridApiKey.value();
    if (!apiKey) {
      logger.error("[email.js] SendGrid API key is missing or not configured.");
      throw new Error("SendGrid API key not configured. Cannot send email.");
    }

    // Set the API key for the SendGrid mail client for this specific send operation.
    // This ensures the most up-to-date key is used if it were to change.
    sgMail.setApiKey(apiKey);

    /**
     * @name msg
     * @description The email message object configured for SendGrid.
     */
    const msg = {
      to: emailData.to,
      from: "cloudexplorer1996@gmail.com", // IMPORTANT: This email address must be a verified sender in SendGrid.
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html || emailData.text, // Use text content as HTML if HTML is not provided
    };

    logger.info(`[email.js] Attempting to send email to ${emailData.to} with subject "${emailData.subject}"`);
    const response = await sgMail.send(msg);
    logger.info(`[email.js] Email successfully sent to ${emailData.to}. SendGrid Response Status: ${response[0] ? response[0].statusCode : "N/A"}`);
    return response;
  } catch (error) { // Catch errors related to SendGrid operations or API key issues.
    logger.error("[email.js] Error sending email via SendGrid:", {
      message: error.message,
      statusCode: error.code, // SendGrid errors often have a 'code' property for HTTP status
      responseBody: error.response ? error.response.body : "No response body",
      recipient: emailData.to, // Log recipient for easier debugging
    });
    throw error; // Re-throw the error to be handled by the caller.
  }
};

// --- Exports ---
/**
 * @description Exports the sendEmail function for use in other parts of the application.
 */
module.exports = {
  sendEmail,
};
