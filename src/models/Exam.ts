export interface Exam{
examId: string, // Unique ID for the exam
  title: string,
  description: string,
  questions: [], // Array of question objects (similar to quizzes)
  passingScore: number, // Minimum score required to pass the exam
  createdAt: Date,
  updatedAt: Date,
}
