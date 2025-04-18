/* eslint-disable linebreak-style */
/* eslint-disable new-cap */
/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable linebreak-style */
// routes/apiRoutes.js
// Remove the assignment to apiRouter
// eslint-disable-next-line new-cap
const express = require("express");
express.Router();

// Import controllers
const providerPathController = require("../controllers/providerPathController");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

// Provider and Path Routes (Public)
router.get("/providers", providerPathController.getProviders);
router.get("/paths/all", providerPathController.getAllPaths);

// User Routes (Protected)
router.get("/user/:userId/progress", authMiddleware.protect, userController.getUserProgress);
router.post("/user/:userId/paths", authMiddleware.protect, userController.startLearningPath);
router.post("/user/:userId/paths/:pathId/activate", authMiddleware.protect, userController.setActiveLearningPath);
router.post("/user/:userId/paths/:pathId/progress", authMiddleware.protect, userController.updateLearningProgress);

module.exports = router;
