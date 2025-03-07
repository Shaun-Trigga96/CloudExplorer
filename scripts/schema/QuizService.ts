// backend/services/QuizService.js
import { Quiz } from '../types';
import { firestoreService } from './FirestoreService';
import axios from 'axios';

const BASE_URL: string = process.env.BASE_URL || 'http://localhost:5000';

class QuizService {
   async createQuiz(quiz: Quiz): Promise<void> {
    const service = await firestoreService;
    const { quizId, moduleId, title, questions } = quiz;
    console.log(`Overwriting quiz: ${quizId}`);

    const response = await axios.post(`${BASE_URL}/create-doc`, {
      moduleId: moduleId,
        title: title || 'Default quiz title',
        quizId,
        content: JSON.stringify(questions),
      }).catch(error => {
        console.error('Error creating Google Doc:', error.response ? error.response.data : error.message);
        throw error;
      });
      const { docUrl } = response.data;

      await service.getCollection('quizzes').doc(quizId).set({
        ...quiz,
        content: docUrl,
        createdAt: quiz.createdAt || service.createTimestamp(),
        updatedAt: quiz.updatedAt || service.createTimestamp(),
      }, { merge: false });
    }
  }

export const quizService = new QuizService();
