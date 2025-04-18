export interface Module {
    id: string;
    title: string;
    description: string;
  }
  
  export interface Section {
    title: string;
    id: string;
    content: string;
  }

  interface Answer {
    letter: string;
    answer: string;
    uniqueKey: string;
  }
  
  interface QuestionType {
    question: string;
    answers: Answer[];
    correctAnswer: string;
    explanation: string;
  }
  
  interface Quiz extends QuestionType {
    id: number;
  }
  