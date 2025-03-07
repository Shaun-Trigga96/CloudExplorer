export interface Question {
    questionId: string; // Unique ID for the question
    questionText: string;
    options: string[]; // Array of answer options
    correctAnswer: string; // Correct answer
    explanation: string; // Explanation for the correct answer
  }
