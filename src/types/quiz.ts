// src/types/quiz.ts

export interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  icon: any;
  moduleId: string;
}

export interface LearningProgress {
  modulesInProgress?: string[];
  completedModules?: string[];
  completedQuizzes?: { moduleId: string }[];
}

export interface QuizDetail extends Quiz {
  questions: QuestionType[];
  passingScore: number;
}

export interface ApiQuiz {
  id: string;
  title: string;
  description: string;
  moduleId: string;
  icon?: React.FC;
  questions?: any[];
}

export interface UserProgressResponse {
  learningProgress: LearningProgress;
  availableQuizzes: ApiQuiz[];
}

export interface Answer {
  letter: string;
  answer: string;
  uniqueKey: string;
}

export interface QuestionType {
  id: number;
  question: string;
  answers: { uniqueKey: string; letter: string; answer: string }[]; // uniqueKey might just be letter or index
  correctAnswer: string;
  explanation: string;
}

export interface ApiQuiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  moduleId: string;
}

// Optional: Type for quiz results if needed separately
export interface QuizResult {
  quizId: string;
  moduleId: string;
  providerId: string;
  pathId: string;
  userId: string;
  score: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, string>; // { questionId: userAnswerLetter }
 timestamp: any; // Firestore Timestamp or ISO String
}