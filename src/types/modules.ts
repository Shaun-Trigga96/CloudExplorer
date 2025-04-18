export interface ApiModule {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  duration: string | null;
  quizzes: string[];
  prerequisites: string[];
  providerId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface UserProgressResponse {
  userExists: boolean;
  overallProgress: {
    totalModulesCompleted: number;
    totalQuizzesCompleted: number;
    totalScore: number;
  };
  learningPaths: Array<{
    id: string;
    providerId: string;
    pathId: string;
    learningProgress: {
      completedModules: string[];
      completedQuizzes: string[];
      completedExams: string[];
      score: number;
    };
  }>;
  quizResults: Array<{
    id: string;
    moduleId: string | null;
    quizId: string;
    percentage: number;
  }>;
}

export interface ListModulesResponse {
  status: string;
  data: {
    modules: ApiModule[];
    hasMore: boolean;
    lastId: string | null;
  };
}