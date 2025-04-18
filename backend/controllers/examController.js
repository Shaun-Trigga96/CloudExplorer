const admin = require('firebase-admin');
const AppError = require('../utils/appError');
const { FieldValue } = require('firebase-admin/firestore'); // Import FieldValue
const { serverTimestamp } = require('../utils/firestoreHelpers'); // Import serverTimestamp

const db = admin.firestore();

// POST /save-result
// RESPONSIBILITY: Saves the details of a specific exam attempt to the 'examResults' collection.
// Does NOT update the user's overall learning path progress directly anymore.
exports.saveExamResult = async (req, res, next) => {
  console.log('saveExamResult: Received request body:', req.body);
  try {
    // Destructure providerId and pathId from the main body, not nested in result
    const {
        userId,
        examId,
        providerId, // ADDED
        pathId,     // ADDED
        result      // Keep result object for attempt details
    } = req.body;

    // --- Input Validation ---
    if (!userId || typeof userId !== 'string')
      return next(new AppError('Valid userId is required.', 400, 'INVALID_USER_ID'));
    if (!examId || typeof examId !== 'string')
      return next(new AppError('Valid examId is required.', 400, 'INVALID_EXAM_ID'));
    // ADDED Validation
    if (!providerId || typeof providerId !== 'string')
      return next(new AppError('Valid providerId is required.', 400, 'INVALID_PROVIDER_ID'));
    if (!pathId || typeof pathId !== 'string')
      return next(new AppError('Valid pathId is required.', 400, 'INVALID_PATH_ID'));
    // --- End ADDED Validation ---
    if (!result || typeof result !== 'object')
      return next(new AppError('Exam result object is required.', 400, 'MISSING_RESULT_OBJECT'));

    // Validate required fields within the result object
    const {
      totalQuestions,
      correctAnswers, // Use correctAnswers for raw score
      percentage,     // Expect percentage (0-100) from frontend or calculate
      passed,         // Expect boolean from frontend
      answers,        // Renamed from answeredQuestions for consistency
      startTime,      // Optional ISO string
      endTime,        // Optional ISO string
      timeSpent,      // Optional number in seconds
      timestamp,      // Optional completion timestamp ISO string
    } = result;

    if (totalQuestions === undefined || typeof totalQuestions !== 'number' || totalQuestions <= 0)
      return next(new AppError('Valid result.totalQuestions is required.', 400, 'INVALID_TOTAL_QUESTIONS'));
    if (correctAnswers === undefined || typeof correctAnswers !== 'number' || correctAnswers < 0)
      return next(new AppError('Valid result.correctAnswers is required.', 400, 'INVALID_CORRECT_ANSWERS'));
    if (percentage === undefined || typeof percentage !== 'number' || percentage < 0 || percentage > 100)
      return next(new AppError('Valid result.percentage (0-100) is required.', 400, 'INVALID_SCORE_PERCENTAGE'));
    if (passed === undefined || typeof passed !== 'boolean')
      return next(new AppError('Valid result.passed (boolean) is required.', 400, 'INVALID_IS_PASSED'));
    if (answers && typeof answers !== 'object')
      return next(new AppError('result.answers should be an object if provided.', 400, 'INVALID_ANSWERS'));
    if (timeSpent !== undefined && typeof timeSpent !== 'number')
        return next(new AppError('result.timeSpent should be a number (seconds) if provided.', 400, 'INVALID_TIME_SPENT'));

    // --- Prepare Exam Result Data ---
    const examResultRef = db.collection('examResults').doc(); // Auto-generate ID

    // Use client completion timestamp if provided, otherwise server time
    const resultTimestamp = timestamp
      ? admin.firestore.Timestamp.fromDate(new Date(timestamp))
      : serverTimestamp(); // Use serverTimestamp for the main record timestamp

    const examResultData = {
      userId,
      examId,
      providerId, // ADDED
      pathId,     // ADDED
      totalQuestions,
      score: correctAnswers, // Store raw number of correct answers as 'score'
      percentage, // Store calculated/provided percentage
      passed,     // Store boolean passed status
      answers: answers || {}, // Store answer details if available
      startTime: startTime ? admin.firestore.Timestamp.fromDate(new Date(startTime)) : null, // Store as Timestamp
      endTime: endTime ? admin.firestore.Timestamp.fromDate(new Date(endTime)) : null,       // Store as Timestamp
      timeSpent: timeSpent ?? null, // Store time spent in seconds
      timestamp: resultTimestamp, // Main completion timestamp
    };

    // --- Save ONLY the Exam Result ---
    // User progress update (adding to completedExams array within the specific learning path)
    // is now handled by the POST /api/v1/users/:userId/progress endpoint.
    await examResultRef.set(examResultData);

    console.log(
      `Exam result ${examResultRef.id} saved for user ${userId}, exam ${examId}, path ${providerId}/${pathId}. Passed: ${passed}`,
    );

    // --- Respond to Client ---
    res.status(201).json({
      status: 'success',
      message: 'Exam result saved successfully. Remember to call user progress endpoint.',
      resultId: examResultRef.id,
      passed: passed,
      // Return the timestamp used (might be slightly different if server generated)
      timestamp: examResultData.timestamp instanceof admin.firestore.Timestamp
                 ? examResultData.timestamp.toDate().toISOString()
                 : new Date().toISOString(), // Approximate if serverTimestamp was used
    });
  } catch (error) {
    console.error(`Error saving exam result for user ${req.body.userId}, exam ${req.body.examId}:`, error);
    // Keep existing detailed error handling
    if (error.code === 'NOT_FOUND' && error.message.includes('User')) {
      next(new AppError('User not found during transaction.', 404, 'USER_NOT_FOUND_TX'));
    } else if (error.message?.includes('firestore') || error.name?.includes('FirebaseError')) {
      next(new AppError(`Database error saving exam result: ${error.message}`, 500, 'DB_SAVE_ERROR'));
    } else {
      next(error);
    }
  }
};

// GET /progress/:userId
// Optionally filter by providerId and pathId
exports.getExamProgress = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const {
        examId,     // Optional: Filter by specific exam
        providerId, // ADDED: Optional filter by provider
        pathId      // ADDED: Optional filter by path
    } = req.query;

    if (!userId || typeof userId !== 'string') {
      return next(new AppError('Valid User ID parameter is required', 400, 'INVALID_USER_ID_PARAM'));
    }

    let query = db.collection('examResults').where('userId', '==', userId);

    if (examId && typeof examId === 'string') {
      console.log(`Filtering exam progress for user ${userId} by exam ${examId}`);
      query = query.where('examId', '==', examId);
    }
    // ADDED: Add provider/path filters if provided
    if (providerId && typeof providerId === 'string') {
        console.log(`Filtering exam progress for user ${userId} by provider ${providerId}`);
        query = query.where('providerId', '==', providerId);
    }
    if (pathId && typeof pathId === 'string') {
        console.log(`Filtering exam progress for user ${userId} by path ${pathId}`);
        query = query.where('pathId', '==', pathId);
    }
    // --- End ADDED ---

    query = query.orderBy('timestamp', 'desc'); // Latest first

    const examResultsSnapshot = await query.get();

    const examProgress = examResultsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        resultId: doc.id, // ID of the result document
        examId: data.examId,
        providerId: data.providerId, // ADDED
        pathId: data.pathId,         // ADDED
        score: data.score, // Number correct
        totalQuestions: data.totalQuestions,
        percentage: data.percentage,
        passed: data.passed,
        timestamp: data.timestamp?.toDate()?.toISOString() || null,
        timeSpent: data.timeSpent ?? null, // Include time spent if available
      };
    });

    res.json({
        status: 'success',
        data: { examProgress }
    }); // Return as object with key
  } catch (error) {
    console.error(`Error fetching exam progress for user ${req.params.userId}:`, error);
    next(new AppError('Failed to retrieve exam progress.', 500, 'DB_FETCH_ERROR'));
  }
};

// GET /list
// Requires providerId and pathId query parameters
exports.listExams = async (req, res, next) => {
  try {
    const {
      providerId, // REQUIRED filter
      pathId,     // REQUIRED filter
      limit = 10,
      lastId,
      orderBy = 'title', // Default sort by title
      orderDir = 'asc',
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
    const validOrderBy = ['title', 'createdAt', 'updatedAt', 'duration']; // Allowed sort fields
    const validOrderDir = ['asc', 'desc'];
    if (!validOrderBy.includes(orderBy) || !validOrderDir.includes(orderDir)) {
      return next(new AppError('Invalid orderBy or orderDir parameter', 400, 'INVALID_SORT'));
    }
    // --- End Validation ---

    console.log(`Listing exams for path: ${providerId}/${pathId}`);

    let query = db.collection('exams')
                  .where('providerId', '==', providerId)
                  .where('pathId', '==', pathId)
                  .orderBy(orderBy, orderDir)
                  .limit(parsedLimit);

    if (lastId) {
      const lastDocSnapshot = await db.collection('exams').doc(lastId).get();
      if (lastDocSnapshot.exists) {
        query = query.startAfter(lastDocSnapshot);
      } else {
        console.warn(`Pagination lastId '${lastId}' not found for exams. Starting from beginning.`);
      }
    }

    const examsSnapshot = await query.get();
    const exams = examsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        providerId: data.providerId, // Include in response
        pathId: data.pathId,         // Include in response
        title: data.title,
        description: data.description,
        duration: data.duration,
        prerequisites: data.prerequisites,
        associatedModules: data.associatedModules,
        passingRate: data.passingRate,
        // Avoid sending full questions in list view
        // questionCount: data.questions?.length || 0, // Example if questions stored directly
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
      };
    });

    const newLastId = exams.length > 0 ? exams[exams.length - 1].id : null;
    const hasMore = exams.length === parsedLimit;

    res.json({
      status: 'success',
      data: {
          exams,
          hasMore,
          lastId: newLastId
      }
    });
  } catch (error) {
    console.error(`Error listing exams for path ${req.query.providerId}/${req.query.pathId}:`, error);
    next(error);
  }
};

// GET /:id (Changed route param name for consistency)
exports.getExamById = async (req, res, next) => {
  try {
    const { id } = req.params; // Use 'id' from the route
    console.log(`Fetching exam by ID: ${id}`);

    if (!id || typeof id !== 'string') {
        return next(new AppError('Valid Exam ID parameter is required', 400, 'INVALID_EXAM_ID_PARAM'));
    }

    const examDoc = await db.collection('exams').doc(id).get();

    if (!examDoc.exists) {
      return next(new AppError(`Exam with ID ${id} not found`, 404, 'EXAM_NOT_FOUND'));
    }

    const examData = examDoc.data();
    // Ensure providerId and pathId are included
    res.json({
      status: 'success',
      data: {
        exam: {
            id: examDoc.id,
            providerId: examData.providerId, // Ensure this exists in your exam docs
            pathId: examData.pathId,         // Ensure this exists in your exam docs
            title: examData.title,
            description: examData.description,
            duration: examData.duration,
            prerequisites: examData.prerequisites,
            associatedModules: examData.associatedModules,
            passingRate: examData.passingRate,
            questions: examData.questions, // Assuming questions are stored directly
            createdAt: examData.createdAt?.toDate()?.toISOString() || null,
            updatedAt: examData.updatedAt?.toDate()?.toISOString() || null,
        }
      }
    });
  } catch (error) {
    console.error(`Error getting exam by ID ${req.params.id}:`, error);
    next(error);
  }
};
