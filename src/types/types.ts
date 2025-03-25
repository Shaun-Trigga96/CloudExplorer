import admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface Exam {
    examId: string;
    title: string;
    description: string;
    content: string;
    duration: number;
    prerequisites?: string[];
    createdAt: admin.firestore.Timestamp | Date;
    updatedAt: admin.firestore.Timestamp | Date;
}

  export interface User {
    uid: string;
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