// src/types/quiz.ts
import { ImageSourcePropType } from 'react-native';

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
  answers: Answer[];
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