import firestore from '@react-native-firebase/firestore';

export class FirestoreClient {
  private db: FirebaseFirestore.Firestore;

  constructor() {
    this.db = firestore() as unknown as FirebaseFirestore.Firestore;
  }

  getCollection(collection: string) {
    return this.db.collection(collection);
  }

  getTimestamp() {
    return firestore.FieldValue.serverTimestamp();
  }

  getIncrement() {
    return firestore.FieldValue.increment;
  }

  createBatch() {
    return this.db.batch();
  }
}

export const firestoreClient = new FirestoreClient();
