// c:\Users\thabi\Desktop\CloudExplorer\backend\controllers\moduleController.js
const admin = require('firebase-admin');
const AppError = require('../utils/appError');

const db = admin.firestore();

exports.listModules = async (req, res, next) => {
  console.log('Fetching modules with query params:', req.query); // Log incoming query params
  try {
    const {
      limit = 20,
      lastId,
      orderBy = 'order',
      orderDir = 'asc',
      providerId,
      pathId,
    } = req.query;

    // --- Input Validation ---
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
      return next(new AppError('Limit must be between 1 and 50', 400, 'INVALID_LIMIT'));
    }
    const validOrderBy = ['title', 'createdAt', 'updatedAt', 'duration', 'order'];
    const validOrderDir = ['asc', 'desc'];
    if (!validOrderBy.includes(orderBy) || !validOrderDir.includes(orderDir)) {
      return next(new AppError('Invalid orderBy or orderDir parameter', 400, 'INVALID_SORT'));
    }
    if (lastId && typeof lastId !== 'string') {
      return next(new AppError('lastId must be a valid string', 400, 'INVALID_LAST_ID'));
    }
    if (providerId && typeof providerId !== 'string') {
      return next(new AppError('providerId must be a valid string if provided', 400, 'INVALID_PROVIDER_ID'));
    }
    if (pathId && typeof pathId !== 'string') {
        return next(new AppError('pathId must be a valid string if provided', 400, 'INVALID_PATH_ID'));
    }

    // --- Build Query ---
    let query = db.collection('modules');

    // --- Filters ---
    if (providerId) {
      console.log(`Filtering modules by learningPath.providerId: ${providerId}`);
      query = query.where('learningPath.providerId', '==', providerId);
    }
    if (pathId) {
        console.log(`Filtering modules by learningPath.pathId: ${pathId}`);
        query = query.where('learningPath.pathId', '==', pathId);
    }

    // Apply sorting and limit AFTER filtering
    query = query.orderBy(orderBy, orderDir).limit(parsedLimit);

    // Apply pagination AFTER filtering and sorting
    if (lastId) {
      const lastDocSnapshot = await db.collection('modules').doc(lastId).get();
      if (!lastDocSnapshot.exists) {
        console.warn(`Pagination lastId '${lastId}' not found. Starting from beginning.`);
      } else {
        console.log(`Paginating modules after document ID: ${lastId}`);
        query = query.startAfter(lastDocSnapshot);
      }
    }

    // --- Execute Query ---
    console.log('Executing Firestore query...'); // Log before executing
    const modulesSnapshot = await query.get();
    console.log(`Firestore query returned ${modulesSnapshot.docs.length} documents.`); // Log how many docs Firestore returned

    const modules = modulesSnapshot.docs.map((doc) => {
      const data = doc.data();
      // console.log(`Mapping doc ID: ${doc.id}`); // Keep this simpler log if needed for debugging

      const learningPathInfo = data.learningPath || {};

      return {
        id: doc.id,
        title: data.title || 'Untitled Module',
        description: data.description || null,
        duration: data.duration || null,
        prerequisites: data.prerequisites || [],
        providerId: learningPathInfo.providerId || null,
        pathId: learningPathInfo.pathId || null,
        order: data.order ?? null,
        createdAt: data.createdAt?.toDate()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
      };
    });

    // --- Pagination Metadata ---
    const newLastId = modules.length > 0 ? modules[modules.length - 1].id : null;
    const hasMore = modules.length === parsedLimit;

    // --- Log Success ---
    console.log(`Mapped ${modules.length} modules (orderBy=${orderBy}, orderDir=${orderDir}) for providerId=${providerId || 'all'}, pathId=${pathId || 'all'}, lastId=${lastId || 'none'}`);

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
      query: req.query
    });
    if (error.code === 'FAILED_PRECONDITION' && error.message.includes('index')) {
         console.error("Firestore index missing for the query:", error.message);
         // IMPORTANT: Check your function logs for a URL to create the index!
         return next(new AppError(`Database query requires a composite index. Please create it in Firestore (check function logs for a link!). The query likely involves filtering on 'learningPath.providerId'/'learningPath.pathId' and ordering by '${orderBy}'. Error: ${error.message}`, 500, 'DB_INDEX_REQUIRED'));
    }
    return next(new AppError(`Failed to list modules: ${error.message}`, 500, 'DB_FETCH_ERROR'));
  }
};

// --- getModuleById remains unchanged ---
exports.getModuleById = async (req, res, next) => {
 try {
   const { moduleId } = req.params;
   if (!moduleId || typeof moduleId !== 'string') {
     return next(new AppError('Valid moduleId parameter is required', 400, 'INVALID_MODULE_ID_PARAM'));
   }
   const moduleDoc = await db.collection('modules').doc(moduleId).get();
   if (!moduleDoc.exists) {
     return next(new AppError(`Module with ID ${moduleId} not found`, 404, 'MODULE_NOT_FOUND'));
   }
   const data = moduleDoc.data();
   const learningPathInfo = data.learningPath || {};
   const module = {
     id: moduleDoc.id,
     title: data.title || 'Untitled Module',
     description: data.description || null,
     duration: data.duration || null,
     quizzes: data.quizzes || [],
     prerequisites: data.prerequisites || [],
     providerId: learningPathInfo.providerId || null,
     pathId: learningPathInfo.pathId || null,
     order: data.order ?? null,
     createdAt: data.createdAt?.toDate()?.toISOString() || null,
     updatedAt: data.updatedAt?.toDate()?.toISOString() || null,
   };
   console.log(`Fetched module ${moduleId}`);
   res.status(200).json({
     status: 'success',
     data: module,
   });
 } catch (error) {
   console.error(`Error fetching module ${req.params.moduleId}:`, {
     message: error.message,
     code: error.code,
   });
   return next(new AppError(`Failed to fetch module: ${error.message}`, 500, 'DB_FETCH_ERROR'));
 }
};

// --- getModuleSections remains unchanged ---
exports.getModuleSections = async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    if (!moduleId || typeof moduleId !== 'string') {
      return next(new AppError('Valid moduleId parameter is required', 400, 'INVALID_MODULE_ID_PARAM'));
    }
    const moduleRef = db.collection('modules').doc(moduleId);
    const moduleDoc = await moduleRef.get();
    if (!moduleDoc.exists) {
      return next(new AppError(`Module with ID ${moduleId} not found`, 404, 'MODULE_NOT_FOUND'));
    }
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
        order: data.order ?? 0,
        durationEstimate: data.durationEstimate || null,
      };
    });
    console.log(`Fetched ${sections.length} sections for module ${moduleId}, ordered by 'order'`);
    res.status(200).json({
      status: 'success',
      data: sections,
    });
  } catch (error) {
    console.error(`Error fetching sections for module ${req.params.moduleId}:`, {
      message: error.message,
      code: error.code,
    });
    return next(new AppError(`Failed to fetch sections: ${error.message}`, 500, 'DB_FETCH_ERROR'));
  }
};
