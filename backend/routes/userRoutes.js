const express = require('express');
const userController = require('../controllers/userController');
// const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protect middleware to all user routes if default is protected
// router.use(protect);

// --- Static routes first (if any) ---
// router.get('/me', userController.getMyProfile); // Example

// --- Dynamic routes ---

// Profile routes
router.get('/:userId/profile-image', userController.getUserProfileImage); // Public image access
router.put('/:userId/profile', /* protect, */ userController.updateUserProfile);

// Settings routes
router.get('/:userId/settings', /* protect, */ userController.getUserSettings);
router.put('/:userId/settings', /* protect, */ userController.updateUserSettings);

// Certifications routes
router.get('/:userId/certifications', /* protect, */ userController.getUserCertifications);

// --- Progress Routes --- (Added)
// Track generic progress (start/complete module, section, etc.)
// POST /api/v1/users/:userId/progress
router.post('/:userId/progress', /* protect, */ userController.trackProgress);

// Get overall user progress summary
// GET /api/v1/users/:userId/progress
router.get('/:userId/progress', /* protect, */ userController.getUserProgress);


// --- Old/Replaced Progress Routes --- (Review and remove if covered by above)
//router.post('/:userId/module/start', userController.startModuleProgress); // Covered by POST /:userId/progress?


module.exports = router;