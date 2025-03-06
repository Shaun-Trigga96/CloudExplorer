import { Timestamp } from 'firebase-admin/firestore';
import { Question } from './Question';

export interface Quiz {
  quizId: string; // Unique ID for the quiz
  moduleId: string; // ID of the associated learning module
  title: string;
  questions: Question[];
  passingScore: number; // Minimum score required to pass the quiz
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
