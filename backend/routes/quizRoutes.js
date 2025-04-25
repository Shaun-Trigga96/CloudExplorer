const express = require('express');
const quizController = require('../controllers/quizController');
// const { protect } = require('../middleware/authMiddleware'); // Authentication middleware

const router = express.Router();

// --- Routes ---
// Save a user's quiz result (apply protection)
// POST /api/v1/quizzes/save-result
router.post('/save-result', /* protect, */ quizController.saveQuizResult);

// Get quiz history for a specific user (apply protection, user must match or be admin)
// GET /api/v1/quizzes/history/:userId
// This might be better under userRoutes: GET /api/v1/users/:userId/quiz-history
// Let's keep it here for now, assuming :userId is validated against authenticated user
router.get('/history/:userId', /* protect, */ quizController.getQuizHistory);

// --- NEW: Get All Quizzes ---
// GET /api/v1/quizzes/list
router.get('/list-quizzes', quizController.listQuizzes);
// --- NEW: Get Quiz by ID ---
// GET /api/v1/quizzes/:id
router.get('/:id', quizController.getQuizById);



module.exports = router;
