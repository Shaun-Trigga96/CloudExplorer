import { google, Auth } from 'googleapis';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables for Node.js
if (typeof process !== 'undefined' && process.env) {
  dotenv.config();
}

const SCOPES = ['https://www.googleapis.com/auth/documents', 'https://www.googleapis.com/auth/drive'];

async function authenticateGoogleDocs(): Promise<Auth.JWT> {
  try {
    const credentialsPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH; // Use Firebase credentials
    if (!credentialsPath) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH not defined in .env');
    }
    const absolutePath = resolve(__dirname, '..', '..', '..', credentialsPath); // Move up 3 levels from dist/src/services
    console.log('Loading Google credentials from:', absolutePath);
    const credentials = require(absolutePath);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    });

    return (await auth.getClient()) as Auth.JWT;
  } catch (error) {
    console.error('Authentication Error:', error);
    throw error;
  }
}

export async function createGoogleDoc(title: string, content: string): Promise<string> {
  const auth = await authenticateGoogleDocs();
  const docs = google.docs({ version: 'v1', auth });

  const document = await docs.documents.create({
    requestBody: { title },
  });

  const documentId = document.data.documentId;
  if (!documentId) {
    throw new Error('Failed to create document: No documentId returned');
  }

  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [
        {
          insertText: {
            location: { index: 1 },
            text: content,
          },
        },
      ],
    },
  });

  return `https://docs.google.com/document/d/${documentId}/edit`;
}

export async function getGoogleDocContent(docUrl: string): Promise<any> {
  const auth = await authenticateGoogleDocs();
  const docs = google.docs({ version: 'v1', auth });

  const docId = docUrl.split('/d/')[1]?.split('/edit')[0];
  if (!docId) {
    throw new Error('Invalid Google Doc URL');
  }

  const response = await docs.documents.get({ documentId: docId });
  return response.data.body?.content || [];
}