// scripts/cleanup-firestore.ts
import * as dotenv from 'dotenv';
import { firestoreService } from './schema/FirestoreService';

dotenv.config();

async function deleteCollection(collectionPath: string): Promise<void> {
  const service = await firestoreService;
  const collectionRef = service.getCollection(collectionPath);
  const snapshot = await collectionRef.get();

  if (snapshot.empty) {
    console.log(`No documents found in ${collectionPath}`);
    return;
  }

  const batch = service.getDb().batch();
  snapshot.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`Deleted all documents in ${collectionPath}`);
}

async function deleteSubcollections(docRef: FirebaseFirestore.DocumentReference): Promise<void> {
  const service = await firestoreService;
  const subcollections = await docRef.listCollections();
  for (const subcollection of subcollections) {
    const subcollectionRef = service.getCollection(`${docRef.path}/${subcollection.id}`);
    const snapshot = await subcollectionRef.get();
    const batch = service.getDb().batch();
    snapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Deleted subcollection ${subcollection.id} under ${docRef.path}`);
  }
}

async function cleanupFirestore(): Promise<void> {
  const service = await firestoreService;
  const collections = ['modules', 'users', 'exams', 'notifications', 'ai_contents', 'progress'];

  try {
    // Delete top-level collections
    for (const collection of collections) {
      await deleteCollection(collection);
    }

    // Delete subcollections under modules (e.g., sections)
    const modulesSnapshot = await service.getCollection('modules').get();
    for (const doc of modulesSnapshot.docs) {
      await deleteSubcollections(doc.ref);
    }

    console.log('Firestore cleanup completed successfully!');
  } catch (error) {
    console.error('Error during Firestore cleanup:', error);
    throw error;
  }
}

cleanupFirestore()
  .then(() => console.log('Cleanup script completed'))
  .catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
  });
