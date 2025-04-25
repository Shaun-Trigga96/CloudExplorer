
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

  // src/types/dashboard.ts (or wherever your dashboard types are)
  
  // ... other types like Module, Quiz, Exam, ErrorInfo, etc. ...
  
  // Represents a single Module item from the /modules/list endpoint
  export interface ApiModule {
    id: string;
    title: string;
    description: string | null;
    duration: number | null;
    prerequisites: string[];
    providerId: string | null;
    pathId: string | null;
    order: number | null;
    createdAt: string | null;
    updatedAt: string | null;
  }
  
  // Represents a single Quiz item from the /quizzes/list endpoint
  export interface ApiQuiz {
    id: string;
    title: string;
    moduleId: string; // Assuming quizzes are linked to modules
    providerId: string | null; // Add if returned by API
    pathId: string | null;     // Add if returned by API
    order?: number;            // Optional order
    // Add other relevant fields returned by the list API
  }
  
  // Represents a single Exam item from the /exams/list endpoint
  export interface ApiExam {
    id: string; // Assuming the list returns a unique DB id
    examId: string; // The specific ID like 'cloud-digital-leader-exam'
    title: string;
    providerId: string | null; // Add if returned by API
    pathId: string | null;     // Add if returned by API
    // Add other relevant fields returned by the list API (e.g., description, duration)
  }
  
  // Represents the overall progress summary
  export interface OverallProgress {
    totalModulesCompleted: number;
    totalQuizzesCompleted: number;
    totalExamsCompleted: number; // <-- ADD THIS PROPERTY
    totalScore: number;
  }
  
  // Represents progress within a specific learning path
  export interface LearningPathProgress { // Renamed for clarity if needed
      completionPercentage: number;
      completedModules: string[];
      completedQuizzes: string[];
      completedExams: string[];
      score: number;
  }
  
  // Represents a user's enrolled learning path with progress
  export interface LearningPath {
    id: string;
    name: string;
    providerId: string;
    pathId: string;
    logoUrl: string | null;
    progress: LearningPathProgress; // <-- ADD THIS PROPERTY
    totalModules: number;
    totalQuizzes: number;
    totalExams: number;
    startedAt: string | null;
    lastAccessedAt: string | null;
    completed: boolean;
    completedAt: string | null;
  }
  
  // ... rest of your types ...
  