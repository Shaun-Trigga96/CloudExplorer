const express = require('express');
const examController = require('../controllers/examController');
// const { protect, adminOnly } = require('../middleware/authMiddleware'); // Auth/Admin checks
/**
 * @file examRoutes.js
 * @description This file defines routes for exam-related functionalities,
 * such as saving exam results, listing exams, and retrieving exam history.
 * All routes defined here are prefixed with `/api/v1/exams`.
 */

const router = express.Router();

//console.log('DEBUG: Imported examController:', examController);

// --- Static routes first ---
/**
 * @route   POST /save-result
 * @desc    Saves a user's exam result.
 * @access  Private (Requires user authentication)
 */
router.post('/save-result', /* protect, */ examController.saveExamResult);

/**
 * @route   GET /list-exams
 * @desc    Lists available exams, potentially filtered by providerId and pathId.
 * @access  Public (or Private, depending on application access rules for exam content)
 */
router.get('/list-exams', /* protect, */ examController.listExams);


// --- Dynamic routes ---
/**
 * @route   GET /user/:userId/exam-history
 * @desc    Retrieves the exam attempt history for a specific user.
 *          Optionally filters by examId, providerId, and pathId via query parameters.
 * @access  Private (Requires user authentication; user must match `:userId` or be an admin)
 * @param   {string} req.params.userId - The ID of the user whose exam history is to be retrieved.
 */
router.get('/user/:userId/exam-history', /* protect, */ examController.getExamHistory); // Changed route and controller

/**
 * @route   GET /:id
 * @desc    Retrieves a specific exam definition by its ID.
 * @access  Public (or Private, depending on application access rules for exam content,
 *          e.g., based on user role or enrollment)
 * @param   {string} req.params.id - The ID of the exam to retrieve.
 */
router.get('/:id', /* protect, */ examController.getExamById);

module.exports = router;