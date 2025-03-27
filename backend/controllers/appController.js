// Controller for general application routes (like health check)

exports.healthCheck = (req, res, next) => {
  // Optional: Add checks for database connection, essential services, etc.
  // For now, just confirms the server is responding.
  try {
    res.status(200).json({
      status: 'ok',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      node_version: process.version,
      // Add other relevant info if needed
    });
  } catch (error) {
    // Should not fail, but handle just in case
    next(error);
  }
};
