const admin = require('firebase-admin');

/**
 * @file firestoreHelpers.js
 * @description This file contains helper functions related to Firebase Firestore and Storage.
 */

/**
 * @desc    Returns a Firestore server timestamp.
 *          This is a placeholder that Firestore replaces with the server's current time
 *          when the document is written.
 * @returns {admin.firestore.FieldValue} A Firestore server timestamp field value.
 */
const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

/**
 * @desc    Validates if a given URL is a Firebase Storage URL or a common Google Cloud Storage URL.
 * @param   {string} url - The URL string to validate.
 * @returns {boolean} True if the URL is a valid Firebase/Google Cloud Storage URL, false otherwise.
 */
const isValidFirebaseStorageUrl = (url) => {
    if (!url || typeof url !== 'string') return false; // Added type check
    return url.includes('firebasestorage.googleapis.com') ||
           url.startsWith('https://storage.googleapis.com/'); // Common Google Cloud Storage URL
};

module.exports = {
    serverTimestamp,
    isValidFirebaseStorageUrl
};