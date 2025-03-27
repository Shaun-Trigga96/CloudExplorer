const admin = require('firebase-admin');
const AppError = require('../utils/appError');
const {serverTimestamp} = require('../utils/firestoreHelpers');

const db = admin.firestore();

// GET /list-modules
exports.listModules = async (req, res, next) => {
  try {
    const {
      limit = 10,
      lastId,
      orderBy = 'updatedAt',
      orderDir = 'desc',
    } = req.query;
    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
      // Sensible max limit
      return next(
        new AppError(
          'Invalid limit value (must be 1-50)',
          400,
          'INVALID_LIMIT',
        ),
      );
    }
    const validOrderBy = ['title', 'createdAt', 'updatedAt', 'duration']; // Allowed sort fields
    const validOrderDir = ['asc', 'desc'];
    if (!validOrderBy.includes(orderBy) || !validOrderDir.includes(orderDir)) {
      return next(
        new AppError(
          'Invalid orderBy or orderDir parameter',
          400,
          'INVALID_SORT',
        ),
      );
    }

    let query = db
      .collection('modules')
      .orderBy(orderBy, orderDir)
      .limit(parsedLimit);

    if (lastId) {
      const lastDocSnapshot = await db.collection('modules').doc(lastId).get();
      if (lastDocSnapshot.exists) {
        query = query.startAfter(lastDocSnapshot); // Use snapshot for pagination cursor
      } else {
        // Don't throw error, just ignore invalid lastId and start from beginning
        console.warn(
          `Pagination lastId '${lastId}' not found. Starting from beginning.`,
        );
        // return next(new AppError('Invalid lastId provided for pagination', 400, 'INVALID_LAST_ID'));
      }
    }

    const modulesSnapshot = await query.get();
    const modules = modulesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description || null,
        content: data.content, // Google Doc URL or other content identifier
        duration: data.duration || null, // e.g., "2 hours", 120 (minutes)
        quizzes: data.quizzes || [], // Array of quiz IDs/references
        prerequisites: data.prerequisites || [], // Array of module IDs
        createdAt: data.createdAt?.toDate() || null,
        updatedAt: data.updatedAt?.toDate() || null,
        // Add other relevant fields like thumbnail URL, tags, etc.
      };
    });

    // Determine the last ID for the next page request
    const newLastId =
      modules.length > 0 ? modules[modules.length - 1].id : null;

    res.json({
      modules,
      hasMore: modules.length === parsedLimit, // If we fetched the max limit, there might be more
      lastId: newLastId,
    });
  } catch (error) {
    console.error('Error listing modules:', error);
    next(error);
  }
};

// GET /module/:id
exports.getModuleById = async (req, res, next) => {
  try {
    const moduleId = req.params.id;
    if (!moduleId || typeof moduleId !== 'string') {
      return next(
        new AppError(
          'Invalid module ID parameter',
          400,
          'INVALID_MODULE_ID_PARAM',
        ),
      );
    }
    const moduleDoc = await db.collection('modules').doc(moduleId).get();

    if (!moduleDoc.exists) {
      return next(
        new AppError(
          `Module with ID ${moduleId} not found`,
          404,
          'MODULE_NOT_FOUND',
        ),
      );
    }

    const data = moduleDoc.data();
    res.json({
      id: moduleDoc.id,
      title: data.title,
      description: data.description || null,
      content: data.content,
      duration: data.duration || null,
      quizzes: data.quizzes || [],
      prerequisites: data.prerequisites || [],
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null,
      // Include other fields as needed
    });
  } catch (error) {
    console.error(`Error getting module by ID ${req.params.id}:`, error);
    next(error);
  }
};

// GET /module/:id/sections
exports.getModuleSections = async (req, res, next) => {
  try {
    const moduleId = req.params.id;
    if (!moduleId || typeof moduleId !== 'string') {
      return next(
        new AppError(
          'Invalid module ID parameter',
          400,
          'INVALID_MODULE_ID_PARAM',
        ),
      );
    }

    const moduleRef = db.collection('modules').doc(moduleId);
    const moduleDoc = await moduleRef.get(); // Check if module exists
    if (!moduleDoc.exists) {
      return next(
        new AppError(
          `Module with ID ${moduleId} not found`,
          404,
          'MODULE_NOT_FOUND',
        ),
      );
    }

    const sectionsSnapshot = await moduleRef
      .collection('sections')
      .orderBy('order', 'asc') // Assume 'order' field exists for sorting
      .get();

    const sections = sectionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        content: data.content, // Could be text, markdown, video URL, quiz ID etc.
        contentType: data.contentType || 'text', // Indicate type of content
        order: data.order,
        // durationEstimate: data.durationEstimate, // Optional time estimate
      };
    });

    res.json(sections); // Returns empty array [] if no sections, which is fine
  } catch (error) {
    console.error(`Error getting sections for module ${req.params.id}:`, error);
    next(error);
  }
};
