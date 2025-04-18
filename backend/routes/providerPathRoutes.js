// backend/routes/providerPathRoutes.js
const express = require('express');
const providerPathController = require('../controllers/providerPathController');
// Assuming you have authentication middleware like this:
// const { protect } = require('../middleware/authMiddleware');
// If not, you'll need to implement or adjust authentication checks.
// For now, I'll comment out 'protect' but it's highly recommended for user-specific routes.

const router = express.Router();

// --- Provider/Path Definition Routes (Public) ---

/**
 * @route   GET /api/v1/providers
 * @desc    Get all available cloud providers
 * @access  Public
 */
router.get('/providers', providerPathController.getProviders);

/**
 * @route   GET /api/v1/paths/all
 * @desc    Get all available learning paths grouped by provider
 * @access  Public
 */
router.get('/paths/all', providerPathController.getAllPaths);


// --- User-Specific Learning Path Routes (Protected) ---
// These routes interact with a specific user's learning path data.

/**
 * @route   POST /api/v1/user/:userId/paths
 * @desc    Start a new learning path for a user or set existing as active
 * @access  Private (Requires Authentication)
 */
router.post('/user/:userId/paths', /* protect, */ providerPathController.startLearningPath);

/**
 * @route   POST /api/v1/user/:userId/paths/:learningPathId/activate
 * @desc    Set a specific learning path as active for a user
 * @access  Private (Requires Authentication)
 */
router.post('/user/:userId/paths/:learningPathId/activate', /* protect, */ providerPathController.setActiveLearningPath);

/**
 * @route   POST /api/v1/user/:userId/paths/:learningPathId/progress
 * @desc    Update learning progress for a specific path
 * @access  Private (Requires Authentication)
 */
router.post('/user/:userId/paths/:learningPathId/progress', /* protect, */ providerPathController.updateLearningProgress);

/**
 * @route   GET /api/v1/user/:userId/progress
 * @desc    Get user's learning paths with progress details (Path Specific Progress)
 * @access  Private (Requires Authentication or uses userId from param securely)
 * @note    This route might conflict with a general progress route in userRoutes.js.
 *          Consider renaming (e.g., /user/:userId/learning-paths-progress) if needed.
 */
router.get('/user/:userId/progress', /* protect, */ providerPathController.getUserProgress);


module.exports = router;
