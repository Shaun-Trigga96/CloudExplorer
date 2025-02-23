export interface LearningProgress {
  completedModules: string[]; // Array of module IDs the user has completed
  completedQuizzes: string[]; // Array of quiz IDs the user has completed
  completedExams: string[]; // Array of exam IDs the user has completed
  score: number; // Overall score across quizzes and exams
  }
