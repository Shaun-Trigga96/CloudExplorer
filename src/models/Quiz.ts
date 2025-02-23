import { Question } from './Question';
import { Timestamp } from 'firebase/firestore'; // Import Timestamp directly from firestore

export interface Quiz {
  quizId: string; // Unique ID for the quiz
  moduleId: string; // ID of the associated learning module
  title: string;
  questions: Question[];
  passingScore: number; // Minimum score required to pass the quiz
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
