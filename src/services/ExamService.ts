import { FirestoreClient, firestoreClient } from './FirestoreClient';

export class ExamService {
  private firestore: FirestoreClient;

  constructor(firestore: FirestoreClient = firestoreClient) {
    this.firestore = firestore;
  }

  async getAllExams(): Promise<any[]> {
    try {
      const snapshot = await this.firestore.getCollection('exams').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error fetching exams:', error);
      throw error;
    }
  }

  async submitExamAttempt(userId: string, examId: string, answers: any[], score: number): Promise<boolean> {
    try {
      const batch = this.firestore.createBatch();

      const userRef = this.firestore.getCollection('users').doc(userId);
      batch.update(userRef, {
        [`learningProgress.exams.${examId}`]: {
          completed: true,
          score,
          lastAttempt: this.firestore.getTimestamp(),
          attempts: this.firestore.getIncrement()(1),
        },
      });

      const attemptRef = this.firestore
        .getCollection('users')
        .doc(userId)
        .collection('examAttempts')
        .doc();
      batch.set(attemptRef, {
        examId,
        answers,
        score,
        timestamp: this.firestore.getTimestamp(),
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error submitting exam attempt:', error);
      throw error;
    }
  }
}

export const examService = new ExamService();