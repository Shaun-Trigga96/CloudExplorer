// backend/controllers/providerPathController.js
const admin = require('firebase-admin');
const AppError = require('../utils/appError');
const { serverTimestamp } = require('../utils/firestoreHelpers'); // Import serverTimestamp and FieldValue
const { FieldValue } = require('firebase-admin/firestore');

const db = admin.firestore();

/**
 * @desc    Get all available cloud providers
 * @route   GET /api/v1/providers
 * @access  Public
 */
exports.getProviders = async (req, res, next) => {
  try {
    const providersSnapshot = await db.collection('providers').get();

    if (providersSnapshot.empty) {
      console.log('No providers found in the database.');
      // Return empty array with success status
      return res.status(200).json({
        status: 'success',
        data: { providers: [] }
      });
    }

    const providers = providersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id, // Use the document ID as the provider ID
        name: data.name || 'Unnamed Provider',
        logoUrl: data.logoUrl || '',
      };
    });

    res.status(200).json({
      status: 'success',
      data: { providers }
    });

  } catch (error) {
    console.error('Error fetching providers:', error);
    next(new AppError('Failed to retrieve providers.', 500, 'PROVIDER_FETCH_ERROR'));
  }
};

/**
 * @desc    Get all available learning paths grouped by provider
 * @route   GET /api/v1/paths/all
 * @access  Public
 */
exports.getAllPaths = async (req, res, next) => {
  try {
    const pathsSnapshot = await db.collection('paths').get();

    if (pathsSnapshot.empty) {
      console.log('No learning paths found in the database.');
      return res.status(200).json({
        status: 'success',
        data: { paths: {} }
      });
    }

    const pathsByProvider = {};

    pathsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const providerId = data.providerId;

      if (!providerId) {
        console.warn(`Path document ${doc.id} is missing providerId. Skipping.`);
        return; // Skip paths without a providerId
      }

      // Initialize array for the provider if it doesn't exist
      if (!pathsByProvider[providerId]) {
        pathsByProvider[providerId] = [];
      }

      // Add the path details to the provider's array
      pathsByProvider[providerId].push({
        id: doc.id,
        name: data.name || 'Unnamed Path',
        logoUrl: data.logoUrl || '',
        providerId: providerId, // Explicitly include providerId
        description: data.description || '', // Include description if available
        // Include totals if available, useful for frontend display
        totalModules: data.totalModules || 0,
        totalQuizzes: data.totalQuizzes || 0,
        totalExams: data.totalExams || 0,
      });
    });

    res.status(200).json({
      status: 'success',
      data: { paths: pathsByProvider }
    });

  } catch (error) {
    console.error('Error fetching learning paths:', error);
    next(new AppError('Failed to retrieve learning paths.', 500, 'PATH_FETCH_ERROR'));
  }
};
/**
 * @desc    Start a new learning path for a user or set existing as active
 * @route   POST /api/v1/user/:userId/paths
 * @access  Public (Relies on userId from URL parameter)
 */
exports.startLearningPath = async (req, res, next) => {
  let userIdFromParams; // Define outside try block for logging in catch
  try {
    // --- Get userId from URL PARAMETER ---
    userIdFromParams = req.params.userId; // Extract the userId string
    console.log('[providerPathCtrl] Raw userId from URL params:', req.params.userId); // Log raw value

    // --- Explicit Check for userId from URL ---
    if (!userIdFromParams || typeof userIdFromParams !== 'string' || userIdFromParams.trim() === '') {
      console.error('[providerPathCtrl] Invalid or missing userId in URL path:', userIdFromParams);
      // Send 400 Bad Request as the URL itself is malformed or missing the ID
      return next(new AppError('Valid User ID must be provided in the URL path.', 400, 'INVALID_USER_ID_PARAM'));
    }
    // Use the validated & trimmed ID going forward
    const userId = userIdFromParams.trim();
    console.log('[providerPathCtrl] Validated userId:', userId);
    // --- End Basic Check ---

    const { providerId, pathId } = req.body;

    // --- Input Validation for Body ---
    if (!providerId || typeof providerId !== 'string') {
      return next(new AppError('Must provide a valid providerId in the request body.', 400, 'INVALID_PROVIDER_ID'));
    }
    if (!pathId || typeof pathId !== 'string') {
      return next(new AppError('Must provide a valid pathId in the request body.', 400, 'INVALID_PATH_ID'));
    }
    // --- End Input Validation ---

    console.log(`[providerPathCtrl] Processing startLearningPath for userId: ${userId}, providerId: ${providerId}, pathId: ${pathId}`);

    // --- Use the userId from the URL for all Firestore operations ---
    const pathDocRef = db.collection("paths").doc(pathId);
    const pathDoc = await pathDocRef.get();

    if (!pathDoc.exists) {
      return next(new AppError(`Path definition with ID ${pathId} not found.`, 404, 'PATH_DEF_NOT_FOUND'));
    }
    const pathData = pathDoc.data();

    // --- Define references using the validated userId ---
    console.log(`[providerPathCtrl] Creating userRef for userId: "${userId}" (Type: ${typeof userId})`);
    const userRef = db.collection("users").doc(userId); // Use validated userId from URL

    console.log(`[providerPathCtrl] Creating userPathsCollection for userId: "${userId}"`);
    const userPathsCollection = userRef.collection("learningPaths"); // Use validated userId from URL

    // Check if user already has this path
    console.log(`[providerPathCtrl] Querying existing path for pathId: "${pathId}"`);
    const existingPathQuery = await userPathsCollection
      .where("pathId", "==", pathId)
      .limit(1)
      .get();
    console.log(`[providerPathCtrl] Existing path query completed. Empty: ${existingPathQuery.empty}`);


    if (!existingPathQuery.empty) {
      // Path already exists for user
      const existingPathId = existingPathQuery.docs[0].id;
      const existingPathData = existingPathQuery.docs[0].data();

      // Update the existing path as active and update last accessed time
      const batch = db.batch();
      batch.update(userRef, { // Use userRef based on URL userId
        hasActivePath: true,
        activePath: {
          id: existingPathId,
          providerId: existingPathData.providerId,
          pathId: existingPathData.pathId,
        },
        lastActivity: serverTimestamp(),
      });
      batch.update(userPathsCollection.doc(existingPathId), { // Use collection based on URL userId
        lastAccessedAt: serverTimestamp(),
      });
      await batch.commit();

      console.log(`[providerPathCtrl] User ${userId} already has path ${pathId}. Updated as active.`);

      return res.status(200).json({
        status: "success",
        message: "Learning path already exists and is now active",
        data: {
          learningPathId: existingPathId,
          activePath: {
            id: existingPathId,
            providerId: existingPathData.providerId,
            pathId: existingPathData.pathId,
          }
        },
      });
    }

    // --- Create new learning path document ---
    console.log(`[providerPathCtrl] Creating new learning path document for user ${userId}`);
    const newLearningPathRef = userPathsCollection.doc(); // Auto-generate ID under the correct user

    const newLearningPath = {
      id: newLearningPathRef.id,
      providerId: providerId,
      pathId: pathId,
      name: pathData.name || "Unknown Path",
      logoUrl: pathData.logoUrl || null,
      startedAt: serverTimestamp(),
      lastAccessedAt: serverTimestamp(),
      completed: false,
      completedAt: null,
      learningProgress: {
        completedModules: [],
        completedQuizzes: [],
        completedExams: [],
        score: 0,
        completionPercentage: 0,
      },
      totalModules: pathData.totalModules || 0,
      totalQuizzes: pathData.totalQuizzes || 0,
      totalExams: pathData.totalExams || 0,
    };

    // Use a batch to ensure atomicity
    const batch = db.batch();

    // 1. Create the learning path document
    console.log(`[providerPathCtrl] Setting new path data for ref: ${newLearningPathRef.path}`);
    batch.set(newLearningPathRef, newLearningPath);

    // 2. Update user document (using userRef based on URL userId)
    console.log(`[providerPathCtrl] Updating user document: ${userRef.path}`);
    batch.update(userRef, {
      hasActivePath: true,
      learningPathsCount: FieldValue.increment(1),
      activePath: {
        id: newLearningPathRef.id,
        providerId: providerId,
        pathId: pathId,
      },
      lastActivity: serverTimestamp(),
    });

    await batch.commit();

    console.log(`[providerPathCtrl] Created new learning path ${newLearningPathRef.id} for user ${userId}`);

    res.status(201).json({
      status: "success",
      message: "Learning path started successfully",
      data: {
        learningPathId: newLearningPathRef.id,
        activePath: {
          id: newLearningPathRef.id,
          providerId: providerId,
          pathId: pathId,
        }
      },
    });

  } catch (error) {
    // Log the specific userId from params that caused the error
    console.error(`[providerPathCtrl] Error during startLearningPath for user (from URL param): "${userIdFromParams}":`, error); // Log the raw param

    // Check if it's the specific Firestore error
    if (error.message?.includes('Path must be a non-empty string')) {
      // This indicates the userId passed to .doc() was invalid
      next(new AppError(`Internal Server Error: Invalid User ID used for database path. User ID: "${userIdFromParams}". Error: ${error.message}`, 500, 'FIRESTORE_INVALID_PATH_ID'));
    } else if (error instanceof AppError) {
      // Re-throw AppErrors (like validation errors)
      next(error);
    }
    else {
      // General error
      next(new AppError(`Error starting learning path: ${error.message}`, 500, 'PATH_START_ERROR'));
    }
  }
};


/**
 * @desc    Set a specific learning path as active for a user
 * @route   POST /api/v1/user/:userId/paths/:learningPathId/activate
 * @access  Private (Requires Authentication Middleware setting req.user)
 */
exports.setActiveLearningPath = async (req, res, next) => {
  try {
    const userId = req.params;
    const { learningPathId } = req.params;

    if (!learningPathId || typeof learningPathId !== 'string') {
      return next(new AppError('Must provide a valid learningPathId in the URL path.', 400, 'INVALID_LEARNING_PATH_ID_PARAM'));
    }

    // Get the learning path to ensure it exists and get its data
    const pathRef = db.collection("users").doc(userId).collection("learningPaths").doc(learningPathId);
    const pathDoc = await pathRef.get();

    if (!pathDoc.exists) {
      return next(new AppError(`Learning path with ID ${learningPathId} not found for this user.`, 404, 'LEARNING_PATH_NOT_FOUND'));
    }
    const pathData = pathDoc.data();

    // Use a batch for atomic updates
    const batch = db.batch();
    const userRef = db.collection("users").doc(userId);

    // 1. Update user document to mark this path as active
    batch.update(userRef, {
      hasActivePath: true,
      activePath: {
        id: learningPathId,
        providerId: pathData.providerId, // Get from path data
        pathId: pathData.pathId,       // Get from path data
      },
      lastActivity: serverTimestamp(), // Update user's general last activity
    });

    // 2. Update the path's lastAccessedAt timestamp
    batch.update(pathRef, {
      lastAccessedAt: serverTimestamp(),
    });

    await batch.commit();

    console.log(`[providerPathCtrl] Set learning path ${learningPathId} as active for user ${userId}`);

    res.status(200).json({
      status: "success",
      message: "Learning path set as active",
      data: {
        activePath: { // Return the now active path info
          id: learningPathId,
          providerId: pathData.providerId,
          pathId: pathData.pathId,
        },
      },
    });

  } catch (error) {
    console.error(`[providerPathCtrl] Error setting active learning path for user ${req.user?.uid}:`, error);
    next(new AppError(`Error setting active learning path: ${error.message}`, 500, 'PATH_ACTIVATE_ERROR'));
  }
};

/**
 * @desc    Update learning progress for a specific path (module, quiz, exam completion, score)
 * @route   POST /api/v1/user/:userId/paths/:learningPathId/progress
 * @access  Private (Requires Authentication Middleware setting req.user)
 */
exports.updateLearningProgress = async (req, res, next) => {
  try {
    const userId = req.user?.uid;

    const { learningPathId } = req.params;
    const {
      moduleId, // ID of the completed module
      quizId,   // ID of the completed quiz
      examId,   // ID of the completed exam
      score,    // Optional: New total score for the path (or score increment?) - Clarify logic
      completed, // Optional: Boolean flag to mark the entire path as completed
    } = req.body;

    if (!learningPathId || typeof learningPathId !== 'string') {
      return next(new AppError('Must provide a valid learningPathId in the URL path.', 400, 'INVALID_LEARNING_PATH_ID_PARAM'));
    }

    // At least one progress item must be provided
    if (!moduleId && !quizId && !examId && score === undefined && completed === undefined) {
      return next(new AppError('No progress update data provided (moduleId, quizId, examId, score, or completed flag required).', 400, 'MISSING_PROGRESS_DATA'));
    }

    // Get the learning path
    const pathRef = db.collection("users").doc(userId).collection("learningPaths").doc(learningPathId);

    // Use a transaction to read and write atomically, especially for percentage calculation
    let finalCompletionPercentage = 0;

    await db.runTransaction(async (transaction) => {
      const pathDoc = await transaction.get(pathRef);

      if (!pathDoc.exists) {
        throw new AppError(`Learning path with ID ${learningPathId} not found for this user.`, 404, 'LEARNING_PATH_NOT_FOUND');
      }
      const pathData = pathDoc.data();

      const updates = {
        lastAccessedAt: serverTimestamp(),
      };
      let needsPercentageRecalc = false;

      // Update completed modules if provided and not already present
      if (moduleId && !pathData.learningProgress?.completedModules?.includes(moduleId)) {
        updates["learningProgress.completedModules"] = FieldValue.arrayUnion(moduleId);
        needsPercentageRecalc = true;
      }

      // Update completed quizzes if provided and not already present
      if (quizId && !pathData.learningProgress?.completedQuizzes?.includes(quizId)) {
        updates["learningProgress.completedQuizzes"] = FieldValue.arrayUnion(quizId);
        needsPercentageRecalc = true;
      }

      // Update completed exams if provided and not already present
      if (examId && !pathData.learningProgress?.completedExams?.includes(examId)) {
        updates["learningProgress.completedExams"] = FieldValue.arrayUnion(examId);
        needsPercentageRecalc = true;
      }

      // Update score if provided (Assuming 'score' replaces the current score)
      // If it's meant to be incremental, use FieldValue.increment(score)
      if (score !== undefined && typeof score === 'number') {
        updates["learningProgress.score"] = score;
      }

      // Mark path as completed if specified and not already completed
      if (completed === true && !pathData.completed) {
        updates["completed"] = true;
        updates["completedAt"] = serverTimestamp();
        // Optionally force percentage to 100? Or let calculation handle it?
        // updates["learningProgress.completionPercentage"] = 100;
        needsPercentageRecalc = true; // Recalculate to be sure
      }

      // Apply initial updates within the transaction
      transaction.update(pathRef, updates);

      // --- Recalculate Completion Percentage ---
      // We need the potentially updated arrays, so simulate the update locally
      const currentModules = pathData.learningProgress?.completedModules || [];
      const currentQuizzes = pathData.learningProgress?.completedQuizzes || [];
      const currentExams = pathData.learningProgress?.completedExams || [];

      const newModulesCount = moduleId && !currentModules.includes(moduleId) ? currentModules.length + 1 : currentModules.length;
      const newQuizzesCount = quizId && !currentQuizzes.includes(quizId) ? currentQuizzes.length + 1 : currentQuizzes.length;
      const newExamsCount = examId && !currentExams.includes(examId) ? currentExams.length + 1 : currentExams.length;

      const totalItems = (pathData.totalModules || 0) + (pathData.totalQuizzes || 0) + (pathData.totalExams || 0);
      const completedItems = newModulesCount + newQuizzesCount + newExamsCount;

      let completionPercentage = pathData.learningProgress?.completionPercentage || 0; // Default to existing
      if (needsPercentageRecalc && totalItems > 0) {
        completionPercentage = Math.round((completedItems / totalItems) * 100);
      } else if (needsPercentageRecalc && totalItems === 0) {
        completionPercentage = 100; // If no items defined, mark as 100% complete? Or 0? Let's say 100 if completed flag is true.
        if (completed === true) completionPercentage = 100;
        else completionPercentage = 0;
      }

      // Ensure percentage doesn't exceed 100
      finalCompletionPercentage = Math.min(completionPercentage, 100);

      // Update the percentage within the same transaction
      transaction.update(pathRef, {
        "learningProgress.completionPercentage": finalCompletionPercentage,
      });

      // Update user's last activity
      const userRef = db.collection("users").doc(userId);
      transaction.update(userRef, {
        lastActivity: serverTimestamp(),
      });

    }); // End Transaction

    console.log(`[providerPathCtrl] Updated learning progress for path ${learningPathId}, user ${userId}. New Percentage: ${finalCompletionPercentage}%`);

    res.status(200).json({
      status: "success",
      message: "Learning progress updated successfully",
      data: {
        completionPercentage: finalCompletionPercentage, // Return the calculated percentage
      },
    });

  } catch (error) {
    console.error(`[providerPathCtrl] Error updating learning progress for user ${req.user?.uid}:`, error);
    if (error instanceof AppError) { // Re-throw AppErrors from transaction
      next(error);
    } else {
      next(new AppError(`Error updating learning progress: ${error.message}`, 500, 'PROGRESS_UPDATE_ERROR'));
    }
  }
};


/**
 * @desc    Get user's learning paths with progress details
 * @route   GET /api/v1/user/:userId/progress
 * @access  Private (Requires Authentication or uses userId from param)
 */
exports.getUserProgress = async (req, res, next) => {
  try {
    // Decide whether to use authenticated user or param. Using param for now as per original Express code.
    // Consider switching to req.user.uid for better security if route is protected.
    const userId = req.params.userId; // Correctly extract the userId string from req.params
    if (!userId || typeof userId !== 'string') {
      return next(new AppError('Valid User ID parameter is required', 400, 'INVALID_USER_ID_PARAM'));
    }

    // Check if user exists first
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // User not found, return specific structure indicating this
      console.log(`[providerPathCtrl] User ${userId} not found when fetching progress.`);
      return res.status(200).json({ // 200 OK, but indicate user doesn't exist
        status: 'success', // Or 'not_found'? 'success' is okay if data structure indicates status
        data: {
          userExists: false,
          learningPaths: [],
          overallProgress: { // Default empty progress
            totalModulesCompleted: 0,
            totalQuizzesCompleted: 0,
            totalExamsCompleted: 0, // Added exams
            totalScore: 0
          }
        }
      });
    }
    const userData = userDoc.data(); // Get user data for overall progress later if needed

    // Get user's learning paths subcollection
    // Only fetch the active learning path or the most recently accessed one if none is active
    const pathsSnapshot = await userRef.collection('learningPaths')
      .orderBy('lastAccessedAt', 'desc')
      .limit(3).get(); // Limit to 1 path

    const learningPaths = [];
    let overallModulesCompleted = 0;
    let overallQuizzesCompleted = 0;
    let overallExamsCompleted = 0; // Added
    let overallScore = 0;

    // Process each learning path document
    // Use Promise.all for potentially fetching path details concurrently if needed,
    // but sequential might be okay for moderate number of paths.
    for (const doc of pathsSnapshot.docs) {
      const pathData = doc.data();
      const pathId = pathData.pathId; // The ID of the path definition in 'paths' collection

      // --- Fetch Path Definition Details (Optional but good for name/logo/totals) ---
      let pathDetails = { name: 'Unknown Path', logoUrl: null, totalModules: 0, totalQuizzes: 0, totalExams: 0 };
      if (pathId) {
        const pathDefDoc = await db.collection('paths').doc(pathId).get();
        if (pathDefDoc.exists) {
          const defData = pathDefDoc.data();
          pathDetails.name = defData.name || pathDetails.name;
          pathDetails.logoUrl = defData.logoUrl || pathDetails.logoUrl;
          // Use totals from definition if not stored on user's path doc, or prefer definition's?
          pathDetails.totalModules = defData.totalModules || 0;
          pathDetails.totalQuizzes = defData.totalQuizzes || 0;
          pathDetails.totalExams = defData.totalExams || 0;
        } else {
          console.warn(`[providerPathCtrl] Path definition ${pathId} not found for user ${userId}'s path ${doc.id}`);
        }
      }
      // Use totals stored on the user's path document if available, otherwise fallback to definition
      const totalModules = pathData.totalModules ?? pathDetails.totalModules;
      const totalQuizzes = pathData.totalQuizzes ?? pathDetails.totalQuizzes;
      const totalExams = pathData.totalExams ?? pathDetails.totalExams;
      // --- End Fetch Path Definition ---


      const progress = pathData.learningProgress || {};
      const completedModules = progress.completedModules || [];
      const completedQuizzes = progress.completedQuizzes || [];
      const completedExams = progress.completedExams || [];
      const score = progress.score || 0;

      // Use the stored completion percentage if available, otherwise calculate
      let completionPercentage = progress.completionPercentage; // Prefer stored value

      if (completionPercentage === undefined || completionPercentage === null) {
        // Calculate if not stored
        const totalItems = totalModules + totalQuizzes + totalExams;
        const completedItems = completedModules.length + completedQuizzes.length + completedExams.length;
        completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : (pathData.completed ? 100 : 0);
        completionPercentage = Math.min(completionPercentage, 100); // Ensure max 100
      }


      // Aggregate overall progress
      overallModulesCompleted += completedModules.length;
      overallQuizzesCompleted += completedQuizzes.length;
      overallExamsCompleted += completedExams.length; // Added
      overallScore += score;

      learningPaths.push({
        id: doc.id, // ID of the user's specific learning path instance
        name: pathData.name || pathDetails.name, // Prefer name stored on user path, fallback to definition
        providerId: pathData.providerId,
        pathId: pathData.pathId, // ID of the path definition
        logoUrl: pathData.logoUrl || pathDetails.logoUrl, // Prefer logo stored on user path
        progress: {
          completionPercentage: completionPercentage,
          completedModules: completedModules,
          completedQuizzes: completedQuizzes,
          completedExams: completedExams,
          score: score,
        },
        // Include totals for context
        totalModules: totalModules,
        totalQuizzes: totalQuizzes,
        totalExams: totalExams,
        // Timestamps and completion status
        startedAt: pathData.startedAt?.toDate()?.toISOString() || null,
        lastAccessedAt: pathData.lastAccessedAt?.toDate()?.toISOString() || null,
        completed: pathData.completed || false,
        completedAt: pathData.completedAt?.toDate()?.toISOString() || null,
      });
    }

    // Construct final response
    res.status(200).json({
      status: 'success',
      data: {
        userExists: true, // We confirmed user exists at the start
        learningPaths,
        overallProgress: {
          // Use aggregated counts
          totalModulesCompleted: overallModulesCompleted,
          totalQuizzesCompleted: overallQuizzesCompleted,
          totalExamsCompleted: overallExamsCompleted, // Added
          totalScore: overallScore,
          // You might also get overall progress from the main user document if stored there
          ... (userData.overallProgress || {})
        }
      }
    });

  } catch (error) {
    console.error(`[providerPathCtrl] Error fetching user progress for ${req.params.userId}:`, error);
    next(new AppError('Failed to retrieve user progress', 500, 'PROGRESS_FETCH_ERROR'));
  }
};
