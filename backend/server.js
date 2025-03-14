// backend/server.js
const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const morgan = require('morgan'); // For logging HTTP requests

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const app = express();
app.use(cors({ origin: '*' })); // Allow all origins (for development)
app.use(express.json());
app.use(morgan('dev')); // Add request logging

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

// Cache auth client to avoid recreating for each request
let authClient = null;
async function authenticateGoogleDocs() {
  if (authClient) {return authClient;}

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
  authClient = await auth.getClient();
  return authClient;
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

// Create a Google Doc and save to Firestore
app.post('/create-doc', async (req, res, next) => {
  try {
    const { moduleId, title, content = 'No content provided' } = req.body;
    const auth = await authenticateGoogleDocs();
    const docs = google.docs({ version: 'v1', auth });

    const document = await docs.documents.create({ requestBody: { title } });
    const documentId = document.data.documentId;

    if (!documentId || typeof documentId !== 'string' || documentId.trim() === '') {
      throw new Error('No documentId returned');
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
    } else {
      throw new Error('Either moduleId or examId is required');
    }

    res.json({ documentId, docUrl });
  } catch (error) {
    next(error); // Pass to error handler
  }
});

// Get Google Doc content with better error handling
app.get('/get-doc-content/:docId', async (req, res, next) => {
  try {
    const { docId } = req.params;

    if (!docId || typeof docId !== 'string' || docId.trim() === '') {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const auth = await authenticateGoogleDocs();
    const docs = google.docs({ version: 'v1', auth });

    const response = await docs.documents.get({ documentId: docId });

    if (!response.data || !response.data.body) {
      return res.status(404).json({ error: 'Document content not found' });
    }

    res.json(response.data.body?.content || []);
  } catch (error) {
    // Check for specific error types
    if (error.code === 404 || (error.response && error.response.status === 404)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (error.code === 403 || (error.response && error.response.status === 403)) {
      return res.status(403).json({ error: 'Permission denied to access document' });
    }
    next(error);
  }
});

// List all modules with pagination
app.get('/list-modules', async (req, res, next) => {
  try {
    const { limit = 10, lastId } = req.query;
    let query = db.collection('modules').orderBy('updatedAt', 'desc').limit(parseInt(limit, 10));

    if (lastId) {
      const lastDoc = await db.collection('modules').doc(lastId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const modulesSnapshot = await query.get();
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

    res.json({
      modules,
      hasMore: modules.length === parseInt(limit, 10),
      lastId: modules.length > 0 ? modules[modules.length - 1].id : null,
    });
  } catch (error) {
    next(error);
  }
});

// Get a single module by moduleId
app.get('/module/:id', async (req, res, next) => {
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
    next(error);
  }
});

// Get sections for a module
app.get('/module/:id/sections', async (req, res, next) => {
  try {
    const moduleId = req.params.id;
    const sectionsSnapshot = await db.collection('modules')
      .doc(moduleId)
      .collection('sections')
      .orderBy('order')
      .get();

    if (sectionsSnapshot.empty) {
      return res.json([]); // Return empty array instead of 404 error
    }

    const sections = sectionsSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      content: doc.data().content,
      order: doc.data().order,
    }));

    res.json(sections);
  } catch (error) {
    next(error);
  }
});

// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
