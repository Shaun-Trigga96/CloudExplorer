export interface Quiz {
    quizId: string, // Unique ID for the quiz
  moduleId: string, // ID of the associated learning module
  title: string,
  questions: [
    {
        questionId: string, // Unique ID for the question
        questionText: string,
        options: [], // Array of answer options
        correctAnswer: string, // Correct answer
        explanation: string, // Explanation for the correct answer
      }
  ], // Array of question objects
  passingScore: number, // Minimum score required to pass the quiz
  createdAt: Date,
  updatedAt: Date,
}
