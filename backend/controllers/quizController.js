const admin = require('firebase-admin');
const AppError = require('../utils/appError');
const {serverTimestamp} = require('../utils/firestoreHelpers');

const db = admin.firestore();


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
      error,quizId
    );
    next(
      new AppError('Failed to retrieve quiz history.', 500, 'DB_FETCH_ERROR'),
    );
  }
};

// --- NEW: Get Quiz by ID ---
// GET /quiz/:id
exports.getQuizById = async (req, res, next) => {
  try {
    const id = req.params.id; // Changed from quizId to id
    console.log('quizId:', id);
    const quizDoc = await db.collection('quizzes').doc(id).get(); // Changed from quizId to id

    if (!quizDoc.exists) {
      return next(
        new AppError(`Quiz with ID ${id} not found`, 404, 'QUIZ_NOT_FOUND'),
      );
    }

    const quizData = quizDoc.data();
    res.json({
      id: quizDoc.id, // Changed from quizDoc.quizId to quizDoc.id
      ...quizData,
      // Include other relevant fields from the quiz document
    });
  } catch (error) {
    console.error(`Error getting quiz by ID ${req.params.id}:`, error);
    next(error);
  }
};


// --- NEW: Get All Quizzes ---
// GET /
exports.getAllQuizzes = async (req, res, next) => {
  try {
    const quizzesSnapshot = await db.collection('quizzes').get();

    const quizzes = quizzesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Include other relevant fields from the quiz document
    }));

    res.json({ quizzes });
  } catch (error) {
    console.error('Error getting all quizzes:', error);
    next(error);
  }
};