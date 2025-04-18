/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// functions/src/learningPaths.js
const functions = require("firebase-functions");
const {db, logger} = require("../config/config");
const admin = require("firebase-admin");

/**
 * Add a new learning path for a user
 * @route POST /api/v1/user/:userId/paths
 */
exports.startLearningPath = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const userId = context.auth.uid;
  const {providerId, pathId} = data;

  if (!providerId || !pathId) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Must provide both providerId and pathId.",
    );
  }

  try {
    // Get path details from the paths collection
    const pathDoc = await db.collection("paths").doc(pathId).get();

    if (!pathDoc.exists) {
      throw new functions.https.HttpsError(
          "not-found",
          `Path with ID ${pathId} not found.`,
      );
    }

    const pathData = pathDoc.data();

    // Check if user already has this path
    const existingPathQuery = await db.collection("users")
        .doc(userId)
        .collection("learningPaths")
        .where("pathId", "==", pathId)
        .limit(1)
        .get();

    if (!existingPathQuery.empty) {
      // Path already exists for user
      const existingPathId = existingPathQuery.docs[0].id;

      // Update the existing path as active
      const userRef = db.collection("users").doc(userId);
      await userRef.update({
        hasActivePath: true,
        activePath: {
          id: existingPathId,
          providerId: providerId,
          pathId: pathId,
        },
      });

      logger.info(`[learningPaths] User ${userId} already has path ${pathId}. Updated as active.`);

      return {
        status: "success",
        message: "Learning path already exists and is now active",
        data: {
          learningPathId: existingPathId,
        },
      };
    }

    // Create new learning path document
    const newLearningPathRef = db.collection("users")
        .doc(userId)
        .collection("learningPaths")
        .doc();

    const newLearningPath = {
      id: newLearningPathRef.id,
      providerId: providerId,
      pathId: pathId,
      name: pathData.name || "Unknown Path",
      logoUrl: pathData.logoUrl || null,
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastAccessedAt: admin.firestore.FieldValue.serverTimestamp(),
      completed: false,
      completedAt: null,
      learningProgress: {
        completedModules: [],
        completedQuizzes: [],
        completedExams: [],
        score: 0,
      },
      totalModules: pathData.totalModules || 0,
      totalQuizzes: pathData.totalQuizzes || 0,
      totalExams: pathData.totalExams || 0,
    };

    // Create the learning path
    await newLearningPathRef.set(newLearningPath);

    // Update user document to mark this path as active
    await db.collection("users").doc(userId).update({
      hasActivePath: true,
      learningPathsCount: admin.firestore.FieldValue.increment(1),
      activePath: {
        id: newLearningPathRef.id,
        providerId: providerId,
        pathId: pathId,
      },
    });

    logger.info(`[learningPaths] Created new learning path ${newLearningPathRef.id} for user ${userId}`);

    return {
      status: "success",
      message: "Learning path created successfully",
      data: {
        learningPathId: newLearningPathRef.id,
      },
    };
  } catch (error) {
    logger.error(`[learningPaths] Error creating learning path for user ${userId}:`, error);
    throw new functions.https.HttpsError(
        "internal",
        `Error creating learning path: ${error.message}`,
    );
  }
});

/**
 * Set a learning path as active
 * @route POST /api/v1/user/:userId/paths/:pathId/activate
 */
exports.setActiveLearningPath = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const userId = context.auth.uid;
  const {learningPathId} = data;

  if (!learningPathId) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Must provide a learningPathId.",
    );
  }

  try {
    // Get the learning path
    const pathDoc = await db.collection("users")
        .doc(userId)
        .collection("learningPaths")
        .doc(learningPathId)
        .get();

    if (!pathDoc.exists) {
      throw new functions.https.HttpsError(
          "not-found",
          `Learning path with ID ${learningPathId} not found for this user.`,
      );
    }

    const pathData = pathDoc.data();

    // Update user document to mark this path as active
    await db.collection("users").doc(userId).update({
      "hasActivePath": true,
      "activePath": {
        id: learningPathId,
        providerId: pathData.providerId,
        pathId: pathData.pathId,
      },
      "lastUpdate": admin.firestore.FieldValue.serverTimestamp(),
    });
    await pathDoc.ref.update({
      lastAccessedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`[learningPaths] Set learning path ${learningPathId} as active for user ${userId}`);

    return {
      status: "success",
      message: "Learning path set as active",
      data: {
        activePath: {
          id: learningPathId,
          providerId: pathData.providerId,
          pathId: pathData.pathId,
        },
      },
    };
  } catch (error) {
    logger.error(`[learningPaths] Error setting active learning path for user ${userId}:`, error);
    throw new functions.https.HttpsError(
        "internal",
        `Error setting active learning path: ${error.message}`,
    );
  }
});

/**
 * Update learning progress for a path
 * @route POST /api/v1/user/:userId/paths/:pathId/progress
 */
exports.updateLearningProgress = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const userId = context.auth.uid;
  const {
    learningPathId,
    moduleId,
    quizId,
    examId,
    score,
    completed,
  } = data;

  if (!learningPathId) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Must provide a learningPathId.",
    );
  }

  try {
    // Get the learning path
    const pathRef = db.collection("users")
        .doc(userId)
        .collection("learningPaths")
        .doc(learningPathId);

    const pathDoc = await pathRef.get();

    if (!pathDoc.exists) {
      throw new functions.https.HttpsError(
          "not-found",
          `Learning path with ID ${learningPathId} not found for this user.`,
      );
    }

    const updates = {
      lastAccessedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Update completed modules if provided
    if (moduleId) {
      updates["learningProgress.completedModules"] = admin.firestore.FieldValue.arrayUnion(moduleId);
    }

    // Update completed quizzes if provided
    if (quizId) {
      updates["learningProgress.completedQuizzes"] = admin.firestore.FieldValue.arrayUnion(quizId);
    }

    // Update completed exams if provided
    if (examId) {
      updates["learningProgress.completedExams"] = admin.firestore.FieldValue.arrayUnion(examId);
    }

    // Update score if provided
    if (score !== undefined) {
      updates["learningProgress.score"] = score;
    }

    // Mark path as completed if specified
    if (completed) {
      updates["completed"] = true;
      updates["completedAt"] = admin.firestore.FieldValue.serverTimestamp();
    }

    // Apply updates
    await pathRef.update(updates);

    // Get the updated path data to calculate completion percentage
    const updatedPathDoc = await pathRef.get();
    const updatedPathData = updatedPathDoc.data();

    // Calculate completion percentage
    const totalItems =
        (updatedPathData.totalModules || 0) +
        (updatedPathData.totalQuizzes || 0) +
        (updatedPathData.totalExams || 0);

    const completedItems =
        (updatedPathData.learningProgress.completedModules ? updatedPathData.learningProgress.completedModules.length : 0) +
        ((updatedPathData.learningProgress.completedQuizzes && updatedPathData.learningProgress.completedQuizzes.length) || 0) +
        ((updatedPathData.learningProgress.completedExams && updatedPathData.learningProgress.completedExams.length) || 0);

    const completionPercentage = totalItems > 0 ?
        Math.round((completedItems / totalItems) * 100) : 0;

    // Update completion percentage
    await pathRef.update({
      "progress": {
        completionPercentage: completionPercentage,
      },
    });

    logger.info(`[learningPaths] Updated learning progress for path ${learningPathId}, user ${userId}`);

    return {
      status: "success",
      message: "Learning progress updated",
      data: {
        completionPercentage: completionPercentage,
      },
    };
  } catch (error) {
    logger.error(`[learningPaths] Error updating learning progress for user ${userId}:`, error);
    throw new functions.https.HttpsError(
        "internal",
        `Error updating learning progress: ${error.message}`,
    );
  }
});

/**
 * Get user's learning paths with progress
 * @route GET /api/v1/user/:userId/progress
 */
exports.getUserProgress = functions.https.onRequest(async (req, res) => {
  // Check auth token from request
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized - Missing or invalid authentication token",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Get user's learning paths
    const pathsSnapshot = await db.collection("users")
        .doc(userId)
        .collection("learningPaths")
        .get();

    const learningPaths = [];
    let totalModulesCompleted = 0;
    let totalQuizzesCompleted = 0;
    let totalScore = 0;

    // Process each learning path
    for (const doc of pathsSnapshot.docs) {
      const pathData = doc.data();

      // Calculate progress metrics
      const completedModules = pathData.learningProgress && pathData.learningProgress.completedModules ? pathData.learningProgress.completedModules : [];
      const completedQuizzes = pathData.learningProgress && pathData.learningProgress.completedQuizzes ? pathData.learningProgress.completedQuizzes : [];
      const completedExams = pathData.learningProgress && pathData.learningProgress.completedExams ? pathData.learningProgress.completedExams : [];

      // Use the stored completion percentage or recalculate
      const completionPercentage =
          pathData.learningProgress.completionPercentage ||
          (pathData.totalModules + pathData.totalQuizzes + pathData.totalExams > 0 ?
              Math.round(((completedModules.length + completedQuizzes.length + completedExams.length) /
                  (pathData.totalModules + pathData.totalQuizzes + pathData.totalExams)) * 100) : 0);

      totalModulesCompleted += completedModules.length;
      totalQuizzesCompleted += completedQuizzes.length;
      totalScore += pathData.learningProgress && pathData.learningProgress.score ? pathData.learningProgress.score : 0;

      learningPaths.push({
        id: doc.id,
        name: pathData.name || "Unknown Path",
        providerId: pathData.providerId,
        pathId: pathData.pathId,
        logoUrl: pathData.logoUrl,
        progress: {
          completionPercentage: completionPercentage,
          completedModules: completedModules,
          completedQuizzes: completedQuizzes,
          completedExams: completedExams,
          score: pathData.learningProgress && pathData.learningProgress.score ? pathData.learningProgress.score : 0,
        },
        startedAt: pathData.startedAt,
        lastAccessedAt: pathData.lastAccessedAt,
        completed: pathData.completed || false,
        completedAt: pathData.completedAt,
      });
    }

    // Get user doc to check if user exists
    const userDoc = await db.collection("users").doc(userId).get();

    res.status(200).json({
      status: "success",
      data: {
        userExists: userDoc.exists,
        learningPaths: learningPaths,
        overallProgress: {
          totalModulesCompleted,
          totalQuizzesCompleted,
          totalScore,
        },
      },
    });
  } catch (error) {
    logger.error(`[learningPaths] Error fetching user progress:`, error);
    res.status(500).json({
      status: "error",
      message: `Error fetching user progress: ${error.message}`,
    });
  }
});
