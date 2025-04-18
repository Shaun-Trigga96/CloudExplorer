/* eslint-disable linebreak-style */
// functions/src/admin/populateData.js
/* eslint-disable max-len */
const {onRequest} = require("firebase-functions/v2/https");
const {getFirestore} = require("firebase-admin/firestore");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  try {
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized in populateData.");
  } catch (e) {
    console.error("Firebase Admin SDK initialization error in populateData:", e);
  }
}
const db = getFirestore();

// --- Define the Data to Populate ---
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
    totalModules: 5,
    totalQuizzes: 5,
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

exports.populateLearningOptions = onRequest({
  region: "us-central1",
  minInstances: 0,
  maxInstances: 1,
}, async (req, res) => {
  console.log("Starting population of 'providers' and 'paths' collections...");

  const batch = db.batch();

  // Populate Providers
  console.log(`Preparing to set ${providersData.length} providers...`);
  providersData.forEach((provider) => {
    const {id, ...data} = provider;
    if (!id) {
      console.warn("Skipping provider with missing ID:", provider);
      return;
    }
    const providerRef = db.collection("providers").doc(id);
    batch.set(providerRef, data, {merge: false});
  });

  // Populate Paths
  console.log(`Preparing to set ${pathsData.length} paths...`);
  pathsData.forEach((path) => {
    const {id, ...data} = path;
    if (!id) {
      console.warn("Skipping path with missing ID:", path);
      return;
    }
    if (!data.providerId) {
      console.warn(`Skipping path '${id}' because it's missing providerId.`);
      return;
    }
    const pathRef = db.collection("paths").doc(id);
    batch.set(pathRef, data, {merge: false});
  });

  try {
    await batch.commit();
    const successMsg = `Successfully populated/overwritten ${providersData.length} providers and ${pathsData.length} paths.`;
    console.log(successMsg);
    res.status(200).send({
      status: "success",
      message: successMsg,
      data: {
        providersCount: providersData.length,
        pathsCount: pathsData.length,
      },
    });
  } catch (error) {
    console.error("Error committing population batch:", error);
    res.status(500).send({
      status: "error",
      message: `Error populating data: ${error.message}`,
    });
  }
});
