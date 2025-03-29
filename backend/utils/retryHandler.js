// Utility function for retrying async functions with exponential backoff and timeout
async function executeWithRetry(fn, maxRetries = 3, timeout = 10000, initialDelay = 500) {
    let lastError;
  
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Set up timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          const timer = setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
          // Allow Node.js to exit if this is the only thing running
          timer.unref();
        });
  
        // Race between the function execution and the timeout
        return await Promise.race([fn(), timeoutPromise]);
  
      } catch (error) {
        lastError = error;
        const isRetryable = error.message?.includes('RESOURCE_EXHAUSTED') || // Specific HF error
                            error.status === 429 || // Standard Too Many Requests
                            error.name === 'AbortError' || // Fetch AbortError
                            error.message?.includes('timeout') || // General timeout message
                            error.message?.includes('Too Many Requests'); // Another common message
  
        if (isRetryable && attempt < maxRetries - 1) { // Check if retries remain
          const delay = initialDelay * (2 ** attempt); // Exponential backoff
          console.warn(`Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Don't retry for non-retryable errors or if max retries reached
          console.error(`Attempt ${attempt + 1} failed with non-retryable error or max retries reached: ${error.message}`);
          throw error; // Re-throw the last error
        }
      }
    }
  
    // Should theoretically not be reached if maxRetries > 0, but safeguard
    console.error('Max retries reached. Throwing last encountered error.');
    throw lastError;
  }
  
  module.exports = { executeWithRetry };