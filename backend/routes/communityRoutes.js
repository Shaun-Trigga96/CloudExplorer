// backend/routes/communityRoutes.js
const express = require('express');
const communityController = require('../controllers/communityController');
// const { protect } = require('../middleware/authMiddleware'); // Import protect middleware when ready

const router = express.Router();

// --- Public Routes (or protected based on your app's logic) ---
// Posts
router.get('/posts', communityController.getCommunityPosts);
router.post('/posts', communityController.createCommunityPost); // Needs auth
router.post('/posts/:postId/like', communityController.likePost); // Needs auth
router.delete('/posts/:postId/like', communityController.unlikePost); // Needs auth (use POST for unlike too for consistency or DELETE)

// Members
router.get('/members', communityController.getCommunityMembers);

// Events
router.get('/events', communityController.getCommunityEvents); // May need userId query param
// router.post('/events/:eventId/register', communityController.registerForEvent); // Needs auth
// router.post('/events/:eventId/unregister', communityController.unregisterForEvent); // Needs auth
// router.post('/events/:eventId/save', communityController.saveEvent); // Needs auth
// router.post('/events/:eventId/unsave', communityController.unsaveEvent); // Needs auth


module.exports = router;
