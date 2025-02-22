export interface Progress {
    userId: string, // ID of the user
    quizId: string, // ID of the quiz (if applicable)
    examId: string, // ID of the exam (if applicable)
    score: number, // User's score
    totalQuestions: number, // Total number of questions
    correctAnswers: number, // Number of correct answers
    completedAt: Date, // When the quiz/exam was completed
  }
