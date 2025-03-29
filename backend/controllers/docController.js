const {google} = require('googleapis');
const admin = require('firebase-admin');
const AppError = require('../utils/appError');
const {authenticateGoogleDocs} = require('../utils/googleAuth');
const {serverTimestamp} = require('../utils/firestoreHelpers');

const db = admin.firestore();

// POST /create-doc (Specifically for creating a Module Doc)
exports.createModuleDoc = async (req, res, next) => {
  // Assumes validateModuleInput middleware has run
  try {
    const {moduleId, title, description, duration, content = ''} = req.body;
    const auth = await authenticateGoogleDocs();
    const docs = google.docs({version: 'v1', auth});

    console.log(`Creating Google Doc for Module: ${moduleId}, Title: ${title}`);

    // 1. Create the Google Doc
    const document = await docs.documents.create({requestBody: {title}});
    const documentId = document.data.documentId;

    if (!documentId) {
      console.error('Google Docs API did not return a documentId.');
      return next(
        new AppError(
          'Failed to create Google document',
          500,
          'DOC_CREATION_FAILED',
        ),
      );
    }
    console.log(`Google Doc created with ID: ${documentId}`);
    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;

    // 2. Add content to Google Doc if provided
    if (content && content.trim() !== '') {
      console.log(`Adding content to doc: ${documentId}`);
      try {
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [{insertText: {location: {index: 1}, text: content}}],
          },
        });
        console.log(`Content added successfully to ${documentId}.`);
      } catch (updateError) {
        console.error(
          `Failed to add content to Google Doc ${documentId}:`,
          updateError,
        );
        // Decide if this is critical - maybe proceed but log the error?
        // For now, we'll proceed but the doc will be empty or partially filled if other updates existed.
      }
    } else {
      console.log(`No initial content provided for doc ${documentId}.`);
    }

    // 3. Save module metadata (including the Doc URL) to Firestore
    console.log(`Saving module ${moduleId} to Firestore with URL: ${docUrl}`);
    const moduleData = {
      title: title,
      content: docUrl, // Store the Google Doc URL as the primary content
      contentType: 'google_doc', // Indicate content type
      description: description || null,
      duration: duration || null,
      updatedAt: serverTimestamp(),
      // createdAt will be set on first write if not present due to merge:true potentially
    };

    await db.collection('modules').doc(moduleId).set(moduleData, {merge: true});
    console.log(`Module ${moduleId} saved/updated in Firestore.`);

    // 4. Respond to client
    res.status(201).json({
      // 201 Created
      moduleId: moduleId,
      title: title,
      documentId: documentId,
      docUrl: docUrl,
      message: 'Module document created and saved successfully.',
    });
  } catch (error) {
    console.error(
      `Error in createModuleDoc for module ${req.body.moduleId}:`,
      error,
    );
    // Specific Google API error checks
    if (error.code === 403 || error.message?.includes('permission')) {
      return next(
        new AppError(
          'Permission denied for Google Docs API. Check service account permissions.',
          403,
          'GOOGLE_DOCS_PERMISSION',
        ),
      );
    }
    if (error.code === 429 || error.message?.includes('Quota')) {
      return next(
        new AppError(
          'Google Docs API quota exceeded. Please try again later.',
          429,
          'GOOGLE_QUOTA_EXCEEDED',
        ),
      );
    }
    if (error.code === 400 && error.message?.includes('Invalid')) {
      return next(
        new AppError(
          `Invalid request to Google Docs API: ${error.message}`,
          400,
          'GOOGLE_DOCS_BAD_REQUEST',
        ),
      );
    }
    next(error); // Pass to generic error handler
  }
};

// GET /get-doc-content/:docId
exports.getDocContent = async (req, res, next) => {
  try {
    const {docId} = req.params;

    if (!docId || typeof docId !== 'string' || docId.trim() === '') {
      return next(
        new AppError(
          'Invalid Google Document ID parameter',
          400,
          'INVALID_DOC_ID_PARAM',
        ),
      );
    }

    const auth = await authenticateGoogleDocs();
    const docs = google.docs({version: 'v1', auth});

    console.log(`Workspaceing content for Google Doc ID: ${docId}`);

    const response = await docs.documents.get({
      documentId: docId,
      fields: 'body(content)', // Fetch only the body content for efficiency
    });

    // Check if body or content exists - Google Docs API might return empty body for empty docs
    const content = response?.data?.body?.content || []; // Default to empty array if no content

    console.log(`Successfully fetched content (or empty) for Doc ID: ${docId}`);

    res.json({content}); // Return the array of StructuralElements
  } catch (error) {
    console.error(
      `Error fetching doc content for ID ${req.params.docId}:`,
      error,
    );
    if (
      error.code === 404 ||
      error.message?.includes('Requested entity was not found')
    ) {
      return next(
        new AppError(
          `Google Document not found with ID: ${req.params.docId}`,
          404,
          'GOOGLE_DOC_NOT_FOUND',
        ),
      );
    }
    if (error.code === 403 || error.message?.includes('permission')) {
      return next(
        new AppError(
          `Permission denied to access Google Document: ${req.params.docId}`,
          403,
          'GOOGLE_DOC_PERMISSION_DENIED',
        ),
      );
    }
    if (error.code === 400) {
      return next(
        new AppError(
          `Invalid request for Google Document ${req.params.docId}: ${error.message}`,
          400,
          'GOOGLE_DOC_BAD_REQUEST',
        ),
      );
    }
    next(error);
  }
};
