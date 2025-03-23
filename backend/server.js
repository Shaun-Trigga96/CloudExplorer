/* eslint-disable no-useless-escape */
// backend/server.js
const express = require('express');
const cors = require('cors');
const {google} = require('googleapis');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const morgan = require('morgan');
const {HfInference} = require('@huggingface/inference');
const rateLimit = require('express-rate-limit');

dotenv.config({path: path.resolve(__dirname, '..', '.env')});


// Centralized Error Handling Class
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;  // Distinguish operational errors from programming errors
    this.code = code; // Add an optional error code

    Error.captureStackTrace(this, this.constructor);
  }
}

// **1. Enhanced Error Handling Middleware** (Centralized and Improved)
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err); // Always log the full error

  // Default to 500 Internal Server Error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details = {};


   if (err.isOperational) {
        // Use the values from the AppError
        statusCode = err.statusCode;
        message = err.message;
   } else {
     // Handle non-operational errors (programming errors, etc.)
     // In a production environment, you might not want to expose detailed error messages.
     message = 'Internal Server Error'; // Generic message for non-operational errors.
     // Consider more robust logging here, possibly sending to an error tracking service.
   }

    // Handle specific error codes from Google APIs, Hugging Face, etc.
    if (err.code === '8' || (err.message && err.message.includes('Quota exceeded'))) {
        statusCode = 429; // Too Many Requests
        message = 'API Quota Exceeded. Please try again later.';
    } else if(err.message && err.message.includes('Document not found')){
        statusCode = 404;
        message = 'Google doc not found.';
    } else if (err.code === 404) {
        statusCode = 404;
        message = 'Not Found';
    } else if (err.code === 403) {
        statusCode = 403;
        message = 'Forbidden';
    }else if (err.message && err.message.includes('Network')) {
      statusCode = 503; // Service Unavailable
      message = 'Network error. Please try again.';
    } else if (err.name === 'AbortError') {
         statusCode = 504;
         message = 'Request timed out';
    }

    // Add detailed response in development for debugging
    if (process.env.NODE_ENV === 'development') {
        details.stack = err.stack;
        if (err.response && err.response.data) {
          details.apiResponse = err.response.data; // Include API response details if available
        }
        if (err.errors) {
            details.errors = err.errors; // Include validation errors, if any.
        }
    }

    res.status(statusCode).json({
        error: message,
        details: Object.keys(details).length > 0 ? details : undefined, // Only include details if present
    });
};



const hfApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  message: 'Too many requests from this IP, please try again after a minute',
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize Hugging Face Inference API
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

const app = express();
app.use(cors({origin: '*'})); //  Allow all origins (for development) -  Restrict in production!
app.use(express.json());
app.use(morgan('combined')); // Use 'tiny' or 'combined' in production for less verbose logging


// Validate credentials path and initialize Firebase
if (!process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not defined in .env');
}
const absoluteCredentialsPath = path.resolve(__dirname, process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
console.log('Loading credentials from:', absoluteCredentialsPath);

try {
    const credentials = require(absoluteCredentialsPath);
    admin.initializeApp({ credential: admin.credential.cert(credentials) });
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw new Error('Failed to initialize Firebase. Check your service account configuration.');  // Critical: Halt if Firebase fails.
}

const db = admin.firestore();

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
];

// Cache auth client
let authClient = null;
async function authenticateGoogleDocs() {
  if (authClient) {
    return authClient;
  }

  try {
      const auth = new google.auth.GoogleAuth({
          credentials: require(absoluteCredentialsPath), // Use the resolved path
          scopes: SCOPES,
      });
      authClient = await auth.getClient();
      return authClient;
  } catch (error) {
      console.error('Error authenticating with Google:', error);
      throw new AppError('Failed to authenticate with Google APIs.', 500, 'GOOGLE_AUTH_ERROR'); // Use AppError
  }
}

// Helper function for Firestore timestamps (DRY principle)
const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

// Input Validation Middleware (Example - can be expanded)
const validateModuleInput = (req, res, next) => {
    const { moduleId, title } = req.body;
    const errors = {};

    if (!moduleId || typeof moduleId !== 'string' || moduleId.trim() === '') {
        errors.moduleId = 'Module ID is required and must be a non-empty string.';
    }
    if (!title || typeof title !== 'string' || title.trim() === '') {
        errors.title = 'Title is required and must be a non-empty string.';
    }

    if (Object.keys(errors).length > 0) {
        return next(new AppError('Validation Error', 400, 'VALIDATION_ERROR', errors));
    }

    next();
};
// Validation for exams
const validateExamInput = (req, res, next) => {
  const {examId, title, description} = req.body;  //examID
  const errors = {};

  if (!examId || typeof examId !== 'string' || examId.trim() === '') {
      errors.examId = 'Exam ID is required and must be a non-empty string.';
    }
  if (!title || typeof title !== 'string' || title.trim() === '') {
  errors.title = 'Title is required and must be a non-empty string.';
  }
      if (description && typeof description !== 'string') { // Optional description check
          errors.description = 'Description must be a string.';
      }

  if (Object.keys(errors).length > 0) {
   return next(new AppError('Validation Error', 400, 'VALIDATION_ERROR', errors));
  }

  next();
  };


app.post('/user/:userId/module/start', async (req, res, next) => {
  try {
    const {userId} = req.params;
    const {moduleId} = req.body;

    // Basic input validation
    if (!userId || typeof userId !== 'string') {
      throw new AppError('Invalid userId', 400);
    }
    if (!moduleId || typeof moduleId !== 'string') {
      throw new AppError('Invalid moduleId', 400);
    }

    const userRef = db.collection('users').doc(userId);

    // Check if user exists.
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        throw new AppError('User not found', 404);
    }

    await userRef.collection('progress').doc(`${moduleId}_start`).set({
      moduleId,
      startedAt: serverTimestamp(),
      status: 'in_progress',
    });

    res.status(200).send({message: 'Module started'});
  } catch (error) {
    next(error); // Pass to centralized error handler
  }
});



// Create a Google Doc and save to Firestore
app.post('/create-doc', validateModuleInput, async (req, res, next) => {  // Added Input Validation
  try {
    const {moduleId, title, content = 'No content provided'} = req.body;
    const auth = await authenticateGoogleDocs();
    const docs = google.docs({version: 'v1', auth});

    const document = await docs.documents.create({requestBody: {title}});
    const documentId = document.data.documentId;

    if (!documentId) { // Simplified check (already validated type in validateModuleInput)
        throw new AppError('No documentId returned', 500, 'DOC_CREATION_FAILED');
    }
    console.log('BatchUpdate params:', {documentId, content}); // Debug log

    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{insertText: {location: {index: 1}, text: content}}],
      },
    });

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    // Save to Firestore (using provided moduleId, examId, or failing)
    let collection = null;
    let docId = null;

    if (moduleId) {
        collection = 'modules';
        docId = moduleId;
    } else if (req.body.examId) {
        collection = 'exams';
        docId = req.body.examId;
    } else {
        throw new AppError('Either moduleId or examId is required', 400, 'MISSING_ID');
    }
        await db.collection(collection).doc(docId).set({ content: docUrl }, { merge: true });



    res.json({documentId, docUrl});
  } catch (error) {
    next(error); // Pass to error handler
  }
});

// Create Exam route
app.post('/create-exam', validateExamInput, async (req, res, next) => {
  try {
    const { examId, title, content = 'No content provided' } = req.body;
    const auth = await authenticateGoogleDocs();
    const docs = google.docs({ version: 'v1', auth });

    const document = await docs.documents.create({ requestBody: { title } });
    const documentId = document.data.documentId;

    if (!documentId) {
      throw new AppError('No documentId returned', 500, 'DOC_CREATION_FAILED');
    }
    console.log('BatchUpdate params:', { documentId, content }); // Debug log

    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{ insertText: { location: { index: 1 }, text: content } }],
      },
    });

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    // Save to Firestore
    if (!examId) { // Correctly checking for examId BEFORE attempting to use it
      throw new AppError('examId is required', 400, 'MISSING_ID');
    }

    await db.collection('exams').doc(examId).set({
      title,
      content: docUrl, // Save the URL, not the content itself
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    res.json({ examId, docUrl }); // Consistent response

  } catch (error) {
    next(error);
  }
});

// Get Google Doc content
app.get('/get-doc-content/:docId', async (req, res, next) => {
  try {
    const {docId} = req.params;

    if (!docId || typeof docId !== 'string' || docId.trim() === '') {
        throw new AppError('Invalid document ID', 400, 'INVALID_DOC_ID'); // Use AppError
    }

    const auth = await authenticateGoogleDocs();
    const docs = google.docs({version: 'v1', auth});

    const response = await docs.documents.get({documentId: docId});

      if (!response.data || !response.data.body) {
        throw new AppError('Document content not found', 404, 'CONTENT_NOT_FOUND'); // Use AppError
    }


    res.json(response.data.body?.content || []);
  } catch (error) {
      next(error);
  }
});


// List all modules with pagination
app.get('/list-modules', async (req, res, next) => {
  try {
    const {limit = 10, lastId} = req.query;
    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedLimit) || parsedLimit <= 0) {
        throw new AppError('Invalid limit value', 400, 'INVALID_LIMIT');
    }

    let query = db
      .collection('modules')
      .orderBy('updatedAt', 'desc')
      .limit(parsedLimit);

    if (lastId) {
      const lastDoc = await db.collection('modules').doc(lastId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      } else {
          // Handle the case where the lastId provided doesn't exist.
          throw new AppError('Invalid lastId provided for pagination', 400, 'INVALID_LAST_ID');
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
      createdAt: doc.data().createdAt?.toDate(),  // Convert Firestore Timestamp to Date
      updatedAt: doc.data().updatedAt?.toDate(),
    }));

    res.json({
      modules,
      hasMore: modules.length === parsedLimit,
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
    if(!moduleId || typeof moduleId !== 'string') {
        throw new AppError('Invalid module ID', 400, 'INVALID_MODULE_ID');
    }
    const moduleDoc = await db.collection('modules').doc(moduleId).get();

    if (!moduleDoc.exists) {
        throw new AppError('Module not found', 404, 'MODULE_NOT_FOUND');
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
    if(!moduleId || typeof moduleId !== 'string') {
        throw new AppError('Invalid module ID', 400, 'INVALID_MODULE_ID');
    }

     // Check if the module exists
    const moduleDoc = await db.collection('modules').doc(moduleId).get();
    if(!moduleDoc.exists){
       throw new AppError('Module not found', 404, 'MODULE_NOT_FOUND');
    }

    const sectionsSnapshot = await db
      .collection('modules')
      .doc(moduleId)
      .collection('sections')
      .orderBy('order')
      .get();

    if (sectionsSnapshot.empty) {
      return res.json([]); // Return empty array instead of 404
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

//Create reusable controller functions
const controllers = {
  // Generate quiz questions using Hugging Face API
  async generateQuiz(req, res, next) {
    try {
      const {
        moduleId,
        numberOfQuestions = 5,
        questionTypes = ['multiple choice', 'true or false'],
      } = req.body;

      if (!moduleId) {
        return res.status(400).json({ message: 'moduleId is required.' });
      }

      // Get module data
      const moduleRef = db.collection('modules').doc(moduleId);
      const moduleDoc = await moduleRef.get();

      if (!moduleDoc.exists) {
        return res.status(404).json({ message: 'Module not found.' });
      }

      const moduleData = moduleDoc.data();

      // Get section content
      const sectionsSnapshot = await moduleRef.collection('sections').get();

      let sectionContent = '';
      sectionsSnapshot.forEach(doc => {
        sectionContent += ` ${doc.data().content}`;
      });

      const moduleContent = `${moduleData.description}. ${sectionContent}`;

      // Prepare prompt for language model
      const prompt = `Generate ${numberOfQuestions} questions about: ${moduleContent}. 
        The questions should be only of the types: ${questionTypes.join(', ')}.
        Format the questions and answers as follows:
        - For multiple choice questions:
            Question: (question)
            a) (answer)
            b) (answer)
            c) (answer)
            d) (answer)
            Correct answer: (a, b, c or d)
            Explanation: (explain why this is the correct answer)
        - For True or False questions:
            Question: (question)
            Correct answer: (True or False)
            Explanation: (explain why this is the correct answer)
        Ensure all the questions are about the provided content. Return only the questions and answers with explanations, do not add any extra information.`;

      // Make API call with retry and timeout
      const result = await executeWithRetry(
        () => hf.textGeneration({
          model: 'mistralai/Mistral-7B-Instruct-v0.2',
          inputs: prompt,
          parameters: {
            max_new_tokens: 1200,
            temperature: 0.7,
          },
        }),
        3, // Max 3 retries
        5000 // 5-second timeout
      );

      // Parse response
      const quizData = parseQuizFromAIResponse(result.generated_text);

      res.json({ quiz: quizData });
    } catch (error) {
      handleApiError(error, res, next);
    }
  },

  // Save quiz results
  async saveQuizResult(req, res, next) {
    try {
      const {
        userId,
        moduleId,
        quizId,
        score,
        totalQuestions,
        answers,
        timestamp = new Date(),
      } = req.body;

      if (!userId || !moduleId || !score || !totalQuestions) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'userId, moduleId, score, and totalQuestions are required',
        });
      }

      const userRef = db.collection('users').doc(userId);

      // Batch write to improve performance and ensure atomicity
      const batch = db.batch();

      // Create a new quiz result document
      const quizResultRef = db.collection('quizResults').doc();
      batch.set(quizResultRef, {
        userId,
        moduleId,
        quizId: quizId || quizResultRef.id,
        score,
        totalQuestions,
        percentage: (score / totalQuestions) * 100,
        answers: answers || {},
        timestamp: admin.firestore.Timestamp.fromDate(
          typeof timestamp === 'string' ? new Date(timestamp) : timestamp,
        ),
      });

      // Get user document to check existence
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        // Update existing user
        batch.update(userRef, {
          'learningProgress.completedQuizzes': admin.firestore.FieldValue.arrayUnion({
            moduleId,
            quizId: quizId || quizResultRef.id,
            score: (score / totalQuestions) * 100,
            completedAt: admin.firestore.Timestamp.fromDate(
              typeof timestamp === 'string' ? new Date(timestamp) : timestamp
            ),
          }),
          lastActivity: admin.firestore.Timestamp.now(),
        });

        // Check if module should be marked as completed (70% passing threshold)
        if (score / totalQuestions >= 0.7) {
          batch.update(userRef, {
            'learningProgress.completedModules': admin.firestore.FieldValue.arrayUnion(moduleId),
          });
        }
      } else {
        // Create new user
        batch.set(userRef, {
          userId,
          completedQuizzes: [
            {
              moduleId,
              quizId: quizId || quizResultRef.id,
              score: (score / totalQuestions) * 100,
              completedAt: admin.firestore.Timestamp.fromDate(
                typeof timestamp === 'string' ? new Date(timestamp) : timestamp,
              ),
            },
          ],
          completedModules: [],
          lastActivity: admin.firestore.Timestamp.now(),
          createdAt: admin.firestore.Timestamp.now(),
        });
      }

      // Commit batch
      await batch.commit();

      res.status(201).json({
        success: true,
        message: 'Quiz result saved successfully',
        resultId: quizResultRef.id,
      });
    } catch (error) {
      next(error);
    }
  },

  // Get quiz history for a user
  async getQuizHistory(req, res, next) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const quizResultsSnapshot = await db
        .collection('quizResults')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .get();

      const quizHistory = quizResultsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      }));

      res.json({ quizHistory });
    } catch (error) {
      next(error);
    }
  },

  // Track module reading progress
  async trackProgress(req, res, next) {
    try {
      const { userId } = req.params;
      const { moduleId, action, timestamp } = req.body;

      if (!userId || !moduleId || !action) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const userRef = db.collection('users').doc(userId);
      const batch = db.batch();

      if (action === 'start') {
        batch.set(userRef.collection('progress').doc(`${moduleId}_start`), {
          moduleId,
          startedAt: timestamp ? new Date(timestamp) : admin.firestore.FieldValue.serverTimestamp(),
          status: 'in_progress',
        });
      } else if (action === 'complete') {
        batch.set(userRef.collection('progress').doc(`${moduleId}_content`), {
          moduleId,
          completedAt: timestamp ? new Date(timestamp) : admin.firestore.FieldValue.serverTimestamp(),
          status: 'content_completed',
        });

        batch.update(userRef, {
          'learningProgress.completedModules': admin.firestore.FieldValue.arrayUnion(moduleId),
          lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  },

  // Get user progress
  async getUserProgress(req, res, next) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get all data in parallel for better performance
      const [
        userDoc,
        progressSnapshot,
        modulesSnapshot,
        quizResultsSnapshot,
        examResultsSnapshot,
        examsSnapshot,
      ] = await Promise.all([
        db.collection('users').doc(userId).get(),
        db.collection('users').doc(userId).collection('progress').get(),
        db.collection('modules').get(),
        db.collection('quizResults').where('userId', '==', userId).orderBy('timestamp', 'desc').get(),
        db.collection('examResults').where('userId', '==', userId).orderBy('timestamp', 'desc').get(),
        db.collection('exams').get(),
      ]);

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data() || {};
      const learningProgress = userData.learningProgress || {
        completedModules: [],
        completedQuizzes: [],
        completedExams: [],
        modulesInProgress: [],
        score: null,
      };

      // Process all snapshots
      const progress = progressSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          moduleId: data.moduleId || '',
          quizId: data.quizId || '',
          examId: data.examId || '',
          score: data.score || 0,
          totalQuestions: data.totalQuestions || 0,
          status: data.status || '',
          startedAt: data.startedAt ? data.startedAt.toDate().toISOString() : null,
          completedAt: data.completedAt ? data.completedAt.toDate().toISOString() : null,
        };
      });

      const modules = modulesSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || '',
        description: doc.data().description || '',
      }));

      const quizResults = quizResultsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          moduleId: data.moduleId || '',
          score: data.score || 0,
          totalQuestions: data.totalQuestions || 0,
          percentage: data.percentage || 0,
          timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null,
        };
      });

      const examResults = examResultsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          examId: data.examId || '',
          score: data.score || 0,
          totalQuestions: data.totalQuestions || 0,
          percentage: data.percentage || 0,
          timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null,
        };
      });

      const exams = examsSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title || '',
      }));

      res.json({
        learningProgress,
        progress,
        modules,
        exams,
        examResults,
        quizResults,
      });
    } catch (error) {
      next(error);
    }
  },

  // Complete exam
  async completeExam(req, res, next) {
    try {
      const { userId } = req.params;
      const { moduleId, examId, quizId, score } = req.body;

      await db.runTransaction(async (transaction) => {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        // Create progress document
        const progressRef = userRef.collection('progress').doc(examId);
        transaction.set(progressRef, {
          examId,
          moduleId,
          quizId,
          score,
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update user document
        transaction.update(userRef, {
          'learningProgress.completedExams': admin.firestore.FieldValue.arrayUnion(examId),
          'learningProgress.completedModules': admin.firestore.FieldValue.arrayUnion(moduleId),
          'learningProgress.completedQuizzes': admin.firestore.FieldValue.arrayUnion(quizId),
          'learningProgress.score': admin.firestore.FieldValue.increment(score),
        });

        // Update module start status
        const moduleStartRef = userRef.collection('progress').doc(`${moduleId}_start`);
        transaction.update(moduleStartRef, {
          status: 'completed',
          completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      res.status(200).send({ message: 'Exam completed' });
    } catch (error) {
      next(error);
    }
  },

    // Get exam progress for a user
    async getExamProgress(req, res, next) {
      try {
        const { userId } = req.params;

        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        const examResultsSnapshot = await db
          .collection('examResults')
          .where('userId', '==', userId)
          .orderBy('timestamp', 'desc')
          .get();

        const examProgress = examResultsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            examId: data.examId || '',
            score: data.score || 0,
            timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : null,
          };
        });

        res.json(examProgress);
      } catch (error) {
        next(error);
      }
    },
        // Save exam results
    async saveExamResult(req, res, next) {
      try {
        const { userId, examId, result } = req.body;

        if (!userId || !examId || !result) {
          return res.status(400).json({
            error: 'Missing required fields',
            message: 'userId, examId, and result are required',
          });
        }
        const { totalQuestions, correctAnswers, score, isPassed, answeredQuestions } = result;
        const percentage = (score).toFixed(1);

        const examResultRef = db.collection('examResults').doc();
        const examResultData = {
          userId,
          examId,
          totalQuestions,
          score: correctAnswers,
          percentage,
          isPassed,
          answeredQuestions,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        await examResultRef.set(examResultData);

        // Update user progress
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
          await userRef.update({
            'learningProgress.completedExams': admin.firestore.FieldValue.arrayUnion(examId),
            lastActivity: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          await userRef.set({
            userId,
            completedExams: [examId],
            lastActivity: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        res.status(201).json({
          success: true,
          message: 'Exam result saved successfully',
          resultId: examResultRef.id,
        });
      } catch (error) {
        next(error);
      }
    },

    // Generate exam
    async generateExam(req, res, next) {
    try {
      const {
        examId,
        numberOfQuestions = 25,
        questionTypes = ['multiple choice', 'true or false'],
      } = req.body;

      if (!examId) {
        return res.status(400).json({ message: 'examId is required.' });
      }

      // Get exam data
      const examRef = db.collection('exams').doc(examId);
      const examDoc = await examRef.get();

      if (!examDoc.exists) {
        //return res.status(404).json({ message: 'Exam not found.' });
        throw new AppError('Exam not found', 404, 'EXAM_NOT_FOUND');
      }

      const examData = examDoc.data();

      // Get associated content for this exam
      const content = await getExamContent(examId);

      // Generate questions using Hugging Face API with retry mechanism
      const prompt = `Generate ${numberOfQuestions} questions for a ${examData.title} certification exam. 
        The questions should cover the following topics: ${content}
        The questions should be only of the types: ${questionTypes.join(', ')}.
        Format the questions and answers as follows:
        - For multiple choice questions:
            Question: (question)
            a) (answer)
            b) (answer)
            c) (answer)
            d) (answer)
            Correct answer: (a, b, c or d)
            Explanation: (explain why this is the correct answer)
        - For True or False questions:
            Question: (question)
            Correct answer: (True or False)
            Explanation: (explain why this is the correct answer)
        Ensure all the questions are challenging and reflect real certification exam difficulty.
        Make sure the questions test understanding and application of concepts, not just memorization.
        Return only the questions and answers with explanations, do not add any extra information.`;

      const result = await executeWithRetry(
        () => hf.textGeneration({
          model: 'mistralai/Mistral-7B-Instruct-v0.2',
          inputs: prompt,
          parameters: {
            max_new_tokens: 4000,
            temperature: 0.7,
          },
        }),
        3, // Max 3 retries
        20000 // 20-second timeout for larger content
      );

      // Parse questions
      const questions = parseQuizFromAIResponse(result.generated_text);

      res.json({ questions });
    } catch (error) {
      handleApiError(error, res, next);
    }
  },

  // Health check
  healthCheck(req, res) {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  },
};

// Helper function for parsing AI response
function parseQuizFromAIResponse(text) {
  const questions = [];

  // First try to identify individual questions in the text
  // This pattern looks for numbered questions or "Question:" prefix
  const questionBlocks = text.split(/(?:\n|\r\n)\s*(?:(?:\d+\.)|(?:Question:))\s*/i)
    .filter(block => block && block.trim().length > 0);

  questionBlocks.forEach((block, questionIndex) => {
    try {
      const lines = block.trim().split(/\n|\r\n/).filter(line => line.trim());

      // Extract the question text (first line or after "Question:" prefix)
      let questionText = lines[0].trim();
      questionText = questionText
        .replace(/^Question:\s*/i, '')
        .replace(/\s*\(question\)\s*/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .trim();

      if (!questionText) {return;} // Skip if no question text found

      // Initialize question object
      const questionObj = {
        id: questionIndex,
        question: questionText,
        answers: [],
        correctAnswer: '',
        explanation: '',
      };

      // Process remaining lines to find answers, correct answer, and explanation
      let inExplanation = false;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();

        // Once we start an explanation, capture all subsequent lines as part of it
        if (inExplanation) {
          questionObj.explanation += ' ' + line;
          continue;
        }

        // Check for multiple choice answer options
        const mcMatch = line.match(/^([a-d])[)\.\:]?\s+(.+)$/i);
        if (mcMatch) {
          const letter = mcMatch[1].toLowerCase();
          const answerText = mcMatch[2]
            .replace(/\s*\(answer\)\s*/g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .trim();

          if (answerText) {
            questionObj.answers.push({
              letter,
              answer: answerText,
              uniqueKey: `q${questionIndex}-${letter}`,
            });
          }
          continue;
        }

        // Check for correct answer
        const correctMatch = line.match(/^(?:correct\s+answer|answer):\s*(.+)$/i);
        if (correctMatch) {
          let correctAnswer = correctMatch[1].trim();

          // Handle different formats of correct answers
          if (correctAnswer.match(/^[a-d]$/i)) {
            // Single letter answer
            questionObj.correctAnswer = correctAnswer.toLowerCase();
          } else if (correctAnswer.match(/^[a-d][)\.]?\s+/i)) {
            // Answer with letter and formatting (e.g., "a) text")
            questionObj.correctAnswer = correctAnswer.charAt(0).toLowerCase();
          } else if (correctAnswer.toLowerCase() === 'true' || correctAnswer.toLowerCase() === 'false') {
            // True/False answer
            questionObj.correctAnswer = correctAnswer.toLowerCase();
          } else {
            // Try to extract letter from answer text if provided in various formats
            const letterMatch = correctAnswer.match(/(?:option|answer)?\s*['"(]?([a-d])['")\.]?/i);
            if (letterMatch) {
              questionObj.correctAnswer = letterMatch[1].toLowerCase();
            } else {
              console.warn(`Couldn't parse correct answer format: "${correctAnswer}"`);
            }
          }
          continue;
        }

        // Check for explanation
        const explanationMatch = line.match(/^(?:explanation|rationale|reason):\s*(.+)$/i);
        if (explanationMatch) {
          questionObj.explanation = explanationMatch[1].trim();
          inExplanation = true;
          continue;
        }
      }

      // If it's a true/false question but no options were found, add them
      if (questionObj.correctAnswer &&
          (questionObj.correctAnswer.toLowerCase() === 'true' ||
           questionObj.correctAnswer.toLowerCase() === 'false') &&
          questionObj.answers.length === 0) {

        questionObj.answers = [
          { letter: 'true', answer: 'True', uniqueKey: `q${questionIndex}-true` },
          { letter: 'false', answer: 'False', uniqueKey: `q${questionIndex}-false` },
        ];
      }

      // Only add valid questions that have question text, some answers, and a correct answer
      if (questionObj.question &&
          questionObj.answers.length > 0 &&
          questionObj.correctAnswer) {

        // Ensure explanation is not empty
        if (!questionObj.explanation) {
          questionObj.explanation = `The correct answer is ${questionObj.correctAnswer.toUpperCase()}.`;
        }

        questions.push(questionObj);
      } else {
        console.warn(`Skipping invalid question at index ${questionIndex}: missing required fields`);
        console.warn(`Question text: ${questionObj.question.substring(0, 50)}...`);
        console.warn(`Answers count: ${questionObj.answers.length}`);
        console.warn(`Correct answer: ${questionObj.correctAnswer}`);
      }
    } catch (error) {
      console.error(`Error parsing question block ${questionIndex}:`, error);
      console.error('Block content:', block.substring(0, 100) + '...');
    }
  });

  // If we found no valid questions using the above approach, try alternate parsing
  if (questions.length === 0) {
    console.warn('No questions found with primary parsing method, trying alternate approach');

    // Look for questions in the format "Question 1: ..." or "1. ..."
    const altQuestionPattern = /(?:question\s+(\d+)[:.]\s*|^(\d+)[:.]\s+)(.+?)(?=(?:\n|\r\n)(?:question\s+\d+[:.]\s*|^\d+[:.]\s+|$))/gims;

    let match;
    let questionIndex = 0;

    while ((match = altQuestionPattern.exec(text)) !== null) {
      try {
        const questionNum = match[1] || match[2] || questionIndex + 1;
        const questionBlock = match[0].trim();
        const lines = questionBlock.split(/\n|\r\n/).filter(line => line.trim());

        // Extract question text
        let questionText = (match[3] || lines[0]).trim();
        questionText = questionText
          .replace(/^Question\s+\d+:\s*/i, '')
          .replace(/^\d+\.\s+/, '')
          .trim();

        if (!questionText) {continue;}

        // Similar processing as above, but with some adaptations for alternate format
        const questionObj = {
          id: parseInt(questionNum, 10) - 1,
          question: questionText,
          answers: [],
          correctAnswer: '',
          explanation: '',
        };

        // Process the rest of the lines
        // ... [Similar processing logic as above] ...
        let inExplanation = false;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();

          if (inExplanation) {
            questionObj.explanation += ' ' + line;
            continue;
          }

          // Check for multiple choice options, correct answer, and explanation
          // [Same logic as above]
          const mcMatch = line.match(/^([a-d])[)\.\:]?\s+(.+)$/i);
          if (mcMatch) {
            const letter = mcMatch[1].toLowerCase();
            const answerText = mcMatch[2].trim();

            if (answerText) {
              questionObj.answers.push({
                letter,
                answer: answerText,
                uniqueKey: `q${questionObj.id}-${letter}`,
              });
            }
            continue;
          }

          const correctMatch = line.match(/^(?:correct\s+answer|answer):\s*(.+)$/i);
          if (correctMatch) {
            let correctAnswer = correctMatch[1].trim();

            if (correctAnswer.match(/^[a-d]$/i)) {
              questionObj.correctAnswer = correctAnswer.toLowerCase();
            } else if (correctAnswer.match(/^[a-d][)\.]?\s+/i)) {
              questionObj.correctAnswer = correctAnswer.charAt(0).toLowerCase();
            } else if (correctAnswer.toLowerCase() === 'true' || correctAnswer.toLowerCase() === 'false') {
              questionObj.correctAnswer = correctAnswer.toLowerCase();
            } else {
              const letterMatch = correctAnswer.match(/(?:option|answer)?\s*['"(]?([a-d])['")\.]?/i);
              if (letterMatch) {
                questionObj.correctAnswer = letterMatch[1].toLowerCase();
              }
            }
            continue;
          }

          const explanationMatch = line.match(/^(?:explanation|rationale|reason):\s*(.+)$/i);
          if (explanationMatch) {
            questionObj.explanation = explanationMatch[1].trim();
            inExplanation = true;
            continue;
          }
        }

        // Handle True/False questions
        if (questionObj.correctAnswer &&
            (questionObj.correctAnswer.toLowerCase() === 'true' ||
             questionObj.correctAnswer.toLowerCase() === 'false') &&
            questionObj.answers.length === 0) {

          questionObj.answers = [
            { letter: 'true', answer: 'True', uniqueKey: `q${questionObj.id}-true` },
            { letter: 'false', answer: 'False', uniqueKey: `q${questionObj.id}-false` },
          ];
        }

        // Validate and add question
        if (questionObj.question &&
            questionObj.answers.length > 0 &&
            questionObj.correctAnswer) {

          if (!questionObj.explanation) {
            questionObj.explanation = `The correct answer is ${questionObj.correctAnswer.toUpperCase()}.`;
          }

          questions.push(questionObj);
        }
      } catch (error) {
        console.error('Error parsing question with alternate method:', error);
      }
    }
  }

  // Final check to ensure we have unique IDs for questions
  if (questions.length > 0) {
    // Sort by ID and reassign sequential IDs if needed
    questions.sort((a, b) => a.id - b.id);
    questions.forEach((q, idx) => {
      q.id = idx;
      // Update uniqueKeys to match new ID if needed
      q.answers.forEach(a => {
        a.uniqueKey = `q${idx}-${a.letter}`;
      });
    });
  }

  console.log(`Parsed ${questions.length} questions from AI response`);
  return questions;
}

 async function getExamContent(examId) {
  console.log(`Fetching content for examId: ${examId}`);

  // 1. Try to get exam-specific content first
  const contentRef = db.collection('examContent').where('examId', '==', examId);
  const contentSnap = await contentRef.get();

  let content = '';
  contentSnap.forEach(doc => {
    content += doc.data().content + ' ';
  });

  // 2. If no exam-specific content, fall back to module content
  if (!content) {
    console.warn(`No exam-specific content found for examId: ${examId}. Falling back to module content.`);

    // Fetch all modules
    const modulesSnapshot = await db.collection('modules').get();

    if (modulesSnapshot.empty) {
      console.warn('No modules found. Using default content.');
      content = 'General knowledge'; // Default content if no modules exist
    } else {
      // Concatenate content from all modules
      const sectionPromises = [];
      modulesSnapshot.forEach(doc => {
        content += doc.data().description + ' '; // Add module description
        // Fetch section content for each module
        const sectionsPromise = db.collection('modules').doc(doc.id).collection('sections').get();
        sectionPromises.push(sectionsPromise);
      });

      // Wait for all section content to be fetched
      const allSections = await Promise.all(sectionPromises);
      allSections.forEach(sections => {
        sections.forEach(section => {
          content += section.data().content + ' ';
        });
      });
    }
  }

  console.log(`Content found: ${content}`); // Log the content
  return content.trim();
}


// Utility function for retrying API calls with exponential backoff
async function executeWithRetry(fn, maxRetries = 3, timeout = 10000) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Set up timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timed out')), timeout);
      });

      // Race between the function and timeout
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (
        error.message.includes('RESOURCE_EXHAUSTED') ||
        error.message.includes('Too Many Requests') ||
        error.message.includes('timeout')
      ) {
        console.log(`Attempt ${attempt + 1} failed, retrying in ${2 ** attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, 2 ** attempt * 1000)); // Exponential backoff
        continue;
      }

      // Don't retry for other types of errors
      throw error;
    }
  }

  // If we've exhausted retries
  throw lastError;
}

// Error handling function for API calls
function handleApiError(error, res, next) {
  console.error('API Error:', error);
  console.error('API Error Details:', error.response?.data || error.message); // Log more details

  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return res.status(504).json({ error: 'Request timed out' });
  }

  if (error.message && error.message.includes('auth')) {
    return res.status(403).json({ error: 'Invalid Hugging Face API Key' });
  }

  if (error.status === 429 || error.message.includes('RESOURCE_EXHAUSTED')) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Please try again later or reduce the number of requests',
    });
  }

  return res.status(500).json({
    error: 'Internal server error',
    message: error.message,
  });
}

// Define routes
app.post('/generate-quiz', hfApiLimiter, controllers.generateQuiz);
app.post('/save-quiz-result', controllers.saveQuizResult);
app.get('/user/:userId/quiz-history', controllers.getQuizHistory);
app.post('/user/:userId/progress', controllers.trackProgress);
app.get('/user/:userId/progress', controllers.getUserProgress);
app.post('/user/:userId/exam', controllers.completeExam);
app.post('/generate-exam', hfApiLimiter, controllers.generateExam);
app.get('/user/:userId/exam-progress', controllers.getExamProgress);
app.post('/save-exam-result', controllers.saveExamResult);
app.get('/health', controllers.healthCheck);

// Apply error handler middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
