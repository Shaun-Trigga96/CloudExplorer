export interface LearningProgress {
    modulesInProgress?: string[];
    completedModules?: string[];
    completedQuizzes?: { moduleId: string }[];
  }
  
  export interface ApiModule {
    id: string;
    title: string;
    description: string;
  }
  
  export interface UserProgressResponse {
    learningProgress: LearningProgress;
    availableModules: ApiModule[];
  }