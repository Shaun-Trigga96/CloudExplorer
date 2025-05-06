const admin = require('firebase-admin');
const AppError = require('../utils/appError');
const {serverTimestamp} = require('../utils/firestoreHelpers');

const db = admin.firestore();

// POST /save-quiz-result
// RESPONSIBILITY: Saves the details of a specific quiz attempt to the 'quizResults' collection.
// Does NOT update the user's overall learning path progress directly anymore.
exports.saveQuizResult = async (req, res, next) => {
  try {
    const {
      userId,
      moduleId, // Still useful for context within the result itself
      quizId,   // ID of the specific quiz definition
      providerId, // ADDED: ID of the provider (e.g., 'gcp')
      pathId,     // ADDED: ID of the path definition (e.g., 'cdl')
      score,      // Number of correct answers
      totalQuestions,
      percentage, // Percentage score (0-100) - frontend might calculate this
      passed,     // Boolean indicating if the user passed this attempt
      answers,    // Optional: object mapping questionId to userAnswer
      timestamp,  // Optional: Client-provided timestamp string/Date
    } = req.body;

    // --- Input Validation ---
    if (!userId || typeof userId !== 'string')
      return next(new AppError('Valid userId is required.', 400, 'INVALID_USER_ID'));
    if (!moduleId || typeof moduleId !== 'string')
      return next(new AppError('Valid moduleId is required.', 400, 'INVALID_MODULE_ID'));
    if (!quizId || typeof quizId !== 'string')
      return next(new AppError('Valid quizId is required.', 400, 'INVALID_QUIZ_ID'));
    // ADDED Validation
    if (!providerId || typeof providerId !== 'string')
      return next(new AppError('Valid providerId is required.', 400, 'INVALID_PROVIDER_ID'));
    if (!pathId || typeof pathId !== 'string')
      return next(new AppError('Valid pathId is required.', 400, 'INVALID_PATH_ID'));
    // --- End ADDED Validation ---
    if (score === undefined || typeof score !== 'number' || score < 0)
      return next(new AppError('Valid score (number >= 0) is required.', 400, 'INVALID_SCORE'));
    if (!totalQuestions || typeof totalQuestions !== 'number' || totalQuestions <= 0)
      return next(new AppError('Valid totalQuestions (number > 0) is required.', 400, 'INVALID_TOTAL_QUESTIONS'));
    if (score > totalQuestions)
      return next(new AppError('Score cannot be greater than totalQuestions.', 400, 'INVALID_SCORE_VALUE'));
    // Validate percentage and passed
    if (percentage === undefined || typeof percentage !== 'number' || percentage < 0 || percentage > 100)
        return next(new AppError('Valid percentage (0-100) is required.', 400, 'INVALID_PERCENTAGE'));
    if (passed === undefined || typeof passed !== 'boolean')
        return next(new AppError('Valid passed (boolean) is required.', 400, 'INVALID_PASSED_FLAG'));


    // --- Prepare Quiz Result Data ---
    const resultTimestampForDoc = timestamp
      ? admin.firestore.Timestamp.fromDate(new Date(timestamp))
      : serverTimestamp(); // Use serverTimestamp for the document field

    const quizResultRef = db.collection('quizResults').doc(); // Auto-generate ID

    const quizResultData = {
      userId,
      moduleId,
      quizId,
      providerId, // ADDED
      pathId,     // ADDED
      score,      // Raw score
      totalQuestions,
      percentage, // Calculated/provided percentage
      passed,     // Store if the user passed this attempt
      answers: answers || {}, // Store user's answers if provided
      timestamp: resultTimestampForDoc,
    };

    // --- Save ONLY the Quiz Result ---
    // User progress update (adding to completedQuizzes array within the specific learning path)
    // is now handled by the POST /api/v1/users/:userId/progress endpoint.
    await quizResultRef.set(quizResultData);

    console.log(
      `Quiz result ${quizResultRef.id} saved for user ${userId}, module ${moduleId}, path ${providerId}/${pathId}. Passed: ${passed}`,
    );

    res.status(201).json({
      status: 'success',
      message: 'Quiz result saved successfully. Update user progress if passed.', // Updated message
      resultId: quizResultRef.id,
      passed: passed,
    });
  } catch (error) {
     console.error(
        `Error saving quiz result for user ${req.body.userId}:`,
        error,
      );
      next(error); // Pass to global handler
  }
};

// GET /user/:userId/quiz-history
// Optionally filter by providerId and pathId
exports.getQuizHistory = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const {
        moduleId, // Optional filter by module
        providerId, // ADDED: Optional filter by provider
        pathId      // ADDED: Optional filter by path
    } = req.query;

    if (!userId || typeof userId !== 'string') {
      return next(new AppError('Valid User ID parameter is required', 400, 'INVALID_USER_ID_PARAM'));
    }

    let query = db.collection('quizResults').where('userId', '==', userId);

    // Add module filter if provided
    if (moduleId && typeof moduleId === 'string') {
      console.log(`Filtering quiz history for user ${userId} by module ${moduleId}`);
      query = query.where('moduleId', '==', moduleId);
    }
    // ADDED: Add provider/path filters if provided
    if (providerId && typeof providerId === 'string') {
        console.log(`Filtering quiz history for user ${userId} by provider ${providerId}`);
        query = query.where('providerId', '==', providerId);
    }
    if (pathId && typeof pathId === 'string') {
        console.log(`Filtering quiz history for user ${userId} by path ${pathId}`);
        query = query.where('pathId', '==', pathId);
    }
    // --- End ADDED ---

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
        providerId: data.providerId, // ADDED
        pathId: data.pathId,         // ADDED
        score: data.score,
        totalQuestions: data.totalQuestions,
        percentage: data.percentage,
        passed: data.passed,
        timestamp: data.timestamp?.toDate()?.toISOString() || null, // Safely format timestamp
        // Optionally include answers: answers: data.answers
      };
    });

    res.json({
        status: 'success',
        data: { quizHistory }
    });
  } catch (error) {
    console.error(`Error fetching quiz history for user ${req.params.userId}:`, error);
    next(new AppError('Failed to retrieve quiz history.', 500, 'DB_FETCH_ERROR'));
  }
};

// --- Get Quiz by ID ---
// GET /:id (Changed route param name for consistency)
exports.getQuizById = async (req, res, next) => {
  try {
    const { id } = req.params; // Use 'id' from the route
    console.log(`Fetching quiz by ID: ${id}`);

    if (!id || typeof id !== 'string') {
        return next(new AppError('Valid Quiz ID parameter is required', 400, 'INVALID_QUIZ_ID_PARAM'));
    }

    const quizDoc = await db.collection('quizzes').doc(id).get();

    if (!quizDoc.exists) {
      return next(new AppError(`Quiz with ID ${id} not found`, 404, 'QUIZ_NOT_FOUND'));
    }

    const quizData = quizDoc.data();
    // Ensure providerId and pathId are included in the response
    res.json({
      status: 'success',
      data: {
        quiz: {
            id: quizDoc.id,
            moduleId: quizData.moduleId,
            providerId: quizData.providerId, // Ensure this exists in your quiz docs
            pathId: quizData.pathId,         // Ensure this exists in your quiz docs
            title: quizData.title,
            description: quizData.description,
            questions: quizData.questions, // Assuming questions are stored directly
            passingScore: quizData.passingScore,
            createdAt: quizData.createdAt?.toDate()?.toISOString() || null,
            updatedAt: quizData.updatedAt?.toDate()?.toISOString() || null,
        }
      }
    });
  } catch (error) {
    console.error(`Error getting quiz by ID ${req.params.id}:`, error);
    next(error);
  }
};


// --- UPDATED: List Quizzes (replaces getAllQuizzes) ---
// GET /list (or just / if base route is /api/v1/quizzes)
// Requires providerId and pathId query parameters
exports.listQuizzes = async (req, res, next) => {
  console.log('[quizController.listQuizzes] Received req.query:', JSON.stringify(req.query));
  try {
    const {
        providerId, // REQUIRED filter
        pathId,     // REQUIRED filter
        moduleId,   // Optional filter
        limit = 20, // Default limit
        lastId      // For pagination
    } = req.query;

    // --- Validation ---
    if (!providerId || typeof providerId !== 'string') {
        return next(new AppError('Query parameter "providerId" is required.', 400, 'MISSING_PROVIDER_ID'));
    }
    if (!pathId || typeof pathId !== 'string') {
        return next(new AppError('Query parameter "pathId" is required.', 400, 'MISSING_PATH_ID'));
    }
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
        return next(new AppError('Invalid limit value (must be 1-50)', 400, 'INVALID_LIMIT'));
    }
    // --- End Validation ---

    console.log(`Listing quizzes for path: ${providerId}/${pathId}, module: ${moduleId || 'all'}`);

    let query = db.collection('quizzes')
                  .where('providerId', '==', providerId)
                  .where('pathId', '==', pathId);

    if (moduleId && typeof moduleId === 'string') {
        query = query.where('moduleId', '==', moduleId);
    }

    // Add sorting (e.g., by title or creation date if available)
    query = query.orderBy('title', 'asc').limit(parsedLimit); // Example sort

    if (lastId) {
        const lastDocSnapshot = await db.collection('quizzes').doc(lastId).get();
        if (lastDocSnapshot.exists) {
            query = query.startAfter(lastDocSnapshot);
        } else {
            console.warn(`Pagination lastId '${lastId}' not found for quizzes. Starting from beginning.`);
        }
    }

    const quizzesSnapshot = await query.get();

    const quizzes = quizzesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            moduleId: data.moduleId,
            providerId: data.providerId,
            pathId: data.pathId,
            title: data.title,
            description: data.description,
            passingScore: data.passingScore,
            createdAt: data.createdAt?.toDate()?.toISOString() || null,
            updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
        };
    });

    const newLastId = quizzes.length > 0 ? quizzes[quizzes.length - 1].id : null;
    const hasMore = quizzes.length === parsedLimit;

    res.json({
        status: 'success',
        data: {
            quizzes,
            hasMore,
            lastId: newLastId
        }
    });
  } catch (error) {
    console.error(`Error listing quizzes for path ${req.query.providerId}/${req.query.pathId}:`, error);
    next(error);
  }
};
