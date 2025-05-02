const express = require('express');
const moduleController = require('../controllers/moduleController');

const router = express.Router();

// --- Static routes first ---
// List modules (potentially public or protected depending on app logic)
router.get('/list', moduleController.listModules); // Changed from /list-modules to /module/list

// --- Dynamic routes ---
// Get a specific module by ID
router.get('/:moduleId', moduleController.getModuleById);

// Get sections for a specific module
router.get('/:moduleId/sections', moduleController.getModuleSections);


module.exports = router;