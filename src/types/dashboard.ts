import { FieldValue, Timestamp } from "@react-native-firebase/firestore";

export interface LearningPath {
  providerId: string;
  pathId: string;
  startedAt: string | null; // Converted to ISO string on frontend
  lastAccessedAt: string | null; // Converted to ISO string on frontend
  completed: boolean;
  completedAt?: string | null; // Converted to ISO string on frontend
  learningProgress: {
    completedModules: string[];
    completedQuizzes: string[];
    completedExams: string[];
    score: number;
  };
}

export interface OverallProgress {
  totalModulesCompleted: number;
  totalQuizzesCompleted: number;
  totalScore: number;
}

  export interface ProgressEntry {
    moduleId: string;
    quizId: string;
    examId: string;
    score: number;
    totalQuestions: number;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
  }
  
  export interface Module {
    id: string;
    title: string;
  }
  
  export interface Quiz {
    id: string;
    title: string;
    moduleId: string;
  }
  
  export interface QuizResult {
    id: string;
    moduleId: string;
    quizId: string; 
    score: number;
    totalQuestions: number;
    percentage: number;
    timestamp: string | null;
  }
  
  export interface Exam {
    id: string;
    title: string;
  }
  
  export interface ExamResult {
    id: string;
    examId: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    timestamp: string | null;
  }
  
  export interface ErrorInfo {
    message: string;
    isIndexError: boolean;
    indexUrl?: string;
  }