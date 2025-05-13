// backend/routes/communityRoutes.js
const express = require('express');
const communityController = require('../controllers/communityController');
// const { protect } = require('../middleware/authMiddleware'); // Import protect middleware when ready
/**
 * @file communityRoutes.js
 * @description This file defines routes for community-related functionalities,
 * such as posts, members, and events. All routes defined here are prefixed with `/api/v1/community`.
 */

const router = express.Router();

// --- Public Routes (or protected based on your app's logic) ---
// Posts
/**
 * @route   GET /posts
 * @desc    Get community posts with pagination and sorting.
 * @access  Public (or Private if authentication is needed to view posts)
 */
router.get('/posts', communityController.getCommunityPosts);
/**
 * @route   POST /posts
 * @desc    Create a new community post.
 * @access  Private (Requires user authentication)
 */
router.post('/posts', communityController.createCommunityPost); // Needs auth
/**
 * @route   POST /posts/:postId/like
 * @desc    Like a community post.
 * @access  Private (Requires user authentication)
 * @param   {string} req.params.postId - The ID of the post to like.
 */
router.post('/posts/:postId/like', communityController.likePost); // Needs auth
/**
 * @route   DELETE /posts/:postId/like
 * @desc    Unlike a community post. (Note: Can also be implemented as a POST)
 * @access  Private (Requires user authentication)
 * @param   {string} req.params.postId - The ID of the post to unlike.
 */
router.delete('/posts/:postId/like', communityController.unlikePost); // Needs auth (use POST for unlike too for consistency or DELETE)

// Members
/**
 * @route   GET /members
 * @desc    Get community members with pagination and sorting.
 * @access  Public (or Private if authentication is needed to view members)
 */
router.get('/members', communityController.getCommunityMembers);

// Events
/**
 * @route   GET /events
 * @desc    Get community events with pagination and sorting.
 * @access  Public
 * @query   {string} [userId] - Optional: User ID to check for user-specific event status (e.g., registered, saved).
 */
router.get('/events', communityController.getCommunityEvents); // May need userId query param
// router.post('/events/:eventId/register', communityController.registerForEvent); // Needs auth
// router.post('/events/:eventId/unregister', communityController.unregisterForEvent); // Needs auth
// router.post('/events/:eventId/save', communityController.saveEvent); // Needs auth
// router.post('/events/:eventId/unsave', communityController.unsaveEvent); // Needs auth


module.exports = router;
