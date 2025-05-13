/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
/**
 * @file learningPaths.js
 * @description This file contains Firebase Cloud Functions for managing user learning paths.
 *              It includes callable functions for starting new paths, setting active paths,
 *              updating progress, and an HTTP function to retrieve a user's overall progress.
 */

// --- Imports ---
const functions = require("firebase-functions");
/**
 * @name db, logger (from ../config/config)
 * @description Shared application configurations:
 * - `db`: Firestore database instance.
 * - `logger`: Firebase Functions logger instance.
 */
const {db, logger} = require("../config/config");
const admin = require("firebase-admin"); // Firebase Admin SDK for server-side operations like FieldValue.

/**
 * @name startLearningPath
 * @description Firebase Callable Function to allow an authenticated user to start a new learning path.
 *              It checks if the path already exists for the user; if so, it marks it as active.
 *              Otherwise, it creates a new learning path document in the user's subcollection
 *              and updates the user's main document.
 * @param {object} data - The data passed to the function.
 * @param {string} data.providerId - The ID of the cloud provider for the path.
 * @param {string} data.pathId - The ID of the learning path to start.
 * @param {functions.https.CallableContext} context - The context of the function call, containing auth information.
 * @returns {Promise<object>} A promise that resolves with the status, message, and learningPathId.
 * @throws {functions.https.HttpsError} Throws HttpsError for unauthenticated users, invalid arguments,
 *                                      or internal server errors.
 */
exports.startLearningPath = functions.https.onCall(async (data, context) => {
  // --- Authentication Check ---
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const userId = context.auth.uid;
  const {providerId, pathId} = data;

  // --- Input Validation ---
  if (!providerId || !pathId) {
    logger.warn(`[learningPaths.startLearningPath] Invalid arguments for user ${userId}:`, data);
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Must provide both providerId and pathId.",
    );
  }

  try {
    // --- Fetch Path Details ---
    // Get details of the learning path from the global 'paths' collection.
    const pathDoc = await db.collection("paths").doc(pathId).get();

    if (!pathDoc.exists) {
      logger.error(`[learningPaths.startLearningPath] Path ${pathId} not found for user ${userId}.`);
      throw new functions.https.HttpsError(
          "not-found",
          `Path with ID ${pathId} not found.`,
      );
    }

    const pathData = pathDoc.data();

    // --- Check for Existing Path ---
    // See if the user already has this specific learning path in their 'learningPaths' subcollection.
    const existingPathQuery = await db.collection("users")
        .doc(userId)
        .collection("learningPaths")
        .where("pathId", "==", pathId)
        .limit(1)
        .get();

    if (!existingPathQuery.empty) {
      // Path already exists for the user.
      const existingPathId = existingPathQuery.docs[0].id;

      // Update the user's main document to mark this existing path as the active one.
      const userRef = db.collection("users").doc(userId);
      await userRef.update({
        hasActivePath: true,
        activePath: {
          id: existingPathId,
          providerId: providerId,
          pathId: pathId,
        },
      });

      logger.info(`[learningPaths.startLearningPath] User ${userId} already has path ${pathId}. Updated as active: ${existingPathId}`);

      return {
        status: "success",
        message: "Learning path already exists and is now active",
        data: {
          learningPathId: existingPathId,
        },
      };
    }

    // --- Create New Learning Path ---
    // If the path doesn't exist for the user, create a new document in their 'learningPaths' subcollection.
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

    // Set the data for the new learning path document.
    await newLearningPathRef.set(newLearningPath);

    // Update the user's main document: mark this new path as active and increment their learningPathsCount.
    await db.collection("users").doc(userId).update({
      hasActivePath: true,
      learningPathsCount: admin.firestore.FieldValue.increment(1),
      activePath: {
        id: newLearningPathRef.id,
        providerId: providerId,
        pathId: pathId,
      },
    });

    logger.info(`[learningPaths.startLearningPath] Created new learning path ${newLearningPathRef.id} for user ${userId}`);

    return {
      status: "success",
      message: "Learning path created successfully",
      data: {
        learningPathId: newLearningPathRef.id,
      },
    };
  } catch (error) {
    logger.error(`[learningPaths.startLearningPath] Error for user ${userId}:`, error);
    throw new functions.https.HttpsError(
        "internal",
        `Error creating learning path: ${error.message}`,
    );
  }
});

/**
 * @name setActiveLearningPath
 * @description Firebase Callable Function to set a specified learning path as active for an authenticated user.
 *              It updates the user's main document with the active path details and updates the
 *              `lastAccessedAt` timestamp on the learning path itself.
 * @param {object} data - The data passed to the function.
 * @param {string} data.learningPathId - The ID of the learning path (document ID from the user's subcollection) to set as active.
 * @param {functions.https.CallableContext} context - The context of the function call, containing auth information.
 * @returns {Promise<object>} A promise that resolves with the status, message, and active path details.
 * @throws {functions.https.HttpsError} Throws HttpsError for unauthenticated users, invalid arguments,
 *                                      or internal server errors.
 */
exports.setActiveLearningPath = functions.https.onCall(async (data, context) => {
  // --- Authentication Check ---
  if (!context.auth) {
    throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated.",
    );
  }

  const userId = context.auth.uid;
  const {learningPathId} = data;

  // --- Input Validation ---
  if (!learningPathId) {
    logger.warn(`[learningPaths.setActiveLearningPath] Invalid arguments for user ${userId}:`, data);
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Must provide a learningPathId.",
    );
  }

  try {
    // --- Fetch Learning Path ---
    // Get the specific learning path document from the user's subcollection.
    const pathDoc = await db.collection("users")
        .doc(userId)
        .collection("learningPaths")
        .doc(learningPathId)
        .get();

    if (!pathDoc.exists) {
      logger.error(`[learningPaths.setActiveLearningPath] Learning path ${learningPathId} not found for user ${userId}.`);
      throw new functions.https.HttpsError(
          "not-found",
          `Learning path with ID ${learningPathId} not found for this user.`,
      );
    }

    const pathData = pathDoc.data();

    // --- Update User and Path Documents ---
    // Update the user's main document to reflect the newly active path.
    await db.collection("users").doc(userId).update({
      "hasActivePath": true,
      "activePath": {
        id: learningPathId,
        providerId: pathData.providerId,
        pathId: pathData.pathId,
      },
      "lastUpdate": admin.firestore.FieldValue.serverTimestamp(),
    });
    // Update the `lastAccessedAt` timestamp on the learning path itself.
    await pathDoc.ref.update({
      lastAccessedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`[learningPaths.setActiveLearningPath] Set learning path ${learningPathId} as active for user ${userId}`);

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
    logger.error(`[learningPaths.setActiveLearningPath] Error for user ${userId}:`, error);
    throw new functions.https.HttpsError(
        "internal",
        `Error setting active learning path: ${error.message}`,
    );
  }
});

/**
 * @name updateLearningProgress
 * @description Firebase Callable Function to update the learning progress for a specific path of an authenticated user.
 *              It can update completed modules, quizzes, exams, score, and mark the path as completed.
 *              It also recalculates and stores the completion percentage.
 * @param {object} data - The data passed to the function.
 * @param {string} data.learningPathId - The ID of the learning path to update.
 * @param {string} [data.moduleId] - The ID of a module completed.
 * @param {string} [data.quizId] - The ID of a quiz completed.
 * @param {string} [data.examId] - The ID of an exam completed.
 * @param {number} [data.score] - The new score for the path.
 * @param {boolean} [data.completed] - Whether the path is now fully completed.
 * @param {functions.https.CallableContext} context - The context of the function call, containing auth information.
 * @returns {Promise<object>} A promise that resolves with the status, message, and new completion percentage.
 * @throws {functions.https.HttpsError} Throws HttpsError for unauthenticated users, invalid arguments, or internal errors.
 */
exports.updateLearningProgress = functions.https.onCall(async (data, context) => {
  // --- Authentication Check ---
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

  // --- Input Validation ---
  if (!learningPathId) {
    logger.warn(`[learningPaths.updateLearningProgress] Invalid arguments for user ${userId}:`, data);
    throw new functions.https.HttpsError(
        "invalid-argument",
        "Must provide a learningPathId.",
    );
  }

  try {
    // --- Fetch Learning Path ---
    // Get a reference to the specific learning path document.
    const pathRef = db.collection("users")
        .doc(userId)
        .collection("learningPaths")
        .doc(learningPathId);

    const pathDoc = await pathRef.get();

    if (!pathDoc.exists) {
      logger.error(`[learningPaths.updateLearningProgress] Learning path ${learningPathId} not found for user ${userId}.`);
      throw new functions.https.HttpsError(
          "not-found",
          `Learning path with ID ${learningPathId} not found for this user.`,
      );
    }

    const updates = {
      // Always update the last accessed timestamp.
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

    // Apply all accumulated updates to the learning path document.
    await pathRef.update(updates);

    // --- Calculate and Update Completion Percentage ---
    // Fetch the just-updated path data to ensure calculations are based on the latest state.
    const updatedPathDoc = await pathRef.get();
    const updatedPathData = updatedPathDoc.data();

    // Calculate the overall completion percentage based on modules, quizzes, and exams.
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

    // Store the calculated completion percentage back into the learning path document.
    await pathRef.update({
      "progress": {
        completionPercentage: completionPercentage,
      },
    });

    logger.info(`[learningPaths.updateLearningProgress] Updated progress for path ${learningPathId}, user ${userId}. New percentage: ${completionPercentage}%`);

    return {
      status: "success",
      message: "Learning progress updated",
      data: {
        completionPercentage: completionPercentage,
      },
    };
  } catch (error) {
    logger.error(`[learningPaths.updateLearningProgress] Error for user ${userId}:`, error);
    throw new functions.https.HttpsError(
        "internal",
        `Error updating learning progress: ${error.message}`,
    );
  }
});

/**
 * @name getUserProgress
 * @description Firebase HTTP onRequest Function to retrieve all learning paths and overall progress
 *              for an authenticated user. Authentication is verified via a Bearer token in the Authorization header.
 * @param {functions.https.Request} req - The HTTP request object.
 * @param {functions.Response} res - The HTTP response object.
 * @returns {Promise<void>} Sends a JSON response with the user's progress data or an error.
 */
exports.getUserProgress = functions.https.onRequest(async (req, res) => {
  // --- Authentication via Bearer Token ---
  try {
    // Extract and verify the Firebase ID token from the Authorization header.
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

    // --- Fetch User's Learning Paths ---
    // Retrieve all documents from the user's 'learningPaths' subcollection.
    const pathsSnapshot = await db.collection("users")
        .doc(userId)
        .collection("learningPaths")
        .get();

    const learningPaths = [];
    let totalModulesCompleted = 0;
    let totalQuizzesCompleted = 0;
    let totalScore = 0;

    // Iterate through each learning path document to aggregate data.
    for (const doc of pathsSnapshot.docs) {
      const pathData = doc.data();

      // Extract completed items.
      const completedModules = pathData.learningProgress && pathData.learningProgress.completedModules ? pathData.learningProgress.completedModules : [];
      const completedQuizzes = pathData.learningProgress && pathData.learningProgress.completedQuizzes ? pathData.learningProgress.completedQuizzes : [];
      const completedExams = pathData.learningProgress && pathData.learningProgress.completedExams ? pathData.learningProgress.completedExams : [];


      // Use the stored completion percentage or recalculate
      const completionPercentage =
          pathData.learningProgress.completionPercentage ||
          (pathData.totalModules + pathData.totalQuizzes + pathData.totalExams > 0 ?
              Math.round(((completedModules.length + completedQuizzes.length + completedExams.length) /
                  (pathData.totalModules + pathData.totalQuizzes + pathData.totalExams)) * 100) : 0);

      // Aggregate overall progress metrics.
      totalModulesCompleted += completedModules.length;
      totalQuizzesCompleted += completedQuizzes.length;
      totalScore += pathData.learningProgress && pathData.learningProgress.score ? pathData.learningProgress.score : 0;

      // Construct the learning path object for the response.
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

    // --- Check if User Document Exists ---
    // Optionally, check if the main user document exists (though this function primarily focuses on learning paths).
    const userDoc = await db.collection("users").doc(userId).get();

    // --- Send Successful Response ---
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
    // --- Error Handling ---
    logger.error(`[learningPaths.getUserProgress] Error:`, error);
    res.status(500).json({
      status: "error",
      message: `Error fetching user progress: ${error.message}`,
    });
  }
});
