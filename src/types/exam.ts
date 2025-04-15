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

export interface Exam {
  examId: string;
  title: string;
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