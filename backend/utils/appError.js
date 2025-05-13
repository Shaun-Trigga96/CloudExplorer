// Centralized Error Handling Class
/**
 * @file appError.js
 * @description This file defines a custom error class `AppError` used for centralized
 * error handling throughout the application. It extends the native `Error` class
 * to include additional properties like statusCode, status, and an operational flag.
 */

/**
 * Custom error class for handling application-specific errors.
 * @extends Error
 */
class AppError extends Error {
    /**
     * Creates an instance of AppError.
     * @param {string} message - The error message.
     * @param {number} statusCode - The HTTP status code associated with the error.
     * @param {string|null} [code=null] - An optional application-specific error code (e.g., 'VALIDATION_ERROR').
     * @param {Object|null} [errors=null] - An optional object containing detailed validation errors or other error specifics.
     */
    constructor(message, statusCode, code = null, errors = null) { // Added errors parameter
      super(message);
      this.statusCode = statusCode;
      this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
      this.isOperational = true; // Distinguish operational errors from programming errors
      this.code = code; // Add an optional error code
      this.errors = errors; // Add optional validation errors object
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = AppError;