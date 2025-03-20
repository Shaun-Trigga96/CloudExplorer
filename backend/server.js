// backend/server.js

const express = require('express');
const cors = require('cors');
const {google} = require('googleapis');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');
const morgan = require('morgan'); // For logging HTTP requests
const {HfInference} = require('@huggingface/inference'); // Import Hugging Face Inference

dotenv.config({path: path.resolve(__dirname, '..', '.env')});

// Initialize Hugging Face Inference API
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY); // New: Initialize Hugging Face API

const app = express();
app.use(cors({origin: '*'})); // Allow all origins (for development)
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
admin.initializeApp({credential: admin.credential.cert(credentials)});

const db = admin.firestore();

const SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
];

// Cache auth client to avoid recreating for each request
let authClient = null;
async function authenticateGoogleDocs() {
  if (authClient) {
    return authClient;
  }

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
    const {moduleId, title, content = 'No content provided'} = req.body;
    const auth = await authenticateGoogleDocs();
    const docs = google.docs({version: 'v1', auth});

    const document = await docs.documents.create({requestBody: {title}});
    const documentId = document.data.documentId;

    if (
      !documentId ||
      typeof documentId !== 'string' ||
      documentId.trim() === ''
    ) {
      throw new Error('No documentId returned');
    }

    console.log('BatchUpdate params:', {documentId, content}); // Debug log
    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{insertText: {location: {index: 1}, text: content}}],
      },
    });

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    // Save to Firestore using provided moduleId
    if (moduleId) {
      await db
        .collection('modules')
        .doc(moduleId)
        .set({content: docUrl}, {merge: true});
    } else if (req.body.examId) {
      await db
        .collection('exams')
        .doc(req.body.examId)
        .set({content: docUrl}, {merge: true});
    } else {
      throw new Error('Either moduleId or examId is required');
    }

    res.json({documentId, docUrl});
  } catch (error) {
    next(error); // Pass to error handler
  }
});

// Get Google Doc content with better error handling
app.get('/get-doc-content/:docId', async (req, res, next) => {
  try {
    const {docId} = req.params;

    if (!docId || typeof docId !== 'string' || docId.trim() === '') {
      return res.status(400).json({error: 'Invalid document ID'});
    }

    const auth = await authenticateGoogleDocs();
    const docs = google.docs({version: 'v1', auth});

    const response = await docs.documents.get({documentId: docId});

    if (!response.data || !response.data.body) {
      return res.status(404).json({error: 'Document content not found'});
    }

    res.json(response.data.body?.content || []);
  } catch (error) {
    // Check for specific error types
    if (
      error.code === 404 ||
      (error.response && error.response.status === 404)
    ) {
      return res.status(404).json({error: 'Document not found'});
    }
    if (
      error.code === 403 ||
      (error.response && error.response.status === 403)
    ) {
      return res
        .status(403)
        .json({error: 'Permission denied to access document'});
    }
    next(error);
  }
});

// List all modules with pagination
app.get('/list-modules', async (req, res, next) => {
  try {
    const {limit = 10, lastId} = req.query;
    let query = db
      .collection('modules')
      .orderBy('updatedAt', 'desc')
      .limit(parseInt(limit, 10));

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
      return res.status(404).json({error: 'Module not found'});
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
    const sectionsSnapshot = await db
      .collection('modules')
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

app.post('/generate-quiz', async (req, res, next) => {
  try {
    const {
      moduleId,
      numberOfQuestions = 5,
      questionTypes = ['multiple choice', 'true or false'],
    } = req.body;
    console.log('Received moduleId:', moduleId);

    if (!moduleId) {
      console.error('moduleId is required');
      return res.status(400).json({message: 'moduleId is required.'});
    }

    const moduleRef = db.collection('modules').doc(moduleId);
    console.log('Fetching module with ref:', moduleRef.path);
    const moduleDoc = await moduleRef.get();

    if (!moduleDoc.exists) {
      console.error('Module not found:', moduleId);
      return res.status(404).json({message: 'Module not found.'});
    }

    const moduleData = moduleDoc.data();
    console.log('Module Data:', moduleData);

    const sectionsRef = moduleRef.collection('sections');
    console.log('Fetching sections with ref:', sectionsRef.path);
    const sectionsSnapshot = await sectionsRef.get();

    console.log(
      'Sections:',
      sectionsSnapshot.docs.map(doc => doc.data()),
    );

    let sectionContent = '';
    sectionsSnapshot.forEach(doc => {
      console.log('Processing section:', doc.data());
      sectionContent += ` ${doc.data().content}`;
    });

    console.log('Section Content:', sectionContent);

    const moduleContent = `${moduleData.description}. ${sectionContent}`;
    console.log('Module Content:', moduleContent);

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

    console.log('Prompt: ', prompt);
    console.log('Hugging Face API Key:', process.env.HUGGINGFACE_API_KEY);
    console.log('Using model:', 'mistralai/Mistral-7B-Instruct-v0.2');

    const result = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 1200, // Increased to accommodate explanations
        temperature: 0.7,
      },
    });

    console.log('Hugging Face response: ', result.generated_text);

    const quizData = parseQuizFromAIResponse(result.generated_text);

    console.log('Quiz Data: ', quizData);
    res.json({quiz: quizData});
  } catch (error) {
    console.error('Error in /generate-quiz:', error);

    if (error.name === 'AbortError') {
      return res.status(504).json({error: 'Request timed out'});
    }

    if (error.message && error.message.includes('auth')) {
      return res.status(403).json({error: 'Invalid Hugging Face API Key'});
    }

    if (error.status === 429) {
      return res
        .status(429)
        .json({error: 'Too many requests to Hugging Face API'});
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

// Add new endpoint to save quiz results
app.post('/save-quiz-result', async (req, res, next) => {
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

    // Create a new quiz result document
    const quizResultRef = db.collection('quizResults').doc();

    await quizResultRef.set({
      userId,
      moduleId,
      quizId: quizId || quizResultRef.id, // Use generated ID if none provided
      score,
      totalQuestions,
      percentage: (score / totalQuestions) * 100,
      answers: answers || {}, // Store user's answers
      timestamp: admin.firestore.Timestamp.fromDate(
        typeof timestamp === 'string' ? new Date(timestamp) : timestamp,
      ),
    });

    // Update the user's progress
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      // Get existing completed modules and quizzes
      const userData = userDoc.data();
      const completedModules = userData.completedModules || [];
      const completedQuizzes = userData.completedQuizzes || [];

      // Add new quiz to completedQuizzes if not already there
      if (!completedQuizzes.some(quiz => quiz.moduleId === moduleId)) {
        completedQuizzes.push({
          moduleId,
          quizId: quizId || quizResultRef.id,
          score: (score / totalQuestions) * 100,
          completedAt: admin.firestore.Timestamp.fromDate(
            typeof timestamp === 'string' ? new Date(timestamp) : timestamp,
          ),
        });
      }

      // Update user document
      await userRef.update({
        completedQuizzes,
        lastActivity: admin.firestore.Timestamp.now(),
      });

      // Check if all module requirements are completed to mark module as complete
      // This is a simplified check - you might want to add more criteria
      if (!completedModules.includes(moduleId)) {
        // This is just a placeholder - you would need to implement your own logic
        // to determine if a module is fully completed (e.g., all quizzes passed with minimum score)
        const moduleCompleted = score / totalQuestions >= 0.7; // 70% passing threshold

        if (moduleCompleted) {
          completedModules.push(moduleId);
          await userRef.update({completedModules});
        }
      }
    } else {
      // Create new user document if it doesn't exist
      await userRef.set({
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

    res.status(201).json({
      success: true,
      message: 'Quiz result saved successfully',
      resultId: quizResultRef.id,
    });
  } catch (error) {
    console.error('Error saving quiz result:', error);
    next(error);
  }
});

// Add endpoint to get user's quiz history
app.get('/user/:userId/quiz-history', async (req, res, next) => {
  try {
    const {userId} = req.params;

    if (!userId) {
      return res.status(400).json({error: 'User ID is required'});
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

    res.json({quizHistory});
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    next(error);
  }
});

function parseQuizFromAIResponse(text) {
  const questions = [];

  // Split the text into question blocks based on numbered questions
  const questionBlocks = text.split(/\n\s*\d+\.\s+/).filter(Boolean);

  questionBlocks.forEach((block, questionIndex) => {
    // Skip any empty blocks
    if (!block.trim()) {
      return;
    }

    const lines = block.trim().split('\n').filter(line => line.trim().length > 0);

    // First line should be the question
    let questionText = lines[0].trim();
    // Clean up the question text - remove "Question:" prefix, (question) markers, and markdown ** formatting
    questionText = questionText
      .replace(/^Question:\s*/i, '')
      .replace(/\s*\(question\)\s*/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown ** formatting
      .trim();

    if (!questionText) {
      return;
    } // Skip if no question text

    // Initialize variables
    let correctAnswer = '';
    let explanation = '';
    const answers = [];
    let isMultipleChoice = false;

    // Look for answers and correct answer
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for multiple choice answers (a), b), etc.)
      const mcMatch = line.match(/^([a-d])[)\.]?\s+(.+)$/i);
      if (mcMatch) {
        isMultipleChoice = true;
        const letter = mcMatch[1].toLowerCase();
        const answerText = mcMatch[2].replace(/\s*\(answer\)\s*/g, '').trim();

        // Only add non-empty answers
        if (answerText) {
          answers.push({
            letter,
            answer: answerText,
            uniqueKey: `q${questionIndex}-${letter}`,
          });
        }
        continue;
      }

      // Check for correct answer
      const correctMatch = line.match(/^correct\s+answer:\s*(.+)$/i);
      if (correctMatch) {
        correctAnswer = correctMatch[1].trim();
        // If the answer is a single letter, make it lowercase for consistency
        if (correctAnswer.length === 1 && /[a-d]/i.test(correctAnswer)) {
          correctAnswer = correctAnswer.toLowerCase();
        }
        continue;
      }

      // Check for explanation
      const explanationMatch = line.match(/^explanation:\s*(.+)$/i);
      if (explanationMatch) {
        explanation = explanationMatch[1].trim();
      }
    }

    // If no multiple choice answers found, treat as True/False question
    if (!isMultipleChoice) {
      // Check if the correct answer is True or False
      if (correctAnswer.toLowerCase() === 'true' || correctAnswer.toLowerCase() === 'false') {
        answers.push({
          letter: 'true',
          answer: 'True',
          uniqueKey: `q${questionIndex}-true`,
        });
        answers.push({
          letter: 'false',
          answer: 'False',
          uniqueKey: `q${questionIndex}-false`,
        });
      }
    }

    // Only add valid questions
    if (questionText && correctAnswer) {
      questions.push({
        id: questionIndex,
        question: questionText,
        answers: answers,
        correctAnswer,
        explanation:
          explanation || `The correct answer is ${correctAnswer.toUpperCase()}.`,
      });
    }
  });

  return questions;
}

app.get('/user/:userId/progress', async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Fetch user document
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = userDoc.data();

    // Fetch learningProgress from user document
    const learningProgress = userData.learningProgress || {
      completedModules: [],
      completedQuizzes: [],
      completedExams: [],
      score: 0,
    };

    // Optionally fetch progress subcollection (if you still need it)
    const progressSnapshot = await userRef.collection('progress').orderBy('completedAt', 'desc').get();
    console.log(`Progress subcollection entries for ${userId}: ${progressSnapshot.size}`);
    const progressData = progressSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        quizId: data.quizId || '',
        moduleId: data.moduleId || data.quizId?.split('-quiz')[0] || '',
        score: data.score || 0,
        totalQuestions: data.totalQuestions || 0,
        completedAt: data.completedAt?.toDate().toISOString() || null,
      };
    });

    // Fetch modules
    const modulesSnapshot = await db.collection('modules').get();
    const modules = modulesSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.id.replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
    }));

    res.json({
      learningProgress, // Main data source
      progress: progressData, // Optional subcollection data
      modules,
    });
  } catch (error) {
    console.error('Error fetching user progress:', error.message, error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/user/:userId/quiz-history', async (req, res, next) => {
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

    const quizHistory = quizResultsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        moduleId: data.moduleId || '',
        score: data.score || 0,
        totalQuestions: data.totalQuestions || 0,
        timestamp: data.timestamp ? data.timestamp.toDate().toISOString() : new Date().toISOString(),
      };
    });

    res.json({ quizHistory });
  } catch (error) {
    console.error('Error fetching quiz history:', error.message, error.stack);
    next(error);
  }
});
// Add health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({status: 'ok', timestamp: new Date().toISOString()});
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
