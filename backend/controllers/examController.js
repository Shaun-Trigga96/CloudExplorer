const {google} = require('googleapis');
const admin = require('firebase-admin');
const AppError = require('../utils/appError');
const {authenticateGoogleDocs} = require('../utils/googleAuth');
const {serverTimestamp} = require('../utils/firestoreHelpers');
const {executeWithRetry} = require('../utils/retryHandler'); // Import retry helper
const {parseQuizFromAIResponse, getExamContent} = require('../utils/aiHelpers'); // Import AI helpers
const {hf} = require('../server'); // Import initialized HF instance

const db = admin.firestore();

// POST /create (Doc creation, NOT generation)
exports.createExamDoc = async (req, res, next) => {
  // Assumes validateExamInput middleware has run
  try {
    // ... (keep existing logic for creating Google Doc and saving basic exam metadata) ...
    const {examId, title, content = 'No content provided'} = req.body;
    const auth = await authenticateGoogleDocs();
    const docs = google.docs({version: 'v1', auth});

    const document = await docs.documents.create({requestBody: {title}});
    const documentId = document.data.documentId;

    if (!documentId) {
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

    // Save to Firestore
    if (!examId) {
      // Correctly checking for examId BEFORE attempting to use it
      throw new AppError('examId is required', 400, 'MISSING_ID');
    }

    await db.collection('exams').doc(examId).set(
      {
        title,
        content: docUrl, // Save the URL, not the content itself
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      {merge: true},
    );
    // Modified response for clarity
    res.status(201).json({
      examId: req.body.examId, // Use the ID from input
      title: req.body.title,
      // documentId: documentId, // Only if needed by client
      docUrl: docUrl,
      message: 'Exam definition document created and saved successfully.',
    });
  } catch (error) {
    console.error(`Error in createExamDoc for exam ${req.body.examId}:`, error);
    // Add specific Google API error handling similar to createModuleDoc
    if (error.code === 403 || error.message?.includes('permission')) {
      return next(
        new AppError(
          'Permission denied for Google Docs API.',
          403,
          'GOOGLE_DOCS_PERMISSION',
        ),
      );
    }
    if (error.code === 429 || error.message?.includes('Quota')) {
      return next(
        new AppError(
          'Google Docs API quota exceeded.',
          429,
          'GOOGLE_QUOTA_EXCEEDED',
        ),
      );
    }
    next(error);
  }
};

// --- NEW: Generate Exam Questions ---
// POST /generate
exports.generateExamQuestions = async (req, res, next) => {
  try {
    const {
      examId,
      numberOfQuestions = 25, // Default number for exams
      questionTypes = ['multiple choice', 'true or false'], // Default types
    } = req.body;

    // --- Input Validation ---
    if (!examId || typeof examId !== 'string') {
      return next(
        new AppError('Valid examId is required.', 400, 'INVALID_EXAM_ID'),
      );
    }
    const numQuestions = parseInt(numberOfQuestions, 10);
    if (isNaN(numQuestions) || numQuestions <= 5 || numQuestions > 100) {
      // Exam question limits
      return next(
        new AppError(
          'numberOfQuestions must be a number between 6 and 100.',
          400,
          'INVALID_QUESTION_COUNT',
        ),
      );
    }
    if (!Array.isArray(questionTypes) || questionTypes.length === 0) {
      return next(
        new AppError(
          'questionTypes must be a non-empty array.',
          400,
          'INVALID_QUESTION_TYPES',
        ),
      );
    }

    // --- Fetch Exam Definition and Content Context ---
    const examDocRef = db.collection('exams').doc(examId);
    const examDoc = await examDocRef.get();
    if (!examDoc.exists) {
      return next(
        new AppError(
          `Exam definition with ID ${examId} not found.`,
          404,
          'EXAM_DEF_NOT_FOUND',
        ),
      );
    }
    const examData = examDoc.data();
    const examTitle = examData.title || 'Certification Exam'; // Use exam title

    // Get content context using the helper function
    const examContentContext = await getExamContent(examId); // Handles fetching logic

    if (!examContentContext || examContentContext.length < 50) {
      // Basic check for minimal content
      console.warn(
        `Insufficient content context found for exam ${examId} to generate questions reliably.`,
      );
      // Allow generation but maybe with a warning, or return error?
      // return next(new AppError(`Not enough content context found for exam ${examId} to generate questions.`, 404, 'EXAM_CONTENT_INSUFFICIENT'));
    }

    console.log(
      `Generating ${numQuestions} exam questions for exam ${examId} (${examTitle})...`,
    );

    // --- Prepare AI Prompt ---
    // Similar prompt structure to quiz generation, adjusted for exams
    const prompt = `Generate exactly ${numQuestions} challenging certification exam questions for the topic "${examTitle}".
The questions should be based on the following content context: """${examContentContext}"""
The questions must strictly be of the following types: ${questionTypes.join(
      ', ',
    )}.
Ensure the questions test application and understanding, not just rote memorization, reflecting typical certification exam difficulty.
Format the output precisely as follows for each question:
- For multiple choice questions:
Question: [The question text]
a) [Option a text]
b) [Option b text]
c) [Option c text]
d) [Option d text]
Correct answer: [Correct option letter, e.g., a]
Explanation: [Brief explanation why the answer is correct, ideally referencing the context]

- For True or False questions:
Question: [The question text]
Correct answer: [True or False]
Explanation: [Brief explanation why the answer is True or False, ideally referencing the context]

Return *only* the formatted questions, answers, and explanations. Do not include any introductory text, summaries, or closing remarks. Ensure all requested questions are generated.`;

    // --- Call Hugging Face API ---
    let generatedText = '';
    try {
      const result = await executeWithRetry(
        () =>
          hf.textGeneration({
            model:
              process.env.HF_MODEL_EXAM || 'mistralai/Mistral-7B-Instruct-v0.2', // Separate model possible
            inputs: prompt,
            parameters: {
              max_new_tokens: 300 * numQuestions, // Higher token estimate for complex exam Qs
              temperature: 0.5, // Lower temp for more deterministic/accurate exam Qs
              repetition_penalty: 1.15,
              // top_p: 0.85,
            },
          }),
        3, // Retries
        30000, // Longer timeout for potentially larger context/generation
      );
      generatedText = result.generated_text;
    } catch (apiError) {
      console.error(
        `Hugging Face API error generating exam ${examId}:`,
        apiError,
      );
      throw new AppError(
        `AI model failed to generate exam questions: ${apiError.message}`,
        503,
        'AI_SERVICE_ERROR',
      );
    }

    // --- Parse AI Response ---
    const examQuestions = parseQuizFromAIResponse(generatedText); // Reuse the parser

    if (examQuestions.length === 0) {
      console.warn(
        `AI model did not return parseable questions for exam ${examId}. Response: ${generatedText.substring(
          0,
          200,
        )}...`,
      );
      return next(
        new AppError(
          'Failed to parse valid exam questions from the AI response.',
          500,
          'AI_RESPONSE_PARSE_FAILED',
        ),
      );
    }
    // Optional: Could save the generated questions back to the exam document or a subcollection
    // await examDocRef.collection('generatedQuestions').add({ questions: examQuestions, generatedAt: serverTimestamp() });

    // --- Respond to Client ---
    // Return the generated questions directly
    res.json({examId: examId, title: examTitle, questions: examQuestions});
  } catch (error) {
    if (!error.isOperational) {
      console.error(
        `Unexpected error during exam generation for exam ${req.body.examId}:`,
        error,
      );
    }
    next(error);
  }
};

// --- NEW: Save Exam Result ---
// POST /save-result
exports.saveExamResult = async (req, res, next) => {
  try {
    const {userId, examId, result} = req.body;

    // --- Input Validation ---
    if (!userId || typeof userId !== 'string')
      return next(
        new AppError('Valid userId is required.', 400, 'INVALID_USER_ID'),
      );
    if (!examId || typeof examId !== 'string')
      return next(
        new AppError('Valid examId is required.', 400, 'INVALID_EXAM_ID'),
      );
    if (!result || typeof result !== 'object')
      return next(
        new AppError(
          'Exam result object is required.',
          400,
          'MISSING_RESULT_OBJECT',
        ),
      );

    // Validate required fields within the result object
    const {totalQuestions, correctAnswers, score, isPassed, answeredQuestions} =
      result;
    if (
      totalQuestions === undefined ||
      typeof totalQuestions !== 'number' ||
      totalQuestions <= 0
    )
      return next(
        new AppError(
          'Valid result.totalQuestions is required.',
          400,
          'INVALID_TOTAL_QUESTIONS',
        ),
      );
    if (
      correctAnswers === undefined ||
      typeof correctAnswers !== 'number' ||
      correctAnswers < 0
    )
      return next(
        new AppError(
          'Valid result.correctAnswers is required.',
          400,
          'INVALID_CORRECT_ANSWERS',
        ),
      );
    // 'score' in the input seems to be percentage already? Let's clarify. Assuming input 'score' is percentage.
    if (
      score === undefined ||
      typeof score !== 'number' ||
      score < 0 ||
      score > 100
    )
      return next(
        new AppError(
          'Valid result.score (percentage 0-100) is required.',
          400,
          'INVALID_SCORE_PERCENTAGE',
        ),
      );
    if (isPassed === undefined || typeof isPassed !== 'boolean')
      return next(
        new AppError(
          'Valid result.isPassed (boolean) is required.',
          400,
          'INVALID_IS_PASSED',
        ),
      );
    // answeredQuestions is optional but should be an object/array if provided
    if (answeredQuestions && typeof answeredQuestions !== 'object')
      return next(
        new AppError(
          'result.answeredQuestions should be an object or array if provided.',
          400,
          'INVALID_ANSWERED_QUESTIONS',
        ),
      );

    // Recalculate percentage server-side for consistency? Or trust client? Trusting client for now.
    const percentage = parseFloat(score.toFixed(1));

    // --- Prepare Exam Result Data ---
    const examResultRef = db.collection('examResults').doc(); // Auto-generate ID
    const timestamp = serverTimestamp(); // Use server time for results
    const examResultData = {
      userId,
      examId,
      totalQuestions,
      score: correctAnswers, // Store raw number of correct answers
      percentage, // Store calculated/provided percentage
      isPassed,
      answeredQuestions: answeredQuestions || {}, // Store details if available
      timestamp,
    };

    // --- Save Exam Result and Update User Progress (Transaction Recommended) ---
    await db.runTransaction(async transaction => {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);

      // 1. Save the detailed exam result
      transaction.set(examResultRef, examResultData);

      // 2. Update user's general progress
      const userUpdateData = {};
      const examCompletionRecord = {
        examId,
        percentage,
        passed: isPassed, // Use 'passed' consistently
        completedAt: timestamp, // Use the same server timestamp
      };

      userUpdateData['learningProgress.completedExams'] =
        admin.firestore.FieldValue.arrayUnion(examCompletionRecord);
      userUpdateData['lastActivity'] = timestamp;

      // Potentially update overall score or badges based on exam result here if needed

      if (userDoc.exists) {
        transaction.update(userRef, userUpdateData);
      } else {
        // Create user if they don't exist (edge case?)
        console.warn(
          `User ${userId} not found during exam save. Creating user record.`,
        );
        transaction.set(
          userRef,
          {
            userId,
            learningProgress: {
              completedExams: [examCompletionRecord],
              completedModules: [],
              completedQuizzes: [],
            },
            lastActivity: timestamp,
            createdAt: timestamp,
          },
          {merge: true},
        );
      }
      // Note: We are NOT automatically marking modules/quizzes complete here,
      // assuming exam completion is tracked separately or triggers other logic.
    });

    console.log(
      `Exam result ${examResultRef.id} saved for user ${userId}, exam ${examId}. Passed: ${isPassed}`,
    );

    // --- Respond to Client ---
    res.status(201).json({
      message: 'Exam result saved successfully.',
      resultId: examResultRef.id,
      passed: isPassed,
    });
  } catch (error) {
    if (error.code === 'NOT_FOUND' && error.message.includes('User')) {
      // Handle transaction user not found specifically if needed, though covered by AppError below
      next(
        new AppError(
          'User not found during transaction.',
          404,
          'USER_NOT_FOUND_TX',
        ),
      );
    } else if (
      error.message?.includes('firestore') ||
      error.name?.includes('FirebaseError')
    ) {
      console.error(
        `Firestore error saving exam result for user ${req.body.userId}, exam ${req.body.examId}:`,
        error,
      );
      next(
        new AppError(
          `Database error saving exam result: ${error.message}`,
          500,
          'DB_SAVE_ERROR',
        ),
      );
    } else {
      console.error(
        `Unexpected error saving exam result for user ${req.body.userId}, exam ${req.body.examId}:`,
        error,
      );
      next(error);
    }
  }
};

// --- NEW: Get Exam Progress ---
// GET /progress/:userId
exports.getExamProgress = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const {examId} = req.query; // Optional: Filter by specific exam

    if (!userId || typeof userId !== 'string') {
      return next(
        new AppError(
          'Valid User ID parameter is required',
          400,
          'INVALID_USER_ID_PARAM',
        ),
      );
    }

    let query = db.collection('examResults').where('userId', '==', userId);

    if (examId && typeof examId === 'string') {
      console.log(
        `Filtering exam progress for user ${userId} by exam ${examId}`,
      );
      query = query.where('examId', '==', examId);
    }

    query = query.orderBy('timestamp', 'desc'); // Latest first

    const examResultsSnapshot = await query.get();

    const examProgress = examResultsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        resultId: doc.id, // ID of the result document
        examId: data.examId,
        score: data.score, // Number correct
        totalQuestions: data.totalQuestions,
        percentage: data.percentage,
        passed: data.isPassed, // Use 'passed' field name
        timestamp: data.timestamp?.toDate()?.toISOString() || null,
      };
    });

    res.json({examProgress}); // Return as object with key
  } catch (error) {
    console.error(
      `Error fetching exam progress for user ${req.params.userId}:`,
      error,
    );
    next(
      new AppError('Failed to retrieve exam progress.', 500, 'DB_FETCH_ERROR'),
    );
  }
};

// --- DEPRECATED? Review 'completeExam' ---
// This seems like a specific update triggered after an exam, potentially redundant
// with saveExamResult or should be part of a larger "complete module" flow.
// For now, commenting out but keeping for reference. If needed, refactor significantly.
/*
// POST /user/:userId/exam (Old route, seems complex and maybe redundant)
exports.completeExam = async (req, res, next) => {
  try {
    const { userId } = req.params;
    // These params seem odd for just "completing" an exam - score usually comes from saving result
    const { moduleId, examId, quizId, score } = req.body;

    // Input validation needed here...

    console.warn(`Executing 'completeExam' for user ${userId}, exam ${examId}. Review if this logic is still required.`);

    await db.runTransaction(async transaction => {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND_TX');
      }

      const timestamp = serverTimestamp();

      // Update user document - THIS SEEMS VERY AGGRESSIVE / POTENTIALLY INCORRECT
      const updates = {
          lastActivity: timestamp, // Sensible update
      };
      if(examId) updates['learningProgress.completedExams'] = admin.firestore.FieldValue.arrayUnion(examId);
      if(moduleId) updates['learningProgress.completedModules'] = admin.firestore.FieldValue.arrayUnion(moduleId);
      if(quizId) updates['learningProgress.completedQuizzes'] = admin.firestore.FieldValue.arrayUnion(quizId); // Should this be quiz result object?
      if(score !== undefined) updates['learningProgress.score'] = admin.firestore.FieldValue.increment(score); // What score is this? Overall?

      transaction.update(userRef, updates);

      // Update separate progress documents? This seems inconsistent with saving results elsewhere.
      // if (examId) {
      //     const progressRef = userRef.collection('progress').doc(examId); // Using examId as doc ID?
      //     transaction.set(progressRef, { examId, moduleId, quizId, score, completedAt: timestamp }, { merge: true });
      // }
      // if (moduleId) { // Also updating module start/progress doc?
      //     const moduleStartRef = userRef.collection('progress').doc(`${moduleId}_start`);
      //     transaction.set(moduleStartRef, { status: 'completed', completedAt: timestamp }, { merge: true }); // Update status
      // }

    });

    res.status(200).json({ message: 'Exam completion processed (Review Logic)' });

  } catch (error) {
     console.error(`Error in 'completeExam' for user ${req.params.userId}:`, error);
    next(error); // Pass to global handler
  }
};
*/
