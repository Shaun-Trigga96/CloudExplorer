const express = require('express');
const examController = require('../controllers/examController');
// const { protect, adminOnly } = require('../middleware/authMiddleware'); // Auth/Admin checks

const router = express.Router();

//console.log('DEBUG: Imported examController:', examController);

// --- Static routes first ---

// Save a user's exam result - Protected
// POST /api/v1/exams/save-result
router.post('/save-result', /* protect, */ examController.saveExamResult);

// List exams (optional, depends on requirements) - Protected? Public?
router.get('/list-exams', /* protect, */ examController.listExams);


// --- Dynamic routes ---

// Get exam history for a user - Protected, user must match or be admin
// GET /api/v1/exams/user/:userId/exam-history (Changed route)
router.get('/user/:userId/exam-history', /* protect, */ examController.getExamHistory); // Changed route and controller


// Get a specific exam definition by ID (protect based on user role/enrollment?)
router.get('/:id', /* protect, */ examController.getExamById);

module.exports = router;