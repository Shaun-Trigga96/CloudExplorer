const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// Validate credentials path
const credentialsPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!credentialsPath) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not defined in .env');
}

// Resolve the credentials path relative to the backend directory
const absoluteCredentialsPath = path.resolve(__dirname, credentialsPath);
console.log('Loading credentials from:', absoluteCredentialsPath);
const credentials = require(absoluteCredentialsPath);

// Initialize Firebase Admin SDK
admin.initializeApp({credential: admin.credential.cert(credentials)});

const db = admin.firestore();

const SCOPES = ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive'];

async function authenticateGoogleDocs() {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
  return await auth.getClient();
}

// Create a Google Doc and save to Firestore
app.post('/create-doc', async (req, res) => {
  try {
    const { title, content, moduleId } = req.body;
    const auth = await authenticateGoogleDocs();
    const docs = google.docs({ version: 'v1', auth });

    const document = await docs.documents.create({ requestBody: { title } });
    const documentId = document.data.documentId;
    if (!documentId) {throw new Error('No documentId returned');}

    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{ insertText: { location: { index: 1 }, text: content } }],
      },
    });

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    // Save to Firestore
    await db.collection('modules').doc(moduleId || documentId).set({
      title,
      content: docUrl,
      description: 'Auto-generated module',
      duration: 60,
      quizzes: [],
      prerequisites: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    res.json({ documentId, docUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Google Doc content
app.get('/get-doc-content/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    const auth = await authenticateGoogleDocs();
    const docs = google.docs({ version: 'v1', auth });

    const response = await docs.documents.get({ documentId: docId });
    res.json(response.data.body?.content || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/list-modules', async (req, res) => {
  try {
    const modulesSnapshot = await db.collection('modules').get();
    const modules = modulesSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      description: doc.data().description || 'No description available',
      content: doc.data().content, // Google Doc URL
      duration: doc.data().duration,
      quizzes: doc.data().quizzes || [],
      prerequisites: doc.data().prerequisites || [],
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));
    res.json(modules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

