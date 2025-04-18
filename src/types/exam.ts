// src/types/exam.ts
import { Timestamp, FieldValue } from '@react-native-firebase/firestore';

export interface Answer {
  letter: string;
  answer: string;
  uniqueKey?: string;
}

export interface Question {
  id: number;
  explanation: string[];
  answers: Answer[];
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Exam {
  examId: string;
  title: string;
  providerId: string; // ADDED
  pathId: string;     // ADDED
  description: string;
  duration: number | null;
  prerequisites: string[];
  associatedModules?: string[];
  questions?: Question[];
  questionsGeneratedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  passingRate: number;
  icon: any;
}

export interface ExamResult {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  isPassed: boolean;
  timestamp?: any;
  answeredQuestions: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }[];
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