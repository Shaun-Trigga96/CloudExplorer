const admin = require('firebase-admin');
const axios = require('axios');
const AppError = require('../utils/appError');
const {
  serverTimestamp,
  isValidFirebaseStorageUrl,
} = require('../utils/firestoreHelpers');

const db = admin.firestore();
const storage = admin.storage(); // Initialize storage

// POST /user/:userId/module/start
exports.startModuleProgress = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const {moduleId} = req.body;

    if (!userId || typeof userId !== 'string') {
      return next(
        new AppError('Invalid userId parameter', 400, 'INVALID_PARAM'),
      );
    }
    if (!moduleId || typeof moduleId !== 'string') {
      return next(
        new AppError(
          'Invalid moduleId in request body',
          400,
          'INVALID_BODY_PARAM',
        ),
      );
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Check if module exists (optional, but good practice)
    const moduleRef = db.collection('modules').doc(moduleId);
    const moduleDoc = await moduleRef.get();
    if (!moduleDoc.exists) {
      return next(new AppError('Module not found', 404, 'MODULE_NOT_FOUND'));
    }

    await userRef.collection('progress').doc(moduleId).set(
      {
        
        // Use moduleId as doc ID for easier querying
        moduleId, // Store moduleId for reference if needed
        startedAt: serverTimestamp(),
        status: 'in_progress',
        lastAccessed: serverTimestamp(), // Could add this too
      },
      {merge: true},
    ); // Merge in case progress already exists

    res
      .status(200)
      .send({
        message: `Module ${moduleId} progress started or updated for user ${userId}`,
      });
  } catch (error) {
    console.error(
      `Error starting module progress for user ${req.params.userId}, module ${req.body.moduleId}:`,
      error,
    );
    next(error);
  }
};

// GET /user/:userId/settings
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

// PUT /user/:userId/settings
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

// GET /user/:userId/profile-image
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

// PUT /user/:userId/profile
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
        isValidFirebaseStorageUrl(photoURL)
      ) {
        updateData.photoURL = photoURL;
      } else {
        return next(
          new AppError(
            'Invalid photo URL provided. Must be a valid Firebase Storage URL, empty, or null.',
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

// --- NEW: Track Generic Progress (Start/Complete Content) ---
// POST /progress
exports.trackProgress = async (req, res, next) => {
  try {
    const {userId} = req.params;
    // Expect resourceType (e.g., 'module', 'section', 'video'), resourceId, action ('start', 'complete')
    const {resourceType = 'module', resourceId, action, timestamp} = req.body;

    // --- Input Validation ---
    if (!userId || typeof userId !== 'string')
      return next(
        new AppError(
          'Valid userId parameter is required',
          400,
          'INVALID_USER_ID_PARAM',
        ),
      );
    if (!resourceId || typeof resourceId !== 'string')
      return next(
        new AppError(
          'Valid resourceId is required in body',
          400,
          'MISSING_RESOURCE_ID',
        ),
      );
    if (!action || !['start', 'complete'].includes(action))
      return next(
        new AppError(
          "Action must be 'start' or 'complete'",
          400,
          'INVALID_ACTION',
        ),
      );
    if (!resourceType || typeof resourceType !== 'string')
      return next(
        new AppError(
          'Valid resourceType is required',
          400,
          'MISSING_RESOURCE_TYPE',
        ),
      );

    const userRef = db.collection('users').doc(userId);
    const batch = db.batch();
    const progressTimestamp = timestamp
      ? admin.firestore.Timestamp.fromDate(new Date(timestamp))
      : serverTimestamp();

    // Document ID in 'progress' subcollection: `${resourceType}_${resourceId}`
    const progressDocId = `${resourceType}_${resourceId}`;
    const progressRef = userRef.collection('progress').doc(progressDocId);

    // Data to save/update in the progress document
    const progressData = {
      resourceType,
      resourceId,
      lastUpdatedAt: progressTimestamp,
    };

    if (action === 'start') {
      progressData.startedAt = progressTimestamp;
      progressData.status = 'in_progress';
    } else if (action === 'complete') {
      // Mark specific resource as completed
      progressData.completedAt = progressTimestamp;
      progressData.status = 'completed';
    }

    // Update general user lastActivity
    batch.update(userRef, {lastActivity: serverTimestamp()});

    // Set/Merge the specific progress document
    batch.set(progressRef, progressData, {merge: true});

    // Check if user exists before committing? Transaction might be safer.
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      // If user doesn't exist, initialize them within the batch/transaction
      console.warn(
        `User ${userId} not found while tracking progress. Creating user record.`,
      );
      batch.set(
        userRef,
        {
          userId,
          learningProgress: {
            // Initialize structure
            completedModules: [],
            completedQuizzes: [],
            completedExams: [],
          },
          lastActivity: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        {merge: true},
      ); // Merge avoids race condition if created elsewhere
    } else {
        // If user exists, update the learningProgress based on the action and resourceType
        const userLearningProgress = userDoc.data().learningProgress || {};
        const completedModules = new Set(userLearningProgress.completedModules || []);
        if (action === 'complete' && resourceType === 'module') {
            completedModules.add(resourceId);
        }
        batch.update(userRef, {
            'learningProgress.completedModules': Array.from(completedModules),
        });
    }

    await batch.commit();
    console.log(
      `Progress tracked for user ${userId}, resource ${resourceType}/${resourceId}, action: ${action}`,
    );

    res.status(200).json({message: 'Progress tracked successfully.'});
  } catch (error) {
    console.error(
      `Error tracking progress for user ${req.params.userId}:`,
      error,
    );
    // Handle Firestore errors specifically
    if (
      error.message?.includes('firestore') ||
      error.name?.includes('FirebaseError')
    ) {
      next(
        new AppError(
          `Database error tracking progress: ${error.message}`,
          500,
          'DB_SAVE_ERROR',
        ),
      );
    } else {
      next(error); // Pass others to global handler
    }
  }
};

// --- NEW: Get User Overall Progress Summary ---
// GET /progress
exports.getUserProgress = async (req, res, next) => {
  try {
    const {userId} = req.params;

    console.log(`[getUserProgress] Starting progress fetch for user: ${userId}`); // Log 1: Start of function

    if (!userId || typeof userId !== 'string') {
      console.error(`[getUserProgress] Invalid userId: ${userId}`); // Log 2: Invalid user ID
      return next(
        new AppError(
          'Valid User ID parameter is required',
          400,
          'INVALID_USER_ID_PARAM',
        ),
      );
    }

    // Use Promise.all for parallel fetching
    const [
      userDoc,
      progressSnapshot, // Detailed start/complete status per resource
      quizResultsSnapshot,
      examResultsSnapshot,
      modulesSnapshot,
      examsSnapshot,
      quizzesSnaphost,
    ] = await Promise.all([
      db.collection('users').doc(userId).get(),
      db.collection('users').doc(userId).collection('progress').get(), // Get all progress docs
      db
        .collection('quizResults')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .get(),
      db
        .collection('examResults')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .get(),
      db.collection('modules').get(),
      db.collection('exams').get(),
      db.collection('quizzes').get(),
    ]);

    console.log(`[getUserProgress] Data fetched from Firestore for user: ${userId}`); // Log 3: Data fetch complete

    if (!userDoc.exists) {
      console.warn(`[getUserProgress] User ${userId} not found.`); // Log 4: User not found
      console.log(`[getUserProgress] Returning default progress structure.`);
      return res.json({
        // Return a structure indicating user not found or default state
        userExists: false,
        learningProgress: {
          completedModules: [],
          completedQuizzes: [],
          completedExams: [],
          modulesInProgress: [],
          score: 0,
        },
        detailedProgress: [],
        quizResults: [],
        examResults: [],
        availableModules: [],
        exams: [],
        availableQuizzes: []
      });
      // OR: return next(new AppError('User not found', 404, 'USER_NOT_FOUND')); // If user must exist
    }

    const userData = userDoc.data() || {};
    console.log(`[getUserProgress] User data:`, userData); // Log 5: User data

    // Provide defaults for learningProgress structure if missing
    const learningProgress = {
      completedModules: userData.learningProgress?.completedModules || [],
      completedQuizzes: userData.learningProgress?.completedQuizzes || [], // This might be summary, not full history
      completedExams: userData.learningProgress?.completedExams || [], // This might be summary, not full history
      modulesInProgress: [],
      score: userData.learningProgress?.score || 0, // Example overall score
    };
    console.log(`[getUserProgress] Initial learningProgress:`, learningProgress); // Log 6: Initial learningProgress

    // Process detailed progress snapshot (start/complete actions)
    const detailedProgress = progressSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`[getUserProgress] Detailed progress doc data:`, data); // Log 7: Detailed progress data
      if(data.status === 'in_progress' && data.resourceType === 'module'){
        learningProgress.modulesInProgress.push(data.resourceId);
      }
      return {
        id: doc.id, // e.g., "module_mod123"
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        status: data.status, // 'in_progress', 'completed'
        startedAt: data.startedAt?.toDate()?.toISOString() || null,
        completedAt: data.completedAt?.toDate()?.toISOString() || null,
        lastUpdatedAt: data.lastUpdatedAt?.toDate()?.toISOString() || null,
      };
    });

    console.log(`[getUserProgress] Detailed progress processed:`, detailedProgress); // Log 8: Detailed progress processed
    console.log(`[getUserProgress] learningProgress after detailed progress:`, learningProgress); // Log 9: learningProgress after detailed progress

    // Process quiz results (full history)
    const quizResults = quizResultsSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`[getUserProgress] Quiz result data:`, data); // Log 10: Quiz result data
      return {
        id: doc.id,
        moduleId: data.moduleId,
        quizId: data.quizId,
        score: data.score,
        totalQuestions: data.totalQuestions,
        percentage: data.percentage,
        passed: data.passed,
        timestamp: data.timestamp?.toDate()?.toISOString() || null,
      };
    });

    console.log(`[getUserProgress] Quiz results processed:`, quizResults); // Log 11: Quiz results processed

    // Process exam results (full history)
    const examResults = examResultsSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log(`[getUserProgress] Exam result data:`, data); // Log 12: Exam result data
      return {
        id: doc.id,
        examId: data.examId,
        score: data.score,
        totalQuestions: data.totalQuestions,
        percentage: data.percentage,
        passed: data.passed, // Field name consistency
        timestamp: data.timestamp?.toDate()?.toISOString() || null,
      };
    });

    console.log(`[getUserProgress] Exam results processed:`, examResults); // Log 13: Exam results processed

    // --- Construct Response ---
    // Return a comprehensive object
    console.log(`[getUserProgress] Final learningProgress:`, learningProgress); // Log 14: Final learningProgress
    console.log(`[getUserProgress] Sending response to client.`); // Log 15: Sending response
    res.json({
      userExists: true,
      learningProgress, // Summary data from user doc
      detailedProgress, // Start/complete status for individual resources
      quizResults, // Full history of quiz attempts
      examResults, // Full history of exam attempts
      availableQuizzes: quizzesSnaphost ? quizzesSnaphost.docs.map(d => ({ id: d.id, ...d.data() })) : [],
      availableModules: modulesSnapshot ? modulesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) : [],
      exams: examsSnapshot ? examsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) : [],
    });
  } catch (error) {
    console.error(
      `[getUserProgress] Error fetching overall progress for user ${req.params.userId}:`,
      error,
    );
    next(
      new AppError('Failed to retrieve user progress.', 500, 'DB_FETCH_ERROR'),
    );
  }
};