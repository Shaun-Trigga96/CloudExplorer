const express = require('express');
const userController = require('../controllers/userController');
// const { protect } = require('../middleware/authMiddleware');
/**
 * @file userRoutes.js
 * @description This file defines routes for user-specific functionalities,
 * such as managing profiles, settings, certifications, and learning progress.
 * All routes defined here are prefixed with `/api/v1/users`.
 */

const router = express.Router();

// Apply protect middleware to all user routes if default is protected
// router.use(protect);

// --- Static routes first (if any) ---
// router.get('/me', userController.getMyProfile); // Example

// --- Dynamic routes ---

// Profile routes
/**
 * @route   GET /:userId/profile-image
 * @desc    Get the profile image for a specific user.
 * @access  Public (Redirects to a default image if not found or on error)
 * @param   {string} req.params.userId - The ID of the user whose profile image is to be retrieved.
 */
router.get('/:userId/profile-image', userController.getUserProfileImage); // Public image access
/**
 * @route   PUT /:userId/profile
 * @desc    Update user profile information (displayName, bio, photoURL).
 * @access  Private (Requires user authentication; user must match `:userId` or be an admin)
 * @param   {string} req.params.userId - The ID of the user whose profile is to be updated.
 */
router.put('/:userId/profile', /* protect, */ userController.updateUserProfile);

// Settings routes
/**
 * @route   GET /:userId/settings
 * @desc    Get user-specific settings.
 * @access  Private (Requires user authentication; user must match `:userId` or be an admin)
 * @param   {string} req.params.userId - The ID of the user whose settings are to be retrieved.
 */
router.get('/:userId/settings', /* protect, */ userController.getUserSettings);
/**
 * @route   PUT /:userId/settings
 * @desc    Update user-specific settings.
 * @access  Private (Requires user authentication; user must match `:userId` or be an admin)
 * @param   {string} req.params.userId - The ID of the user whose settings are to be updated.
 */
router.put('/:userId/settings', /* protect, */ userController.updateUserSettings);

// Certifications routes
/**
 * @route   GET /:userId/certifications
 * @desc    Get all certifications for a specific user.
 * @access  Private (Requires user authentication; user must match `:userId` or be an admin)
 * @param   {string} req.params.userId - The ID of the user whose certifications are to be retrieved.
 */
router.get('/:userId/certifications', /* protect, */ userController.getUserCertifications);

// --- Progress Routes --- (Added)
/**
 * @route   POST /:userId/progress
 * @desc    Tracks user progress (start or complete) for a resource within a specific learning path.
 * @access  Private (Requires user authentication; user must match `:userId` or be an admin)
 * @param   {string} req.params.userId - The ID of the user whose progress is to be tracked.
 */
router.post('/:userId/progress', /* protect, */ userController.trackProgress);

/**
 * @route   GET /:userId/progress
 * @desc    Retrieves comprehensive user progress, including all learning paths and overall metrics.
 * @access  Private (Requires user authentication; user must match `:userId` or be an admin)
 * @param   {string} req.params.userId - The ID of the user whose progress is to be retrieved.
 * @note    This GET route shares the same path as the POST route for tracking progress.
 *          The distinction is handled by the HTTP method and the corresponding controller function.
 */
router.get('/:userId/progress', /* protect, */ userController.getUserProgress);


module.exports = router;