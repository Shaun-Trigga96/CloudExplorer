import { Timestamp } from 'firebase/firestore'; // Import Timestamp directly from firestore

export interface UserProgress {
    userId: string; // ID of the user
    quizId?: string; // ID of the quiz (if applicable)
    examId?: string; // ID of the exam (if applicable)
    score: number; // User's score
    totalQuestions: number; // Total number of questions
    correctAnswers: number; // Number of correct answers
    completedAt: Timestamp; // When the quiz/exam was completed
  }
