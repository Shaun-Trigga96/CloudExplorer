export interface LearningProgress {
    completedModules: string[];
    completedQuizzes: string[];
    completedExams: string[];
    modulesInProgress: string[];
    score: number | null;
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