// backend/server.js
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
admin.initializeApp({ credential: admin.credential.cert(credentials) });

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
    const { moduleId, title, content = 'No content provided' } = req.body;    const auth = await authenticateGoogleDocs();
    await authenticateGoogleDocs();
    const docs = google.docs({ version: 'v1', auth });
    const document = await docs.documents.create({ requestBody: { title } });
    const documentId = document.data.documentId;
    if (!documentId || typeof documentId !== 'string' || documentId.trim() === '') {      throw new Error('No documentId returned');
    }
    console.log('BatchUpdate params:', { documentId, content }); // Debug log
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{ insertText: { location: { index: 1 }, text: content } }],
      },
    });

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    // Save to Firestore using provided moduleId
    if (moduleId) {
      await db.collection('modules').doc(moduleId).set({ content: docUrl }, { merge: true });
    } else if (req.body.examId) {
      await db.collection('exams').doc(req.body.examId).set({ content: docUrl }, { merge: true });
    }
    res.json({ documentId, docUrl });
  } catch (error) {
    console.error('Error creating Google Doc:', error.message);
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
    console.error('Error fetching Google Doc content:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// List all modules
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
    console.error('Error listing modules:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get a single module by moduleId
app.get('/module/:id', async (req, res) => {
  try {
    const moduleId = req.params.id;
    const moduleDoc = await db.collection('modules').doc(moduleId).get();
    if (!moduleDoc.exists) {
      return res.status(404).json({ error: 'Module not found' });
    }
    const moduleData = moduleDoc.data();
    res.json({
      id: moduleDoc.id,
      title: moduleData.title,
      description: moduleData.description || 'No description available',
      content: moduleData.content,
      duration: moduleData.duration,
      quizzes: moduleData.quizzes || [],
      prerequisites: moduleData.prerequisites || [],
      createdAt: moduleData.createdAt?.toDate(),
      updatedAt: moduleData.updatedAt?.toDate(),
    });
  } catch (error) {
    console.error('Error fetching module:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/module/:id/sections', async (req, res) => {
  try {
    const moduleId = req.params.id;
    const sectionsSnapshot = await db.collection('modules').doc(moduleId).collection('sections').get();
    if (sectionsSnapshot.empty) {
      return res.status(404).json({ error: 'No sections found for this module' });
    }
    const sections = sectionsSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      content: doc.data().content,
      order: doc.data().order,
    }));
    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
