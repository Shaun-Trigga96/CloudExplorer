import { Timestamp } from 'firebase-admin/firestore';

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
}

