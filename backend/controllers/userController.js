const admin = require('firebase-admin');
const axios = require('axios');
const AppError = require('../utils/appError');
const {
  isValidFirebaseStorageUrl,
} = require('../utils/firestoreHelpers');
const { FieldValue } = require('firebase-admin/firestore');
const {serverTimestamp,} = require('../utils/firestoreHelpers');
const db = admin.firestore();
const storage = admin.storage(); // Initialize storage
/**
 * @file userController.js
 * @description This file contains controller functions for managing user-specific data,
 * including settings, certifications, profile information, and learning progress.
 */

/**
 * @desc    Get user-specific settings.
 * @route   GET /api/v1/users/:userId/settings
 * @access  Private (requires valid userId)
 */
// GET /users/:userId/settings
exports.getUserSettings = async (req, res, next) => {
  try {
    const {userId} = req.params;
    if (!userId) {
      return next(
        new AppError(
          'User ID parameter is required',
          400,
          'MISSING_USER_ID_PARAM',
        ),
      );
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const userData = userDoc.data() || {};
    // Provide default structure if settings or individual fields are missing
    const settings = {
      notificationsEnabled: userData.settings?.notificationsEnabled ?? true, // Default to true if missing
      darkMode: userData.settings?.darkMode ?? false, // Default to false if missing
      emailUpdates: userData.settings?.emailUpdates ?? true,
      syncData: userData.settings?.syncData ?? true,
      soundEffects: userData.settings?.soundEffects ?? false,
      // Add any other settings with defaults
    };

    res.json({settings});
  } catch (error) {
    console.error(
      `Error getting settings for user ${req.params.userId}:`,
      error,
    );
    next(error);
  }
};

/**
 * @desc    Update user-specific settings.
 * @route   PUT /api/v1/users/:userId/settings
 * @access  Private (requires valid userId)
 */
// PUT /users/:userId/settings
exports.updateUserSettings = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const settingsUpdate = req.body.settings; // Expect settings object in body

    if (!userId) {
      return next(
        new AppError(
          'User ID parameter is required',
          400,
          'MISSING_USER_ID_PARAM',
        ),
      );
    }
    if (
      !settingsUpdate ||
      typeof settingsUpdate !== 'object' ||
      Array.isArray(settingsUpdate)
    ) {
      return next(
        new AppError(
          'Invalid settings data provided. Expected an object.',
          400,
          'INVALID_SETTINGS_DATA',
        ),
      );
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Validate incoming settings keys/values (optional but recommended)
    const allowedSettings = [
      'notificationsEnabled',
      'darkMode',
      'emailUpdates',
      'syncData',
      'soundEffects',
    ];
    const validatedUpdate = {};
    for (const key in settingsUpdate) {
      if (allowedSettings.includes(key)) {
        // Add type validation if necessary (e.g., ensure boolean)
        if (typeof settingsUpdate[key] === 'boolean') {
          // Example validation
          validatedUpdate[`settings.${key}`] = settingsUpdate[key]; // Use dot notation for specific field update
        } else {
          console.warn(
            `Invalid type for setting '${key}' for user ${userId}. Skipping.`,
          );
        }
      } else {
        console.warn(
          `Unknown setting key '${key}' provided for user ${userId}. Skipping.`,
        );
      }
    }

    if (Object.keys(validatedUpdate).length === 0) {
      return res
        .status(400)
        .json({message: 'No valid settings fields provided for update.'});
    }

    validatedUpdate['settings.lastUpdated'] = serverTimestamp(); // Track update time within settings

    await userRef.update(validatedUpdate); // Update only specified fields

    // Fetch the updated settings to return them
    const updatedUserDoc = await userRef.get();
    const updatedSettings = updatedUserDoc.data()?.settings || {};

    res.json({
      message: 'Settings updated successfully',
      settings: updatedSettings,
    });
  } catch (error) {
    console.error(
      `Error updating settings for user ${req.params.userId}:`,
      error,
    );
    next(error);
  }
};

/**
 * @desc    Get all certifications for a specific user.
 * @route   GET /api/v1/users/:userId/certifications
 * @access  Private (requires valid userId)
 */
// GET /user/:userId/certifications
exports.getUserCertifications = async (req, res, next) => {
  try {
    const {userId} = req.params;
    if (!userId) {
      return next(
        new AppError(
          'User ID parameter is required',
          400,
          'MISSING_USER_ID_PARAM',
        ),
      );
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const certificationsSnapshot = await userRef
      .collection('certifications')
      .orderBy('issuedDate', 'desc')
      .get();

    const certifications = certificationsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        issuedDate: data.issuedDate?.toDate(), // Convert timestamp
        expiryDate: data.expiryDate?.toDate() || null, // Optional expiry
        issuingOrganization: data.issuingOrganization,
        url: data.url, // Link to cert if available
        // ... any other fields
      };
    });

    res.json({certifications});
  } catch (error) {
    console.error(
      `Error getting certifications for user ${req.params.userId}:`,
      error,
    );
    next(error);
  }
};

/**
 * @desc    Get the profile image for a specific user.
 * @route   GET /api/v1/users/:userId/profile-image
 * @access  Public (redirects to default if not found or on error)
 * @note    Streams the image or redirects to a default image URL.
 */
// GET /users/:userId/profile-image
exports.getUserProfileImage = async (req, res, next) => {
  // Use environment variable for default or fallback
  const DEFAULT_PROFILE_IMAGE =
    process.env.DEFAULT_PROFILE_IMAGE_URL ||
    'https://storage.googleapis.com/your-default-bucket/default-avatar.png';

  try {
    const {userId} = req.params;
    if (!userId) {
      return next(
        new AppError(
          'User ID parameter is required',
          400,
          'MISSING_USER_ID_PARAM',
        ),
      );
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.warn(
        `User ${userId} not found when fetching profile image. Redirecting to default.`,
      );
      return res.redirect(DEFAULT_PROFILE_IMAGE);
    }

    const userData = userDoc.data();
    const photoURL = userData?.photoURL;

    if (!photoURL || !isValidFirebaseStorageUrl(photoURL)) {
      console.warn(
        `Invalid or missing photoURL for user ${userId}. Redirecting to default.`,
      );
      return res.redirect(DEFAULT_PROFILE_IMAGE);
    }

    try {
      // Extract bucket path correctly from a gs:// or https:// URL
      let filePath;
      if (photoURL.startsWith('gs://')) {
        filePath = photoURL.substring(5).split('/').slice(1).join('/'); // Remove gs://bucket-name/
      } else {
        const urlParts = photoURL.split('/o/');
        if (urlParts.length < 2)
          throw new Error('Invalid Firebase Storage HTTPS URL format');
        filePath = decodeURIComponent(urlParts[1].split('?')[0]); // Decode potential special chars like spaces (%20)
      }

      const bucketName = storage.bucket().name; // Get default bucket name configured in admin SDK
      const bucket = storage.bucket(bucketName);
      const file = bucket.file(filePath);

      const [exists] = await file.exists();
      if (!exists) {
        console.warn(
          `Photo file not found in Storage for user ${userId}: gs://${bucketName}/${filePath}`,
        );
        return res.redirect(DEFAULT_PROFILE_IMAGE);
      }

      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes validity
      });

      // Use axios to fetch the image and pipe it to the response
      const imageResponse = await axios({
        method: 'get',
        url: signedUrl,
        responseType: 'stream',
        timeout: 10000, // 10-second timeout for fetch
      });

      // Set appropriate content type from storage metadata or response header
      const [metadata] = await file.getMetadata();
      res.set(
        'Content-Type',
        metadata.contentType ||
          imageResponse.headers['content-type'] ||
          'image/jpeg',
      );
      res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      imageResponse.data.pipe(res);
    } catch (fetchError) {
      console.error(
        `Error fetching/streaming profile image for user ${userId} (gs://${
          storage.bucket().name
        }/${filePath ?? 'unknown'}):`,
        fetchError.message,
      );
      if (!res.headersSent) {
        res.redirect(DEFAULT_PROFILE_IMAGE);
      }
    }
  } catch (error) {
    console.error(
      `Error retrieving user data for profile image (User ID: ${req.params.userId}):`,
      error,
    );
    if (!res.headersSent) {
      res.redirect(DEFAULT_PROFILE_IMAGE); // Fallback on general errors
    }
    // Consider calling next(error) if it's a more critical error and redirection isn't appropriate
  }
};

/**
 * @desc    Update user profile information (displayName, bio, photoURL).
 * @route   PUT /api/v1/users/:userId/profile
 * @access  Private (requires valid userId)
 */
// PUT /users/:userId/profile
exports.updateUserProfile = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const {displayName, bio, photoURL} = req.body; // Expect these fields

    if (!userId) {
      return next(
        new AppError(
          'User ID parameter is required',
          400,
          'MISSING_USER_ID_PARAM',
        ),
      );
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const updateData = {};

    // Validate and add fields if they are present in the request body
    if (displayName !== undefined) {
      if (typeof displayName === 'string') {
        updateData.displayName = displayName.trim(); // Trim whitespace
      } else {
        return next(
          new AppError(
            'Display name must be a string.',
            400,
            'INVALID_PROFILE_DATA',
          ),
        );
      }
    }

    if (bio !== undefined) {
      if (typeof bio === 'string') {
        updateData.bio = bio; // Allow longer text, maybe trim if needed?
      } else {
        return next(
          new AppError('Bio must be a string.', 400, 'INVALID_PROFILE_DATA'),
        );
      }
    }

    if (photoURL !== undefined) {
      // Allow null or empty string to remove photo, otherwise validate URL
      if (
        photoURL === null ||
        photoURL === '' ||
        isValidFirebaseStorageUrl(photoURL) || // Check for Firebase Storage URL
        (typeof photoURL === 'string' && photoURL.startsWith('https://')) // Also allow any generic HTTPS URL
      ) {
        updateData.photoURL = photoURL;
      } else {
        return next(
          new AppError(
            'Invalid photo URL provided. Must be a valid Firebase Storage URL, a generic HTTPS URL, empty, or null.',
            400,
            'INVALID_PHOTO_URL',
          ),
        );
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({message: 'No valid profile fields provided for update.'});
    }

    updateData.profileLastUpdatedAt = serverTimestamp(); // Track profile update time

    await userRef.update(updateData);

    // Fetch updated data to return
    const updatedUserDoc = await userRef.get();
    const updatedUserData = updatedUserDoc.data();

    res.json({
      message: 'Profile updated successfully',
      profile: {
        // Return consistent profile object shape
        uid: userId,
        displayName: updatedUserData?.displayName,
        email: updatedUserData?.email, // Keep email for context if available
        photoURL: updatedUserData?.photoURL,
        bio: updatedUserData?.bio,
        profileLastUpdatedAt: updatedUserData?.profileLastUpdatedAt?.toDate(),
      },
    });
  } catch (error) {
    console.error(
      `Error updating profile for user ${req.params.userId}:`,
      error,
    );
    next(error);
  }
};

// Utility to check if a learning path is complete (placeholder, not currently used in this file)
const checkIfPathComplete = (learningProgress, pathDefinition) => {
  return false; // Placeholder
};

/**
 * @desc    Tracks user progress (start or complete) for a resource (module, quiz, exam)
 *          within a specific learning path. Updates the learning path document in Firestore.
 * @route   POST /api/v1/users/:userId/track-progress
 * @access  Private (requires valid userId)
 * Updates the corresponding document in the user's 'learningPaths' subcollection.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.trackProgress = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      resourceType = 'module', // path, module, quiz, exam
      resourceId,             // ID of the module, quiz, or exam completed
      action,                 // 'start' or 'complete'
      providerId,             // ID of the provider (e.g., 'gcp') - needed for context?
      pathId,                 // ID of the path definition (e.g., 'cdl')
      // timestamp,           // Optional client timestamp - Removed for simplicity, use server time
    } = req.body;

    // --- Input Validation ---
    if (!userId || typeof userId !== 'string') {
      return next(new AppError('Valid userId parameter is required', 400, 'INVALID_USER_ID_PARAM'));
    }
    if (!resourceId || typeof resourceId !== 'string') {
      // Allow 'start' action for 'path' resourceType without resourceId? No, path start is handled by providerPathController.
      // This endpoint is for *within* a path.
      return next(new AppError('Valid resourceId (module, quiz, or exam ID) is required', 400, 'MISSING_RESOURCE_ID'));
    }
    if (!action || !['start', 'complete'].includes(action)) {
      // 'start' might just update lastAccessedAt, 'complete' updates progress arrays
      return next(new AppError("Action must be 'start' or 'complete'", 400, 'INVALID_ACTION'));
    }
    if (!['module', 'quiz', 'exam'].includes(resourceType)) {
      // Removed 'path' as starting/activating is handled elsewhere. This tracks items *within* a path.
      return next(new AppError('Valid resourceType (module, quiz, exam) is required', 400, 'INVALID_RESOURCE_TYPE'));
    }
    // providerId might not be strictly needed if pathId is unique, but good for context/querying
    if (!providerId || typeof providerId !== 'string') {
      return next(new AppError('Valid providerId is required', 400, 'MISSING_PROVIDER_ID'));
    }
    if (!pathId || typeof pathId !== 'string') {
      return next(new AppError('Valid pathId is required', 400, 'MISSING_PATH_ID'));
    }

    const userRef = db.collection('users').doc(userId);
    // Reference to the subcollection
    const learningPathsCollectionRef = userRef.collection('learningPaths');

    console.log(`[trackProgress] User: ${userId}, PathDefID: ${pathId}, Resource: ${resourceType}/${resourceId}, Action: ${action}`);

    // --- Transaction for Atomic Updates ---
    await db.runTransaction(async (transaction) => {
      console.log(`[trackProgress TX] Starting transaction for user ${userId}, pathDefId ${pathId}`);

      // 1. Find the specific learning path document for this user and path definition
      const pathQuery = learningPathsCollectionRef.where('pathId', '==', pathId).limit(1);
      const pathQuerySnapshot = await transaction.get(pathQuery);

      if (pathQuerySnapshot.empty) {
        console.error(`[trackProgress TX] Learning path with pathId ${pathId} not found for user ${userId}. User must start path first.`);
        throw new AppError(`Learning path not started. Please start the path first.`, 404, 'LEARNING_PATH_NOT_STARTED');
      }

      const pathDoc = pathQuerySnapshot.docs[0];
      const pathRef = pathDoc.ref; // Get the actual document reference
      const pathData = pathDoc.data();
      console.log(`[trackProgress TX] Found learning path document: ${pathRef.path}`);

      // 2. Fetch user document (needed for lastActivity update)
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        // Should not happen if pathDoc exists, but good check
        console.error(`[trackProgress TX] User ${userId} not found during transaction.`);
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      console.log(`[trackProgress TX] User ${userId} exists.`);

      // 3. Prepare updates for the specific learning path document
      const pathUpdatePayload = {
        lastAccessedAt: serverTimestamp(), // Always update last accessed time
      };
      let needsPercentageRecalc = false;

      if (action === 'complete') {
        console.log(`[trackProgress TX] Processing 'complete' action for ${resourceType} ${resourceId}`);
        const currentProgress = pathData.learningProgress || { completedModules: [], completedQuizzes: [], completedExams: [] };

        switch (resourceType) {
          case 'module':
            // Use FieldValue.arrayUnion for atomic update if not already present
            if (!currentProgress.completedModules?.includes(resourceId)) {
              pathUpdatePayload['learningProgress.completedModules'] = FieldValue.arrayUnion(resourceId);
              needsPercentageRecalc = true;
              console.log(`[trackProgress TX] Adding module ${resourceId} to completedModules.`);
            }
            break;
          case 'quiz':
            if (!currentProgress.completedQuizzes?.includes(resourceId)) {
              pathUpdatePayload['learningProgress.completedQuizzes'] = FieldValue.arrayUnion(resourceId);
              needsPercentageRecalc = true;
              console.log(`[trackProgress TX] Adding quiz ${resourceId} to completedQuizzes.`);
            }
            break;
          case 'exam':
            if (!currentProgress.completedExams?.includes(resourceId)) {
              pathUpdatePayload['learningProgress.completedExams'] = FieldValue.arrayUnion(resourceId);
              needsPercentageRecalc = true;
              console.log(`[trackProgress TX] Adding exam ${resourceId} to completedExams.`);
            }
            break;
        }

        // 4. Recalculate Completion Percentage if needed
        if (needsPercentageRecalc) {
          // Simulate the update locally to calculate new counts
          const currentModules = currentProgress.completedModules || [];
          const currentQuizzes = currentProgress.completedQuizzes || [];
          const currentExams = currentProgress.completedExams || [];

          const newModulesCount = resourceType === 'module' && !currentModules.includes(resourceId) ? currentModules.length + 1 : currentModules.length;
          const newQuizzesCount = resourceType === 'quiz' && !currentQuizzes.includes(resourceId) ? currentQuizzes.length + 1 : currentQuizzes.length;
          const newExamsCount = resourceType === 'exam' && !currentExams.includes(resourceId) ? currentExams.length + 1 : currentExams.length;

          // Use totals stored on the path document
          const totalModules = pathData.totalModules || 0;
          const totalQuizzes = pathData.totalQuizzes || 0;
          const totalExams = pathData.totalExams || 0;
          const totalItems = totalModules + totalQuizzes + totalExams;
          const completedItems = newModulesCount + newQuizzesCount + newExamsCount;

          let newCompletionPercentage = pathData.learningProgress?.completionPercentage || 0; // Default to existing

          if (totalItems > 0) {
              newCompletionPercentage = Math.round((completedItems / totalItems) * 100);
          } else if (totalItems === 0) {
              // If no items defined, consider it 100%? Or 0? Let's default to 0 unless explicitly marked complete later.
              newCompletionPercentage = 0;
          }

          // Ensure percentage doesn't exceed 100
          newCompletionPercentage = Math.min(newCompletionPercentage, 100);
          pathUpdatePayload['learningProgress.completionPercentage'] = newCompletionPercentage;
          console.log(`[trackProgress TX] New completion percentage calculated: ${newCompletionPercentage}%`);

          // Check if path is now complete based on percentage
          if (newCompletionPercentage === 100 && !pathData.completed) {
            pathUpdatePayload.completed = true;
            pathUpdatePayload.completedAt = serverTimestamp();
            console.log(`[trackProgress TX] Path marked as complete based on percentage.`);
          }
        }
      } // End if (action === 'complete')

      // 5. Commit updates to the path document
      console.log(`[trackProgress TX] Updating path data for ${pathRef.path}:`, JSON.stringify(pathUpdatePayload));
      transaction.update(pathRef, pathUpdatePayload);

      // 6. Commit update to the user document (only lastActivity)
      const userUpdatePayload = {
        lastActivity: serverTimestamp() // Use serverTimestamp sentinel here
      };
      console.log(`[trackProgress TX] Updating user data for ${userRef.path}:`, JSON.stringify(userUpdatePayload));
      transaction.update(userRef, userUpdatePayload);

      console.log(`[trackProgress TX] Transaction updates prepared for user ${userId}.`);
    }); // End Transaction

    console.log(
      `[trackProgress] Successfully tracked progress for user ${userId}, pathDefId ${pathId}, resource ${resourceType}/${resourceId}, action: ${action}`
    );

    res.status(200).json({
      status: 'success',
      message: 'Progress tracked successfully',
    });
  } catch (error) {
    console.error(`[trackProgress] Error tracking progress for user ${req.params.userId}:`, {
      message: error.message,
      code: error.code,
      // stack: error.stack, // Stack might be too verbose for regular logs
    });
    console.error(`[trackProgress] Failed request body:`, req.body);

    if (error instanceof AppError) {
      return next(error);
    }
    // Provide more specific error message if possible
    return next(new AppError(`Database error tracking progress: ${error.message}`, 500, 'DB_SAVE_ERROR'));
  }
};


/**
 * @desc    Retrieves comprehensive user progress, including all learning paths with their details,
 *          and overall progress metrics. This function is similar to one in providerPathController
 *          but is scoped under the user resource.
 * @route   GET /api/v1/users/:userId/progress
 * @access  Private (requires valid userId)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getUserProgress = async (req, res, next) => {
  try {
    // Decide whether to use authenticated user or param. Using param for now as per original Express code.
    // Consider switching to req.user.uid for better security if route is protected.
    const { userId } = req.params;

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
    const pathsSnapshot = await userRef.collection('learningPaths').orderBy('lastAccessedAt', 'desc').get();

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
          // e.g., ... (userData.overallProgress || {})
        }
      }
    });

  } catch (error) {
    console.error(`[providerPathCtrl] Error fetching user progress for ${params.userId}:`, error);
    next(new AppError('Failed to retrieve user progress', 500, 'PROGRESS_FETCH_ERROR'));
  }
};
