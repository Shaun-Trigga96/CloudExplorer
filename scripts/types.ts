import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface Exam {
  examId: string;
  title: string;
  description: string;
  content: string;
  duration: number;
  prerequisites?: string[];
  createdAt: Timestamp
  updatedAt: Timestamp
}


export interface User {
  uid: string;
  bio: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  lastLogin: Date;
  learningPaths: LearningPath[];
  overallProgress: {
    totalModulesCompleted: number;
    totalQuizzesCompleted: number;
    totalScore: number;
  };
  settings: {
    notificationsEnabled: boolean;
    darkMode: boolean;
    emailUpdates: boolean,
    syncData: boolean,
    soundEffects: boolean,
  };
}

interface LearningPath {
  providerId: string;      // e.g., 'gcp', 'aws', 'azure'
  pathId: string;          // e.g., 'cdl', 'ace', 'solutions-architect'
  startedAt:  Timestamp | FieldValue
  lastAccessedAt:  Timestamp | FieldValue
  completed: boolean;
  completedAt?:  Timestamp | FieldValue
  learningProgress: {
    completedModules: string[];
    completedQuizzes: string[];
    completedExams: string[];
    score: number;
  };
}

export interface UserSettings {
  notificationsEnabled?: boolean;
  darkMode?: boolean;
  emailUpdates?: boolean;
}

export interface Module {
  moduleId: string; // Unique ID for the module
  title: string;
  description: string;
  content: string; // HTML or Markdown content for the module
  duration: number; // Estimated time to complete the module (in minutes)
  prerequisites?: string[]; // Array of module IDs required to unlock this module (optional)
  quizzes?: string[]; // Array of quiz IDs associated with this module (optional)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  sections?: Section[]; // Array of sections with title, content, and order
}

export interface ModuleWithContent extends Module {
  rawContent: any; // Raw Google Doc content
}

export interface Section {
  title: string;
  content: string;
  order: number;
}

export interface ProgressData {
  id: string;
  data: {
    userId: string;
    quizId: string | null;
    examId: string | null;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completedAt: Date;
  };
}

export interface Notification {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
}

export interface Quiz {
  quizId: string; // Unique ID for the quiz
  moduleId: string; // ID of the associated learning module
  title: string;
  questions: Question[];
  passingScore: number; // Minimum score required to pass the quiz
  createdAt: Date;
  updatedAt: Date;
  content?: string;
}


interface Question { // Assuming structure from AI parser
  id: number;
  explanation: string[];
  answers: Array<{ letter: string; answer: string; uniqueKey?: string }>;
  question: string;
  options: string[];
  correctAnswer: string;
}
