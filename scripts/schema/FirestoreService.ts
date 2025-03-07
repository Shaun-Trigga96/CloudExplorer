// scripts/schema/FirestoreService.ts
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

dotenv.config();

async function loadServiceAccount(): Promise<any> {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not defined in .env');
  }

  try {
    // Use process.cwd() to resolve from the project root
    const absolutePath = resolve(process.cwd(), serviceAccountPath);
    console.log('Loading service account from:', absolutePath);
    const serviceAccountJson = await readFile(absolutePath, 'utf8');
    return JSON.parse(serviceAccountJson);
  } catch (error) {
    console.error('Error reading service account file:', error);
    throw error;
  }
}

class FirestoreService {
  private db: admin.firestore.Firestore;

  private constructor(db: admin.firestore.Firestore) {
    this.db = db;
    console.log('Firestore initialized:', !!this.db);
  }

  static async create(): Promise<FirestoreService> {
    const serviceAccount = await loadServiceAccount();
    console.log('Service account loaded:', !!serviceAccount);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    const db = admin.firestore();
    return new FirestoreService(db);
  }

  getCollection(collectionPath: string): admin.firestore.CollectionReference {
    if (!this.db) {
      throw new Error('Firestore database is not initialized');
    }
    return this.db.collection(collectionPath);
  }

  createTimestamp(): admin.firestore.FieldValue {
    return admin.firestore.FieldValue.serverTimestamp();
  }
  getBatch() {

    return this.db.batch();

  }
  getDb() {

    return this.db;

  }
}

export const firestoreService: Promise<FirestoreService> = FirestoreService.create();