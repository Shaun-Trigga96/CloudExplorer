const { google } = require('googleapis');
const path = require('path');
const AppError = require('./appError'); // Use AppError from utils

// Resolve credentials path relative to this file's location if needed, or rely on absolute path from env
// This assumes FIREBASE_SERVICE_ACCOUNT_PATH in .env is relative to the project root OR absolute.
// If relative, adjust path.resolve accordingly. E.g., path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    console.error('CRITICAL: FIREBASE_SERVICE_ACCOUNT_PATH is not defined in .env');
    process.exit(1); // Exit if path is missing
}
const absoluteCredentialsPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);


const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
];

// Cache auth client
let authClient = null;

async function authenticateGoogleDocs() {
  if (authClient) {
    // Optional: Add logic here to check token expiry if using user credentials/OAuth2
    // For service accounts, the client usually handles token refresh internally.
    return authClient;
  }

  try {
    const credentials = require(absoluteCredentialsPath); // Load credentials here
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
    authClient = await auth.getClient();
    console.log('Google Auth Client Initialized Successfully.');
    return authClient;
  } catch (error) {
    console.error('Error authenticating with Google:', error.message);
    // Check if the error is due to file not found
    if (error.code === 'MODULE_NOT_FOUND') {
        console.error(`Credentials file not found at: ${absoluteCredentialsPath}`);
         throw new AppError(
          `Service account credentials file not found. Check FIREBASE_SERVICE_ACCOUNT_PATH in .env. Path: ${absoluteCredentialsPath}`,
          500,
          'GOOGLE_AUTH_CREDENTIALS_MISSING'
        );
    }
    // General authentication error
    throw new AppError(
      'Failed to authenticate with Google APIs. Check service account credentials and permissions.',
      500,
      'GOOGLE_AUTH_ERROR'
    );
  }
}

module.exports = { authenticateGoogleDocs };