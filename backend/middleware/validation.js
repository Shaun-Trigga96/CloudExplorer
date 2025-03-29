const AppError = require('../utils/appError');

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
