const express = require('express');
const docController = require('../controllers/docController');
const {validateModuleInput} = require('../middleware/validation');
// Add auth middleware, admin checks if needed

const router = express.Router();

// --- Static routes first ---
// Route to create a Google Doc *specifically for a module*
// This might be better under /module routes, e.g., POST /module/:moduleId/doc
// Or keep it generic but ensure moduleId is passed and handled correctly.
// Applying validation middleware here.
// Applying protection/admin checks is highly recommended for creation routes.
router.post(
  '/create-module-doc',
  /* protect, adminOnly, */ validateModuleInput,
  docController.createModuleDoc,
);

// --- Dynamic routes ---
// Get content of any Google Doc by its ID (potentially sensitive, protect appropriately)
router.get('/content/:docId', /* protect, */ docController.getDocContent); // Changed route slightly for clarity

module.exports = router;
