/* eslint-disable linebreak-style */
/* eslint-disable padded-blocks */
/* eslint-disable brace-style */
/* eslint-disable linebreak-style */
/* eslint-disable max-len */
// functions/src/email/index.js
const sgMail = require("@sendgrid/mail");
const {logger, sendgridApiKey} = require("../config/config"); // Import logger and SendGrid API key from config

// Initialize SendGrid
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
  logger.info("SendGrid API key configured");
} else {
  logger.error("SendGrid API key is missing");
}

/**
 * Sends an email using SendGrid
 * @param {Object} emailData - Email data object
 * @param {string} emailData.to - Recipient email
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.text - Plain text content
 * @param {string} emailData.html - HTML content (optional)
 * @returns {Promise} - SendGrid response or error
 */
const sendEmail = async (emailData) => {
  try {
    const apiKey = sendgridApiKey.value();
    if (!apiKey) {
      throw new Error("SendGrid API key not configured");
    }

    // Set the API key for this request
    sgMail.setApiKey(apiKey);

    const msg = {
      to: emailData.to,
      from: "cloudexplorer1996@gmail.com", // Your verified sender
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html || emailData.text,
    };

    const response = await sgMail.send(msg);
    logger.info(`Email sent to ${emailData.to}`);
    return response;
  } catch (error) {
    logger.error("SendGrid error:", {
      message: error.message,
      response: error.response ? error.response.body : null,
    });
    throw error;
  }
};

module.exports = {
  sendEmail,
};
