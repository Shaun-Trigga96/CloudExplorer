// backend/routes/providerPathRoutes.js
const express = require('express');
const providerPathController = require('../controllers/providerPathController');
// Assuming you have authentication middleware like this:
// const { protect } = require('../middleware/authMiddleware');
// If not, you'll need to implement or adjust authentication checks.
// For now, I'll comment out 'protect' but it's highly recommended for user-specific routes.

/**
 * @file providerPathRoutes.js
 * @description This file defines routes for managing cloud providers, learning paths,
 * and user progress related to these paths. All routes defined here are prefixed with `/api/v1`.
 */
const router = express.Router();

// --- Provider/Path Definition Routes (Public) ---

/**
 * @route   GET /providers
 * @desc    Get all available cloud providers
 * @access  Public
 */
router.get('/providers', providerPathController.getProviders);

/**
 * @route   GET /paths/all
 * @desc    Get all available learning paths grouped by provider
 * @access  Public
 */
router.get('/paths/all', providerPathController.getAllPaths);

// --- User-Specific Learning Path Routes (Protected) ---
// These routes interact with a specific user's learning path data.

/**
 * @route   POST /user/:userId/paths
 * @desc    Start a new learning path for a user or set existing as active
 * @access  Private (Requires user authentication)
 * @param   {string} req.params.userId - The ID of the user for whom to start or activate the path.
 * @body    {string} providerId - The ID of the cloud provider.
 * @body    {string} pathId - The ID of the learning path.
 */
router.post('/user/:userId/paths', /* protect, */ providerPathController.startLearningPath);

/**
 * @route   POST /user/:userId/paths/:learningPathId/activate
 * @desc    Set a specific learning path as active for a user
 * @access  Private (Requires user authentication)
 * @param   {string} req.params.userId - The ID of the user.
 * @param   {string} req.params.learningPathId - The ID of the learning path to activate.
 */
router.post('/user/:userId/paths/:learningPathId/activate', /* protect, */ providerPathController.setActiveLearningPath);

/**
 * @route   POST /user/:userId/paths/:learningPathId/progress
 * @desc    Update learning progress for a specific path
 * @access  Private (Requires user authentication)
 * @param   {string} req.params.userId - The ID of the user.
 * @param   {string} req.params.learningPathId - The ID of the learning path to update progress for.
 * @body    {string} resourceType - Type of resource (e.g., 'module', 'quiz', 'exam').
 * @body    {string} resourceId - ID of the resource.
 * @body    {string} status - Progress status (e.g., 'started', 'completed').
 * @body    {number} [score] - Optional score for quizzes/exams.
 */
router.post('/user/:userId/paths/:learningPathId/progress', /* protect, */ providerPathController.updateLearningProgress);

/**
 * @route   GET /user/:userId/progress
 * @desc    Get user's learning paths with progress details (Path Specific Progress)
 * @access  Private (Requires user authentication or uses userId from param securely)
 * @param   {string} req.params.userId - The ID of the user whose progress is to be retrieved.
 * @note    This route might conflict with a general progress route in userRoutes.js.
 *          Consider renaming (e.g., /user/:userId/learning-paths-progress) if needed.
 */
router.get('/user/:userId/progress', /* protect, */ providerPathController.getUserProgress);


module.exports = router;
