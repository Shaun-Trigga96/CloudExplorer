import { FirestoreClient, firestoreClient } from './FirestoreClient';

export class QuizService {
  private firestore: FirestoreClient;

  constructor(firestore: FirestoreClient = firestoreClient) {
    this.firestore = firestore;
  }

  async getAllQuizzes(): Promise<any[]> {
    try {
      const snapshot = await this.firestore.getCollection('quizzes').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  }

  async submitQuizAttempt(userId: string, quizId: string, answers: any[], score: number): Promise<boolean> {
    try {
      const batch = this.firestore.createBatch();

      const userRef = this.firestore.getCollection('users').doc(userId);
      batch.update(userRef, {
        [`learningProgress.quizzes.${quizId}`]: {
          completed: true,
          score,
          lastAttempt: this.firestore.getTimestamp(),
          attempts: this.firestore.getIncrement()(1),
        },
      });

      const attemptRef = this.firestore
        .getCollection('users')
        .doc(userId)
        .collection('quizAttempts')
        .doc();
      batch.set(attemptRef, {
        quizId,
        answers,
        score,
        timestamp: this.firestore.getTimestamp(),
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error submitting quiz attempt:', error);
      throw error;
    }
  }
}

export const quizService = new QuizService();