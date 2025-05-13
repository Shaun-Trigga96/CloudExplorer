/* eslint-disable linebreak-style */
// functions/src/admin/populateData.js
/* eslint-disable max-len */
/**
 * @file populateLearningOptions.js
 * @description This file contains an HTTP-triggered Firebase Cloud Function
 *              used to populate or overwrite the 'providers' and 'paths' collections
 *              in Firestore with predefined data. This is typically used for initial
 *              data setup or for development/testing purposes.
 */

// --- Imports ---
/**
 * @name onRequest (from firebase-functions/v2/https)
 * @description Firebase Functions v2 HTTP trigger for creating HTTPS-callable functions.
 */
const {onRequest} = require("firebase-functions/v2/https");
/**
 * @name getFirestore (from firebase-admin/firestore)
 * @description Firestore specific utility from the Firebase Admin SDK to get the Firestore service.
 */
const {getFirestore} = require("firebase-admin/firestore");
const admin = require("firebase-admin"); // Firebase Admin SDK for privileged server-side operations.

if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log("[populateLearningOptions] Firebase Admin SDK initialized.");
  } catch (e) {
    console.error("[populateLearningOptions] Firebase Admin SDK initialization error:", e);
  }
}

// --- Firestore Database Instance ---
const db = getFirestore();

// --- Define the Data to Populate ---
/**
 * @name providersData
 * @description An array of objects representing cloud providers to be added to the 'providers' collection.
 *              Each object defines a provider's ID, name, and logo URL.
 */
const providersData = [
  {
    id: "gcp",
    name: "Google Cloud Platform",
    logoUrl: "https://firebasestorage.googleapis.com/v0/b/cloud-explorer-c3d98.firebasestorage.app/o/google-cloud-logo.png?alt=media&token=ab12229e-37d8-4e22-a72a-4cbcac575e44",
  },
  {
    id: "aws",
    name: "Amazon Web Services",
    logoUrl: "https://firebasestorage.googleapis.com/v0/b/cloud-explorer-c3d98.firebasestorage.app/o/aws-logo.png?alt=media&token=e304ffc0-b3be-457d-978e-2dbb19b7cc91",
  },
  {
    id: "azure",
    name: "Microsoft Azure",
    logoUrl: "https://firebasestorage.googleapis.com/v0/b/cloud-explorer-c3d98.firebasestorage.app/o/azure-logo.png?alt=media&token=f197651d-ec24-44e1-9693-f22e97fd18dc",
  },
];

/**
 * @name pathsData
 * @description An array of objects representing learning paths to be added to the 'paths' collection.
 *              Each object defines a path's ID, name, associated providerId, logo URL, description,
 *              and counts for total modules, quizzes, and exams.
 */
const pathsData = [
  // GCP Paths
  {
    id: "cdl",
    name: "Cloud Digital Leader",
    providerId: "gcp",
    logoUrl: "https://firebasestorage.googleapis.com/v0/b/cloud-explorer-c3d98.firebasestorage.app/o/cloud-digital-leader.png?alt=media&token=a1248ab9-76f7-4ec0-a232-80340471bfc4",
    description: "Validate your knowledge and skills in digital transformation using Google Cloud.",
    totalModules: 6,
    totalQuizzes: 6,
    totalExams: 1,
  },,
  // AWS Paths
  {
    id: "ccp",
    name: "AWS Certified Cloud Practitioner",
    providerId: "aws",
    logoUrl: "https://firebasestorage.googleapis.com/v0/b/cloud-explorer-c3d98.firebasestorage.app/o/cloud-practitioner.png?alt=media&token=dd6bc080-4703-4608-bf71-aecf379aa9a7",
    description: "Understand AWS Cloud concepts, services, and terminology.",
    totalModules: 10,
    totalQuizzes: 10,
    totalExams: 1,
  },
  // Azure Paths
  {
    id: "az900",
    name: "Microsoft Azure Fundamentals (AZ-900)",
    providerId: "azure",
    logoUrl: "https://firebasestorage.googleapis.com/v0/b/cloud-explorer-c3d98.firebasestorage.app/o/az-900.png?alt=media&token=e6ae1c2d-1b44-410e-8a74-b2b9f940e4ec",
    description: "Understand cloud concepts, core Azure services, security, privacy, and pricing.",
    totalModules: 5,
    totalQuizzes: 5,
    totalExams: 1,
  },
];

/**
 * @name populateLearningOptions
 * @description An HTTP-triggered Firebase Function (v2) that populates the 'providers'
 *              and 'paths' collections in Firestore with the data defined in
 *              `providersData` and `pathsData`. This function will overwrite existing
 *              documents if they have the same ID.
 * @param {object} req - The HTTP request object (not used in this function but required by the trigger).
 * @param {object} res - The HTTP response object used to send back the status of the operation.
 */
exports.populateLearningOptions = onRequest({
  region: "us-central1", // Specifies the region for the function.
  minInstances: 0, // Allows the function to scale down to zero instances when not in use.
  maxInstances: 1, // Limits the function t
}, async (req, res) => {
  console.log("[populateLearningOptions] Starting population of 'providers' and 'paths' collections...");

  const batch = db.batch();

  // --- Populate Providers Collection ---
  console.log(`[populateLearningOptions] Preparing to set ${providersData.length} providers...`);
  providersData.forEach((provider) => {
    const {id, ...data} = provider; // Destructure to separate the document ID from the rest of the data.
    if (!id) {
      console.warn("[populateLearningOptions] Skipping provider with missing ID:", provider);
      return;
    }
    const providerRef = db.collection("providers").doc(id);
    batch.set(providerRef, data, {merge: false});
  });

  // --- Populate Paths Collection ---
  console.log(`[populateLearningOptions] Preparing to set ${pathsData.length} paths...`);
  pathsData.forEach((path) => {
    const {id, ...data} = path; // Destructure to separate the document ID.
    if (!id) {
      console.warn("[populateLearningOptions] Skipping path with missing ID:", path);
      return;
    }
    if (!data.providerId) {
      // Essential for linking paths to providers.
      console.warn(`[populateLearningOptions] Skipping path '${id}' because it's missing providerId.`);
      return;
    }
    const pathRef = db.collection("paths").doc(id);
    // Add a 'set' operation to the batch. `merge: false` ensures a complete overwrite.
    batch.set(pathRef, data, {merge: false}); // Using merge:false for a clean overwrite.
  });

  // --- Commit Batch and Send Response ---
  try {
  // Atomically commit all the 'set' operations i
    await batch.commit();
    const successMsg = `[populateLearningOptions] Successfully populated/overwritten ${providersData.length} providers and ${pathsData.length} paths.`;
    console.log(successMsg); // Log success to Firebase console.
    // Send a success response to the HTTP caller.
    res.status(200).send({
      status: "success",
      message: successMsg,
      data: {
        providersCount: providersData.length,
        pathsCount: pathsData.length,
      },
    });
  } catch (error) {
    console.error("[populateLearningOptions] Error committing population batch:", error);
    res.status(500).send({
      // Send an error response if the batch commit fails.
      status: "error",
      message: `Error populating data: ${error.message}`,
    });
  }
});
