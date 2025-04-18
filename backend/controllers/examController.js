const admin = require('firebase-admin');
const AppError = require('../utils/appError');

const db = admin.firestore();

// --- NEW: Save Exam Result ---
// POST /save-result
exports.saveExamResult = async (req, res, next) => {
  console.log('saveExamResult: Received request body:', req.body);
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
    const {
      totalQuestions,
      correctAnswers,
      score,
      isPassed,
      answeredQuestions,
      timestamp,
    } = result;
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

    // --- Prepare Exam Result Data ---
    const examResultRef = db.collection('examResults').doc(); // Auto-generate ID
    const resultTimestamp = timestamp
      ? admin.firestore.Timestamp.fromDate(new Date(timestamp))
      : admin.firestore.FieldValue.serverTimestamp();
    const percentage =
      totalQuestions > 0
        ? parseFloat(((correctAnswers / totalQuestions) * 100).toFixed(1)) // Use correctAnswers here
        : 0; // Calculate percentage
    const passingThreshold = 0.7; // 70%
    const passed = percentage >= passingThreshold * 100;
    const examResultData = {
      userId,
      examId,
      totalQuestions,
      score: correctAnswers, // Store raw number of correct answers
      percentage, // Store calculated/provided percentage
      passed,
      answeredQuestions: answeredQuestions || {}, // Store details if available
      timestamp: resultTimestamp,
    };

    // --- Save Exam Result and Update User Progress (Transaction Recommended) ---
    await db.runTransaction(async transaction => {
      console.log('saveExamResult: Starting transaction...');
      const userRef = db.collection('users').doc(userId);
      console.log('saveExamResult: Getting user document:', userId);
      const userDoc = await transaction.get(userRef);
      console.log('saveExamResult: User document retrieved.');

      // 1. Save the detailed exam result
      console.log('saveExamResult: Saving exam result:', examResultData);
      transaction.set(examResultRef, examResultData);
      console.log('saveExamResult: Exam result saved.');

      // 2. Update user's general progress
      // Create a timestamp without serverTimestamp for array elements
      const completionTimestamp = timestamp
        ? admin.firestore.Timestamp.fromDate(new Date(timestamp))
        : new Date(); // Use regular Date when adding to array
      
      const examCompletionRecord = {
        examId,
        percentage,
        passed: passed, // Use 'passed' consistently
        completedAt: completionTimestamp, // Use regular timestamp, NOT serverTimestamp
      };

      // Get existing completed exams or initialize empty array
      let completedExams = [];
      if (userDoc.exists && userDoc.data().learningProgress?.completedExams) {
        completedExams = [...userDoc.data().learningProgress.completedExams];
      }

      // Check if the user has already completed the exam
      const existingExamIndex = completedExams.findIndex(
        (exam) => exam.examId === examId
      );

      // Update or add the exam record
      if (existingExamIndex !== -1) {
        // If the exam exists, replace it with the new record
        completedExams[existingExamIndex] = examCompletionRecord;
      } else {
        // If the exam doesn't exist, push the new record
        completedExams.push(examCompletionRecord);
      }
      
      // Prepare the update with explicit updates instead of arrayUnion
      const userUpdateData = {
        'learningProgress.completedExams': completedExams,
        'lastActivity': admin.firestore.FieldValue.serverTimestamp()
      };
      
      console.log(
        'saveExamResult: Preparing user update data:',
        userUpdateData,
      );

      if (userDoc.exists) {
        console.log('saveExamResult: Updating existing user:', userId);
        transaction.update(userRef, userUpdateData);
        console.log('saveExamResult: User updated.');
      } else {
        // Create user if they don't exist (edge case?)
        console.warn(
          `User ${userId} not found during exam save. Creating user record.`,
        );
        console.log('saveExamResult: Creating new user:', userId);
        transaction.set(
          userRef,
          {
            userId,
            learningProgress: {
              completedExams: [examCompletionRecord],
              completedModules: [],
              completedQuizzes: [],
            },
            lastActivity: admin.firestore.FieldValue.serverTimestamp(),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          {merge: true},
        );
        console.log('saveExamResult: New user created.');
      }
      console.log('saveExamResult: Transaction completed.');
    });

    console.log(
      `Exam result ${examResultRef.id} saved for user ${userId}, exam ${examId}. Passed: ${isPassed}`,
    );

    // --- Respond to Client ---
    res.status(201).json({
      message: 'Exam result saved successfully.',
      resultId: examResultRef.id,
      passed: passed,
      timestamp: resultTimestamp, // Include the timestamp in the response
    });
  } catch (error) {
    console.error(
      `Error saving exam result for user ${req.body.userId}, exam ${req.body.examId}:`,
      error, // Log the full error object
    );
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
        passed: data.passed, // Use 'passed' field name
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

// --- NEW: List Exams ---
// GET /list
exports.listExams = async (req, res, next) => {
  try {
    const {
      limit = 10,
      lastId,
      orderBy = 'updatedAt',
      orderDir = 'desc',
    } = req.query;
    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
      // Sensible max limit
      return next(
        new AppError(
          'Invalid limit value (must be 1-50)',
          400,
          'INVALID_LIMIT',
        ),
      );
    }
    const validOrderBy = ['title', 'createdAt', 'updatedAt']; // Allowed sort fields
    const validOrderDir = ['asc', 'desc'];
    if (!validOrderBy.includes(orderBy) || !validOrderDir.includes(orderDir)) {
      return next(
        new AppError(
          'Invalid orderBy or orderDir parameter',
          400,
          'INVALID_SORT',
        ),
      );
    }

    let query = db
      .collection('exams')
      .orderBy(orderBy, orderDir)
      .limit(parsedLimit);

    if (lastId) {
      const lastDocSnapshot = await db.collection('exams').doc(lastId).get();
      if (lastDocSnapshot.exists) {
        query = query.startAfter(lastDocSnapshot); // Use snapshot for pagination cursor
      } else {
        // Don't throw error, just ignore invalid lastId and start from beginning
        console.warn(
          `Pagination lastId '${lastId}' not found. Starting from beginning.`,
        );
        // return next(new AppError('Invalid lastId provided for pagination', 400, 'INVALID_LAST_ID'));
      }
    }

    const examsSnapshot = await query.get();
    const exams = examsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        duration: data.duration,
        prerequisites: data.prerequisites,
        associatedModules: data.associatedModules,
        passingRate: data.passingRate,
        content: data.content, // Google Doc URL or other content identifier
        createdAt: data.createdAt?.toDate() || null,
        updatedAt: data.updatedAt?.toDate() || null,
        // Add other relevant fields like thumbnail URL, tags, etc.
      };
    });

    // Determine the last ID for the next page request
    const newLastId =
      exams.length > 0 ? exams[exams.length - 1].id : null;

    res.json({
      exams,
      hasMore: exams.length === parsedLimit, // If we fetched the max limit, there might be more
      lastId: newLastId,
    });
  } catch (error) {
    console.error('Error listing exams:', error);
    next(error);
  }
};

// --- NEW: Get Exam by ID ---
// GET /:examId
exports.getExamById = async (req, res, next) => {
  try {
    const examId = req.params.examId;
    console.log('examId:', examId);
    if (!examId || typeof examId !== 'string') {
      return next(
        new AppError('Invalid exam ID parameter', 400, 'INVALID_EXAM_ID'),
      );
    }

    const examDoc = await db.collection('exams').doc(examId).get();

    if (!examDoc.exists) {
      return next(
        new AppError(`Exam with ID ${examId} not found`, 404, 'EXAM_NOT_FOUND'),
      );
    }

    const examData = examDoc.data();
    res.json({
      examId: examDoc.id,
      ...examData,
      // Include other relevant fields from the exam document
    });
  } catch (error) {
    console.error(`Error getting exam by ID ${req.params.examId}:`, error);
    next(error);
  }
};
