import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface Exam {
  examId: string; // Persistent ID
  title: string;
  description: string;
  duration: number | null;
  prerequisites: string[];
  associatedModules?: string[]; // For AI context generation
  questions?: Question[]; // Store generated questions here
  questionsGeneratedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  passingRate: number;
}

interface Question { // Assuming structure from AI parser
  id: number;
  explanation: string[];
  answers: Array<{ letter: string; answer: string; uniqueKey?: string }>;
  question: string;
  options: string[];
  correctAnswer: string;
}

  export interface User {
    uid: string;
    bio: string;
    email: string;
    displayName: string;
    photoURL?: string;
    createdAt: Date;
    lastLogin: Date;
    learningProgress: {
      completedModules: string[];
      completedQuizzes: string[];
      completedExams: string[];
      score: number;
    };
    settings: {
      notificationsEnabled: boolean;
      darkMode: boolean;
      emailUpdates: boolean,
      syncData: boolean,
      soundEffects: boolean,
    };
  }

  export interface UserSettings {
    notificationsEnabled?: boolean;
    darkMode?: boolean;
    emailUpdates?: boolean;
    syncData: boolean,
    soundEffects: boolean,
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

  interface Section {
    id?: string; // ID will be generated or based on order
    title: string;
    content: string; // Will hold Markdown content
    order: number;
    moduleId?: string; // Link back
    contentPath?: string; // Used temporarily for reading file
  }