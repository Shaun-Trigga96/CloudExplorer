const admin = require('firebase-admin');

// Helper function for Firestore timestamps (DRY principle)
const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

// Helper to validate Firebase Storage URLs
const isValidFirebaseStorageUrl = (url) => {
    if (!url || typeof url !== 'string') return false; // Added type check
    return url.includes('firebasestorage.googleapis.com') ||
           url.startsWith('https://storage.googleapis.com/'); // Common Google Cloud Storage URL
};


module.exports = {
    serverTimestamp,
    isValidFirebaseStorageUrl
};