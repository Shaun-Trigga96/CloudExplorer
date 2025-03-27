// Centralized Error Handling Class
class AppError extends Error {
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