const admin = require('firebase-admin');
const AppError = require('../utils/appError');

const db = admin.firestore();

/**
 * Lists modules with pagination and sorting.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.listModules = async (req, res, next) => {
  console.log('Fetching modules...');
  try {
    const {
      limit = 10,
      lastId,
      orderBy = 'updatedAt',
      orderDir = 'desc',
      providerId, // Optional filter for provider (e.g., 'gcp')
    } = req.query;

    // --- Input Validation ---
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
      return next(new AppError('Limit must be between 1 and 50', 400, 'INVALID_LIMIT'));
    }

    const validOrderBy = ['title', 'createdAt', 'updatedAt', 'duration'];
    const validOrderDir = ['asc', 'desc'];
    if (!validOrderBy.includes(orderBy) || !validOrderDir.includes(orderDir)) {
      return next(new AppError('Invalid orderBy or orderDir parameter', 400, 'INVALID_SORT'));
    }

    if (lastId && typeof lastId !== 'string') {
      return next(new AppError('lastId must be a valid string', 400, 'INVALID_LAST_ID'));
    }

    if (providerId && typeof providerId !== 'string') {
      return next(new AppError('providerId must be a valid string', 400, 'INVALID_PROVIDER_ID'));
    }

    // --- Build Query ---
    let query = db.collection('modules').orderBy(orderBy, orderDir).limit(parsedLimit);

    if (providerId) {
      query = query.where('providerId', '==', providerId);
    }

    if (lastId) {
      const lastDocSnapshot = await db.collection('modules').doc(lastId).get();
      if (!lastDocSnapshot.exists) {
        console.warn(`Pagination lastId '${lastId}' not found. Starting from beginning.`);
      } else {
        query = query.startAfter(lastDocSnapshot);
      }
    }

    // --- Execute Query ---
    const modulesSnapshot = await query.get();
    const modules = modulesSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled Module',
        description: data.description || null,
        content: data.content || null,
        duration: data.duration || null,
        quizzes: data.quizzes || [],
        prerequisites: data.prerequisites || [],
        providerId: data.providerId,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
      };
    });

    // --- Pagination Metadata ---
    const newLastId = modules.length > 0 ? modules[modules.length - 1].id : null;
    const hasMore = modules.length === parsedLimit;

    // --- Log Success ---
    console.log(`Fetched ${modules.length} modules for providerId=${providerId || 'all'}, lastId=${lastId || 'none'}`);

    // --- Send Response ---
    res.status(200).json({
      status: 'success',
      data: {
        modules,
        hasMore,
        lastId: newLastId,
      },
    });
  } catch (error) {
    console.error('Error listing modules:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return next(new AppError(`Failed to list modules: ${error.message}`, 500, 'DB_FETCH_ERROR'));
  }
};

/**
* Retrieves a module by its ID.
* @param {Object} req - Express request object
* @param {Object} res - Express response object
* @param {Function} next - Express next middleware function
*/

exports.getModuleById = async (req, res, next) => {
 try {
   const { moduleId } = req.params;

   // --- Input Validation ---
   if (!moduleId || typeof moduleId !== 'string') {
     return next(new AppError('Valid moduleId parameter is required', 400, 'INVALID_MODULE_ID_PARAM'));
   }

   // --- Fetch Module ---
   const moduleDoc = await db.collection('modules').doc(moduleId).get();

   if (!moduleDoc.exists) {
     return next(new AppError(`Module with ID ${moduleId} not found`, 404, 'MODULE_NOT_FOUND'));
   }

   const data = moduleDoc.data();

   // --- Construct Response ---
   const module = {
     id: moduleDoc.id,
     title: data.title || 'Untitled Module',
     description: data.description || null,
     content: data.content || null,
     duration: data.duration || null,
     quizzes: data.quizzes || [],
     prerequisites: data.prerequisites || [],
     providerId: data.providerId || null,
     createdAt: data.createdAt?.toDate()?.toISOString() || null,
     updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
   };

   // --- Log Success ---
   console.log(`Fetched module ${moduleId}`);

   // --- Send Response ---
   res.status(200).json({
     status: 'success',
     data: module,
   });
 } catch (error) {
   console.error(`Error fetching module ${req.params.moduleId}:`, {
     message: error.message,
     code: error.code,
     stack: error.stack,
   });
   return next(new AppError(`Failed to fetch module: ${error.message}`, 500, 'DB_FETCH_ERROR'));
 }
};

/**
 * Retrieves sections for a specific module, sorted by order.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.getModuleSections = async (req, res, next) => {
  try {
    const { moduleId } = req.params;

    // --- Input Validation ---
    if (!moduleId || typeof moduleId !== 'string') {
      return next(new AppError('Valid moduleId parameter is required', 400, 'INVALID_MODULE_ID_PARAM'));
    }

    // --- Check Module Existence ---
    const moduleRef = db.collection('modules').doc(moduleId);
    const moduleDoc = await moduleRef.get();
    if (!moduleDoc.exists) {
      return next(new AppError(`Module with ID ${moduleId} not found`, 404, 'MODULE_NOT_FOUND'));
    }

    // --- Fetch Sections ---
    const sectionsSnapshot = await moduleRef
      .collection('sections')
      .orderBy('order', 'asc')
      .get();

    const sections = sectionsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        moduleId: data.moduleId || moduleId,
        title: data.title || 'Untitled Section',
        content: data.content || null,
        order: data.order || 0,
        durationEstimate: data.durationEstimate || null,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
      };
    });

    // --- Log Success ---
    console.log(`Fetched ${sections.length} sections for module ${moduleId}`);

    // --- Send Response ---
    res.status(200).json({
      status: 'success',
      data: sections,
    });
  } catch (error) {
    console.error(`Error fetching sections for module ${req.params.moduleId}:`, {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return next(new AppError(`Failed to fetch sections: ${error.message}`, 500, 'DB_FETCH_ERROR'));
  }
};