const express = require('express');
const quizController = require('../controllers/quizController');
// const { protect } = require('../middleware/authMiddleware'); // Authentication middleware
/**
 * @file quizRoutes.js
 * @description This file defines routes for quiz-related functionalities,
 * such as saving quiz results, listing quizzes, and retrieving quiz history.
 * All routes defined here are prefixed with `/api/v1/quizzes`.
 */

const router = express.Router();

// --- Routes ---
/**
 * @route   POST /save-result
 * @desc    Saves a user's quiz result.
 * @access  Private (Requires user authentication)
 */
router.post('/save-result', /* protect, */ quizController.saveQuizResult);

/**
 * @route   GET /history/:userId
 * @desc    Get quiz history for a specific user.
 *          Optionally filters by moduleId, providerId, and pathId via query parameters.
 * @access  Private (Requires user authentication; user must match `:userId` or be an admin)
 * @param   {string} req.params.userId - The ID of the user whose quiz history is to be retrieved.
 * @note    The controller `getQuizHistory` supports filtering by `moduleId`, `providerId`, and `pathId`
 *          passed as query parameters.
 */
router.get('/history/:userId', /* protect, */ quizController.getQuizHistory);

/**
 * @route   GET /list-quizzes
 * @desc    Lists available quizzes, typically filtered by providerId and pathId.
 *          Supports optional filtering by moduleId and pagination.
 * @access  Public (or Private, depending on application access rules for quiz content)
 * @query   {string} [providerId] - Filter by provider ID.
 * @query   {string} [pathId] - Filter by path ID.
 * @query   {string} [moduleId] - Optional: Filter by module ID.
 */
router.get('/list-quizzes', quizController.listQuizzes);

/**
 * @route   GET /:id
 * @desc    Retrieves a specific quiz definition by its ID.
 * @access  Public (or Private, depending on application access rules for quiz content)
 * @param   {string} req.params.id - The ID of the quiz to retrieve.
 */
router.get('/:id', quizController.getQuizById);



module.exports = router;
