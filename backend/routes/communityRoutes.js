// backend/routes/communityRoutes.js
const express = require('express');
const communityController = require('../controllers/communityController');
// const { protect } = require('../middleware/authMiddleware'); // Import protect middleware when ready

const router = express.Router();

// --- Public Routes (or protected based on your app's logic) ---

// GET /api/v1/community/posts - Fetch list of posts
router.get('/posts', communityController.getCommunityPosts);

// GET /api/v1/community/members - Fetch list of members
router.get('/members', communityController.getCommunityMembers);

// --- Protected Routes (Example - Apply 'protect' middleware later) ---

// POST /api/v1/community/posts - Create a new post
router.post('/posts', /* protect, */ communityController.createCommunityPost);

// POST /api/v1/community/posts/:postId/like - Like a post
router.post('/posts/:postId/like', /* protect, */ communityController.likePost);

// DELETE /api/v1/community/posts/:postId/like - Unlike a post
router.delete('/posts/:postId/like', /* protect, */ communityController.unlikePost);


module.exports = router;
