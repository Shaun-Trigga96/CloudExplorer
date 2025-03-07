import { Timestamp } from '@react-native-firebase/firestore';
import { Question } from './Question';

export interface Exam {
  examId: string; // Unique ID for the exam
  moduleId: string; // ID of the associated learning module
  title: string;
  questions: Question[];
  passingScore: number; // Minimum score required to pass the exam
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
