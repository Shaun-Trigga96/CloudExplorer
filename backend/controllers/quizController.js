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
    const resultTimestampForDoc = timestamp
    ? admin.firestore.Timestamp.fromDate(new Date(timestamp))
    : serverTimestamp();

  // Timestamp for the array element (MUST be a concrete Timestamp)
  const completionTimestampForArray = timestamp
    ? admin.firestore.Timestamp.fromDate(new Date(timestamp)) // Use client time if available
    : admin.firestore.Timestamp.now(); // Use server's current time as a concrete Timestamp

  const percentage =
    totalQuestions > 0
      ? parseFloat(((score / totalQuestions) * 100).toFixed(1))
      : 0;
  const passingThreshold = 0.7; // 70%
  const passed = percentage >= passingThreshold * 100;

  const quizResultRef = db.collection('quizResults').doc();
  const finalQuizId = quizId || quizResultRef.id;

    batch.set(quizResultRef, {
      userId,
      moduleId,
      quizId: finalQuizId,
      score,
      totalQuestions,
      percentage,
      passed, // Store if the user passed this attempt
      answers: answers || {}, // Store user's answers if provided
      timestamp: resultTimestampForDoc,
    });
// --- Update User's Learning Progress ---
    // NOTE: Reading the user doc inside the batch is generally better practice
    //       if you need its current state for the update logic.
    //       However, for arrayUnion, it's less critical. We'll keep the read outside for now.
    const userDoc = await userRef.get();
    const updateData = {};

    // Create the record with the CONCRETE timestamp for the array
    const quizCompletionRecord = {
      moduleId,
      quizId: finalQuizId,
      percentage,
      passed,
      completedAt: completionTimestampForArray, // <--- FIXED: Use the concrete timestamp
    };

    updateData['learningProgress.completedQuizzes'] =
      admin.firestore.FieldValue.arrayUnion(quizCompletionRecord);

    updateData['lastActivity'] = serverTimestamp(); // OK (top-level)

    if (passed) {
       // Consider if this logic is correct - does passing one quiz complete the module?
       updateData['learningProgress.completedModules'] = admin.firestore.FieldValue.arrayUnion(moduleId);
    }

    if (userDoc.exists) {
      batch.update(userRef, updateData);
    } else {
      console.warn(
        `User ${userId} not found. Creating user record with quiz result.`,
      );
      batch.set(
        userRef,
        {
          userId,
          // Ensure email, displayName etc. are set if available from auth context during signup
          learningProgress: {
            completedQuizzes: [quizCompletionRecord], // <--- FIXED: Uses record with concrete timestamp
            completedModules: passed ? [moduleId] : [], // Initialize based on current result
            completedExams: [],
          },
          lastActivity: serverTimestamp(), // OK (top-level)
          createdAt: serverTimestamp(), // OK (top-level)
        },
        {merge: true},
      );
    }

    await batch.commit();
    console.log(
      `Quiz result ${quizResultRef.id} saved for user ${userId}, module ${moduleId}. Passed: ${passed}`,
    );

    res.status(201).json({
      message: 'Quiz result saved successfully.',
      resultId: quizResultRef.id,
      passed: passed,
    });
  } catch (error) {
     // ... (keep error handling as is) ...
     console.error(
        `Error saving quiz result for user ${req.body.userId}:`,
        error,
      );
      next(error); // Pass to global handler
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