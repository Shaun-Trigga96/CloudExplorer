// scripts/schema/ExamService.ts
import axios from 'axios';
import { firestoreService } from './FirestoreService';
import { Exam } from '../../src/types/types';

const BASE_URL: string = process.env.BASE_URL || 'http://localhost:5000';

class ExamService {
  async createExam(exam: Exam): Promise<void> {
    const service = await firestoreService;
    const { examId, title, content } = exam;
    console.log(`Overwriting exam: ${examId}`);

    const response = await axios.post(`${BASE_URL}/create-doc`, {
      title: `${title} Exam`,
      content: content || 'Default exam content',
      examId,
    }).catch(error => {
      console.error('Error creating Google Doc:', error.response ? error.response.data : error.message);
      throw error;
    });
    const { docUrl } = response.data;

    await service.getCollection('exams').doc(examId).set({
      ...exam,
      content: docUrl,
      createdAt: exam.createdAt || service.createTimestamp(),
      updatedAt: exam.updatedAt || service.createTimestamp(),
    }, { merge: false });
  }
}

export const examService = new ExamService();