const AppError = require('../utils/appError');

/**
 * @file validation.js
 * @description This file contains middleware functions for validating request inputs
 * for various entities like modules and exams.
 */

/**
 * @desc    Validates the input for creating or updating a module.
 *          Checks for the presence and type of `moduleId` and `title`.
 * @param   {Object} req - Express request object, expects `moduleId` and `title` in `req.body`.
 * @param   {Object} res - Express response object.
 * @param   {Function} next - Express next middleware function.
 */
const validateModuleInput = (req, res, next) => {
  const {moduleId, title} = req.body;
  const errors = {};

  if (!moduleId || typeof moduleId !== 'string' || moduleId.trim() === '') {
    errors.moduleId = 'Module ID is required and must be a non-empty string.';
  }
  if (!title || typeof title !== 'string' || title.trim() === '') {
    errors.title = 'Title is required and must be a non-empty string.';
  }
  // Add more validation as needed (e.g., length limits)

  if (Object.keys(errors).length > 0) {
    // Pass the errors object to AppError
    return next(
      new AppError('Validation Error', 400, 'VALIDATION_ERROR', errors),
    );
  }

  next();
};

/**
 * @desc    Validates the input for creating or updating an exam.
 *          Checks for the presence and type of `examId` and `title`, and optionally `description`.
 * @param   {Object} req - Express request object, expects `examId`, `title`, and optionally `description` in `req.body`.
 * @param   {Object} res - Express response object.
 * @param   {Function} next - Express next middleware function.
 */
const validateExamInput = (req, res, next) => {
  const {examId, title, description} = req.body;
  const errors = {};

  if (!examId || typeof examId !== 'string' || examId.trim() === '') {
    errors.examId = 'Exam ID is required and must be a non-empty string.';
  }
  if (!title || typeof title !== 'string' || title.trim() === '') {
    errors.title = 'Title is required and must be a non-empty string.';
  }
  if (description && typeof description !== 'string') {
    // Optional description check
    errors.description = 'Description must be a string.';
  }
  // Add more validation as needed

  if (Object.keys(errors).length > 0) {
    // Pass the errors object to AppError
    return next(
      new AppError('Validation Error', 400, 'VALIDATION_ERROR', errors),
    );
  }

  next();
};

module.exports = {
  validateModuleInput,
  validateExamInput,
};
