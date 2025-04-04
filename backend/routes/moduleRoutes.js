const express = require('express');
const moduleController = require('../controllers/moduleController');
// Add auth middleware if needed

const router = express.Router();

// --- Static routes first ---
// List modules (potentially public or protected depending on app logic)
router.get('/list', moduleController.listModules); // Changed from /list-modules to /module/list

// --- Dynamic routes ---
// Get a specific module by ID
router.get('/:moduleId', moduleController.getModuleById);

// Get sections for a specific module
router.get('/:moduleId/sections', moduleController.getModuleSections);

// Add routes for creating/updating/deleting modules if needed (likely protected)
// router.post('/', protect, adminOnly, moduleController.createModule);
// router.put('/:id', protect, adminOnly, moduleController.updateModule);
// router.delete('/:id', protect, adminOnly, moduleController.deleteModule);


module.exports = router;