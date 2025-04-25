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

  export interface LearningPath {
    id: string;           
    name: string;        
    providerId: string;   
    pathId: string;       
    logoUrl?: string;     
    progress: {
      completionPercentage: number;  
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
    moduleId: string; 
    title: string;
    description: string;
    content: string; 
    duration: number; 
    providerId: string;
    prerequisites?: string[]; 
    quizzes?: string[]; 
    createdAt: Timestamp;
    updatedAt: Timestamp;
    sections?: Section[]; 
}


  interface Section {
    id?: string; // ID will be generated or based on order
    title: string;
    content: string; // Will hold Markdown content
    order: number;
    moduleId?: string; // Link back
    contentPath?: string; // Used temporarily for reading file
  }

  