const express = require('express');
const examController = require('../controllers/examController');
const { validateExamInput } = require('../middleware/validation');
const { hfApiLimiter } = require('../server'); // Import limiter
// const { protect, adminOnly } = require('../middleware/authMiddleware'); // Auth/Admin checks

const router = express.Router();

//console.log('DEBUG: Imported examController:', examController);

// --- Static routes first ---

// Create a new exam definition (Google Doc) - Admin only
// POST /api/v1/exams/create
router.post('/create', /* protect, adminOnly, */ validateExamInput, examController.createExamDoc);

// Generate exam questions based on an exam definition - Admin/Instructor only? Rate limited.
// POST /api/v1/exams/generate
//router.post('/generate', hfApiLimiter, /* protect, adminOnly, */ examController.generateExamQuestions);

// Save a user's exam result - Protected
// POST /api/v1/exams/save-result
router.post('/save-result', /* protect, */ examController.saveExamResult);

//
// List exams (optional, depends on requirements) - Protected? Public?
 router.get('/list', /* protect, */ examController.listExams);


// --- Dynamic routes ---

// Get exam progress/history for a user - Protected, user must match or be admin
// GET /api/v1/exams/progress/:userId
router.get('/progress/:userId', /* protect, */ examController.getExamProgress);


// Get a specific exam definition by ID (protect based on user role/enrollment?)
// router.get('/:examId', /* protect, */ examController.getExamById);

// Route for submitting exam attempts (maybe handled by save-result?)
// router.post('/:examId/attempt', protect, examController.submitExamAttempt);

// DEPRECATED? Review if this route is needed
// POST /api/v1/exams/complete/:userId (Old route name was /user/:userId/exam)
// router.post('/complete/:userId', /* protect, */ examController.completeExam);


module.exports = router;