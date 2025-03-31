const admin = require('firebase-admin');
const AppError = require('../utils/appError');
const {serverTimestamp} = require('../utils/firestoreHelpers');
const {executeWithRetry} = require('../utils/retryHandler');
const {parseQuizFromAIResponse} = require('../utils/aiHelpers');
const {hf} = require('../server'); // Import initialized HF instance from server.js

const db = admin.firestore();

// POST /generate-quiz
exports.generateQuiz = async (req, res, next) => {
  try {
    const {
      moduleId,
      numberOfQuestions = 5, // Default to 5 questions
      questionTypes = ['multiple choice', 'true or false'], // Default types
    } = req.body;

    // --- Input Validation ---
    if (!moduleId || typeof moduleId !== 'string') {
      return next(
        new AppError(
          'Valid moduleId is required in the request body.',
          400,
          'INVALID_MODULE_ID',
        ),
      );
    }
    const numQuestions = parseInt(numberOfQuestions, 10);
    if (isNaN(numQuestions) || numQuestions <= 0 || numQuestions > 20) {
      // Limit max questions
      return next(
        new AppError(
          'numberOfQuestions must be a number between 1 and 20.',
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
    // Optional: Validate specific question types if needed

    // --- Fetch Module Content ---
    const moduleRef = db.collection('modules').doc(moduleId);
    const moduleDoc = await moduleRef.get();

    if (!moduleDoc.exists) {
      return next(
        new AppError(
          `Module with ID ${moduleId} not found.`,
          404,
          'MODULE_NOT_FOUND',
        ),
      );
    }

    const moduleData = moduleDoc.data();
    const sectionsSnapshot = await moduleRef
      .collection('sections')
      .orderBy('order')
      .get(); // Fetch in order

    let sectionContent = '';
    sectionsSnapshot.forEach(doc => {
      sectionContent += ` ${doc.data().content || ''}`; // Handle potentially missing content
    });

    // Combine description and section content (ensure they exist)
    const moduleContentContext = `${
      moduleData.description || ''
    } ${sectionContent}`.trim();

    if (!moduleContentContext) {
      return next(
        new AppError(
          `No content found for module ${moduleId} to generate quiz from.`,
          404,
          'MODULE_CONTENT_NOT_FOUND',
        ),
      );
    }

    console.log(
      `Generating ${numQuestions} quiz questions for module ${moduleId}...`,
    );

    // --- Prepare AI Prompt ---
    const prompt = `Generate exactly ${numQuestions} quiz questions based on the following content: """${moduleContentContext}"""
The questions should strictly be of the following types: ${questionTypes.join(
      ', ',
    )}.
Format the output precisely as follows for each question:
- For multiple choice questions:
Question: [The question text]
a) [Option a text]
b) [Option b text]
c) [Option c text]
d) [Option d text]
Correct answer: [Correct option letter, e.g., a]
Explanation: [Brief explanation why the answer is correct, referencing the content if possible]

- For True or False questions:
Question: [The question text]
Correct answer: [True or False]
Explanation: [Brief explanation why the answer is True or False, referencing the content if possible]

Ensure the explanations are concise and accurate. Return *only* the formatted questions, answers, and explanations. Do not include any introductory text, summaries, or closing remarks.`;

    // --- Call Hugging Face API with Retry ---
    let generatedText = '';
    try {
      const result = await executeWithRetry(
        () =>
          hf.textGeneration({
            // Consider using a model fine-tuned for question generation if available
            model:
              process.env.HF_MODEL_QUIZ || 'mistralai/Mistral-7B-Instruct-v0.2', // Use env var
            inputs: prompt,
            parameters: {
              max_new_tokens: 200 * numQuestions, // Estimate tokens needed based on question count
              temperature: 0.6, // Slightly lower temp for more factual questions
              repetition_penalty: 1.1, // Discourage repetition
              // top_p: 0.9, // Optional nucleus sampling
              // do_sample: true, // Ensure sampling is enabled if using temp/top_p
            },
          }),
        3, // Max retries
        15000, // Timeout (adjust based on model/load)
      );
      generatedText = result.generated_text;
    } catch (apiError) {
      console.error(
        `Hugging Face API error after retries for module ${moduleId}:`,
        apiError,
      );
      // Throw a specific operational error
      throw new AppError(
        `Failed to generate quiz questions from AI model: ${apiError.message}`,
        503,
        'AI_SERVICE_ERROR',
      ); // 503 Service Unavailable
    }

    // --- Parse AI Response ---
    const quizQuestions = parseQuizFromAIResponse(generatedText);

    if (quizQuestions.length === 0) {
      console.warn(
        `AI model did not return parseable questions for module ${moduleId}. Response: ${generatedText.substring(
          0,
          200,
        )}...`,
      );
      // Decide whether to return error or empty array
      return next(
        new AppError(
          'Failed to parse valid quiz questions from the AI response.',
          500,
          'AI_RESPONSE_PARSE_FAILED',
        ),
      );
      // OR: res.json({ quiz: [] }); // Return empty quiz
    }

    // --- Respond to Client ---
    res.json({quiz: quizQuestions});
  } catch (error) {
    // Pass error to the global error handler
    // Ensure AppErrors created above are passed correctly
    if (!error.isOperational) {
      console.error(
        `Unexpected error during quiz generation for module ${req.body.moduleId}:`,
        error,
      );
    }
    next(error);
  }
};

// POST /save-quiz-result
exports.saveQuizResult = async (req, res, next) => {
  try {
    const {
      userId,
      moduleId,
      quizId, // Optional: ID of the specific quiz instance if pre-defined
      score, // Number of correct answers
      totalQuestions,
      answers, // Optional: object mapping questionId to userAnswer
      timestamp, // Optional: Client-provided timestamp string/Date
    } = req.body;

    // --- Input Validation ---
    if (!userId || typeof userId !== 'string')
      return next(
        new AppError('Valid userId is required.', 400, 'INVALID_USER_ID'),
      );
    if (!moduleId || typeof moduleId !== 'string')
      return next(
        new AppError('Valid moduleId is required.', 400, 'INVALID_MODULE_ID'),
      );
    if (score === undefined || typeof score !== 'number' || score < 0)
      return next(
        new AppError(
          'Valid score (number >= 0) is required.',
          400,
          'INVALID_SCORE',
        ),
      );
    if (
      !totalQuestions ||
      typeof totalQuestions !== 'number' ||
      totalQuestions <= 0
    )
      return next(
        new AppError(
          'Valid totalQuestions (number > 0) is required.',
          400,
          'INVALID_TOTAL_QUESTIONS',
        ),
      );
    if (score > totalQuestions)
      return next(
        new AppError(
          'Score cannot be greater than totalQuestions.',
          400,
          'INVALID_SCORE_VALUE',
        ),
      );

    const userRef = db.collection('users').doc(userId);
    const batch = db.batch();

    // --- Prepare Quiz Result Data ---
    const resultTimestamp = timestamp
      ? admin.firestore.Timestamp.fromDate(new Date(timestamp))
      : serverTimestamp();
    const percentage =
      totalQuestions > 0
        ? parseFloat(((score / totalQuestions) * 100).toFixed(1))
        : 0; // Calculate percentage
    const passingThreshold = 0.7; // 70%
    const passed = percentage >= passingThreshold * 100;

    // Create a new document in 'quizResults' collection
    const quizResultRef = db.collection('quizResults').doc(); // Auto-generate ID
    const finalQuizId = quizId || quizResultRef.id; // Use provided quizId or the new result ID

    batch.set(quizResultRef, {
      userId,
      moduleId,
      quizId: finalQuizId,
      score,
      totalQuestions,
      percentage,
      passed, // Store if the user passed this attempt
      answers: answers || {}, // Store user's answers if provided
      timestamp: resultTimestamp,
    });

    // --- Update User's Learning Progress ---
    // Check if user exists (optional but good for robustness)
    const userDoc = await userRef.get();
    const updateData = {};

    // Update array of completed quizzes for the user
    const quizCompletionRecord = {
      moduleId,
      quizId: finalQuizId,
      percentage,
      passed,
      completedAt: resultTimestamp,
    };
    // Use FieldValue.arrayUnion to avoid duplicates if same quiz is somehow saved again
    // Note: arrayUnion compares entire objects. If timestamps differ slightly, it won't be a duplicate.
    // Consider storing only quizId if strict uniqueness is needed per quiz definition.
    updateData['learningProgress.completedQuizzes'] =
      admin.firestore.FieldValue.arrayUnion(quizCompletionRecord);

    // Update last activity timestamp
    updateData['lastActivity'] = serverTimestamp(); // Use server time for last activity

    // If the user passed this quiz, potentially mark the module as completed *based on quiz*
    // This logic might be complex: Does completing one quiz complete the module? Or is there a final exam?
    // Assuming passing *this* quiz contributes to module completion, but might not be the sole condition.
    // Let's just record the quiz completion here. Module completion might be handled elsewhere (e.g., after an exam or all required activities).
     if (passed) {
       updateData['learningProgress.completedModules'] = admin.firestore.FieldValue.arrayUnion(moduleId);
     }

    if (userDoc.exists) {
      batch.update(userRef, updateData);
    } else {
      // If user doesn't exist, create them with this progress
      console.warn(
        `User ${userId} not found. Creating user record with quiz result.`,
      );
      // Initialize learningProgress structure carefully
      batch.set(
        userRef,
        {
          userId,
          learningProgress: {
            completedQuizzes: [quizCompletionRecord], // Start with this quiz
            completedModules: [],
            completedExams: [],
          },
          lastActivity: serverTimestamp(),
          createdAt: serverTimestamp(),
          // Add other default user fields if necessary (email, displayName from auth?)
        },
        {merge: true},
      ); // Merge in case another process creates the user concurrently
    }

    // --- Commit Batch ---
    await batch.commit();
    console.log(
      `Quiz result ${quizResultRef.id} saved for user ${userId}, module ${moduleId}. Passed: ${passed}`,
    );

    // --- Respond to Client ---
    res.status(201).json({
      message: 'Quiz result saved successfully.',
      resultId: quizResultRef.id, // Return the ID of the saved result document
      passed: passed, // Inform client if they passed this attempt
    });
  } catch (error) {
    if (error.message?.includes('firestore')) {
      // More specific error check
      console.error(
        `Firestore error saving quiz result for user ${req.body.userId}:`,
        error,
      );
      next(
        new AppError(
          `Database error saving quiz result: ${error.message}`,
          500,
          'DB_SAVE_ERROR',
        ),
      );
    } else {
      console.error(
        `Unexpected error saving quiz result for user ${req.body.userId}:`,
        error,
      );
      next(error); // Pass to global handler
    }
  }
};

// GET /user/:userId/quiz-history
exports.getQuizHistory = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const {moduleId} = req.query; // Optional query param to filter by module

    if (!userId || typeof userId !== 'string') {
      return next(
        new AppError(
          'Valid User ID parameter is required',
          400,
          'INVALID_USER_ID_PARAM',
        ),
      );
    }

    let query = db.collection('quizResults').where('userId', '==', userId);

    // Add module filter if provided
    if (moduleId && typeof moduleId === 'string') {
      console.log(
        `Filtering quiz history for user ${userId} by module ${moduleId}`,
      );
      query = query.where('moduleId', '==', moduleId);
    }

    // Order by timestamp descending to get latest results first
    query = query.orderBy('timestamp', 'desc');

    // Add limit if needed (e.g., .limit(50))

    const quizResultsSnapshot = await query.get();

    const quizHistory = quizResultsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        moduleId: data.moduleId,
        quizId: data.quizId,
        score: data.score,
        totalQuestions: data.totalQuestions,
        percentage: data.percentage,
        passed: data.passed,
        timestamp: data.timestamp?.toDate()?.toISOString() || null, // Safely format timestamp
        // Optionally include answers: answers: data.answers
      };
    });

    res.json({quizHistory});
  } catch (error) {
    console.error(
      `Error fetching quiz history for user ${req.params.userId}:`,
      error,
    );
    next(
      new AppError('Failed to retrieve quiz history.', 500, 'DB_FETCH_ERROR'),
    );
  }
};
