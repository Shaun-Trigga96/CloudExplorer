// src/types/exam.ts
import { Timestamp, FieldValue } from '@react-native-firebase/firestore';

export interface Answer {
  letter: string;
  answer: string;
  uniqueKey?: string;
}

// src/types/exam.ts (partial update for the Question interface)
export interface Question {
  id: string; // Changed from number to string for consistency
  explanation: string[];
  answers: Answer[];
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Exam {
  examId: string;
  title: string;
  providerId: string;
  pathId: string;
  description: string;
  duration: number | null; // Duration in minutes
  prerequisites: string[];
  associatedModules?: string[];
  questions?: Question[]; // Optional if fetched separately
  questionsGeneratedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  passingRate: number; // Percentage (e.g., 70)
  icon: any;
  numberOfQuestions?: number; // --- ADDED (Optional if API might not send it) ---
}
// Update ExamResult passingScore source if needed
export interface ExamResult {
  id?: string; // Document ID from Firestore (optional on frontend)
  examId: string;
  providerId: string;
  pathId: string;
  userId: string;
  score: number; // Raw score (correct answers)
  percentage: number; // Calculated percentage
  passed: boolean;
  answers: Record<string, string>;
  totalQuestions: number; // Total questions in the exam
  startTime?: any;
  endTime?: any;
  timeSpent?: number; // in seconds
  timestamp?: any; // Completion timestamp
  // Add answeredQuestions if needed for review within ResultCard
  answeredQuestions?: {
      question: string;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      explanation: string;
  }[];
  // Add passingScore if needed directly on result object
  passingScore?: number; // Percentage threshold
}

export interface ExamTimingData {
  startTime: string;
  timeSpent: number;
}

export interface ExamDetail extends Exam {
  questions: Question[]; // Assuming QuestionType is defined elsewhere
  passingRate: number;
  // ... other detail fields
}

// If you have an ExamResult type
export interface ExamResult {
    examId: string;
    providerId: string; // ADDED
    pathId: string;     // ADDED
    userId: string;
    score: number;
    percentage: number;
    passed: boolean;
    answers: Record<string, string>; // { questionId: userAnswerLetter }
    startTime?: any; // Firestore Timestamp or ISO String
    endTime?: any;   // Firestore Timestamp or ISO String
    timeSpent?: number; // in seconds
    timestamp?: any; // Completion timestamp
}
