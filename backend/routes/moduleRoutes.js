const express = require('express');
const moduleController = require('../controllers/moduleController');
/**
 * @file moduleRoutes.js
 * @description This file defines routes for module-related functionalities,
 * such as listing modules, fetching module details, and retrieving module sections.
 * All routes defined here are prefixed with `/api/v1/modules`.
 */

const router = express.Router();

// --- Static routes first ---
/**
 * @route   GET /list
 * @desc    List modules with filtering, pagination, and sorting.
 * @access  Public (or Private, depending on application access rules for module content)
 * @query   {number} [limit=20] - Number of modules to return.
 * @query   {string} [lastId] - ID of the last module from the previous page for pagination.
 * @query   {string} [orderBy='order'] - Field to order by.
 * @query   {string} [orderDir='asc'] - Order direction.
 * @query   {string} [providerId] - Filter by provider ID.
 * @query   {string} [pathId] - Filter by path ID.
 */
router.get('/list', moduleController.listModules); // Changed from /list-modules to /module/list

// --- Dynamic routes ---
/**
 * @route   GET /:moduleId
 * @desc    Get a specific module by its ID.
 * @access  Public (or Private, depending on application access rules for module content)
 * @param   {string} req.params.moduleId - The ID of the module to retrieve.
 */
router.get('/:moduleId', moduleController.getModuleById);

/**
 * @route   GET /:moduleId/sections
 * @desc    Get all sections for a specific module, ordered by their 'order' field.
 * @access  Public (or Private, depending on application access rules for module content)
 * @param   {string} req.params.moduleId - The ID of the module whose sections are to be retrieved.
 */
router.get('/:moduleId/sections', moduleController.getModuleSections);


module.exports = router;