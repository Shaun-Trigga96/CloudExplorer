/**
 * Provider represents a cloud service provider (AWS, Azure, GCP, etc.)
 */
export interface Provider {
  id: string;
  name: string;
  logoUrl: string;
}

/**
 * PathResponse represents the structure of learning paths as returned from the API
 */
export interface PathResponse {
  id: string;
  name: string;
  logoUrl: string;
  description?: string;
  // Add any other fields your backend returns
}

/**
 * LearningPath represents a user's selected learning path with progress information
 */
export interface LearningPath {
    id: string;           // Unique identifier 
    name: string;         // Display name of the path
    providerId: string;   // Reference to the provider
    pathId: string;       // Identifier within the provider's system
    logoUrl?: string;     // Optional logo URL
    progress: {
      completionPercentage: number;  // Overall completion percentage (0-100)
      completedModules: string[];    // IDs of completed modules
      completedQuizzes: string[];    // IDs of completed quizzes
      completedExams: string[];      // IDs of completed exams
      score: number;                 // Overall score
    };
    startedAt: string | null;       // When the user started this path
    lastAccessedAt: string | null;  // When the user last accessed this path
    completed: boolean;             // Whether the path is completed
    completedAt: string | null;     // When the path was completed
  }
/**
 * Raw learning path data structure from API response
 */
export interface ApiLearningPath {
  id: string;
  providerId: string;
  pathId: string;
  name?: string;
  logoUrl?: string;
  learningProgress: {
    completedModules: string[];
    completedQuizzes: string[];
    completedExams: string[];
    score: number;
  };
  startedAt: string | null;
  lastAccessedAt: string | null;
  completed: boolean;
  completedAt: string | null;
}

/**
 * User progress response structure from the API
 */
export interface UserProgressResponse {
  status: string;       // 'success' or 'error'
  data: {
    userExists: boolean;
    learningPaths: LearningPath[];
    overallProgress: {
      totalModulesCompleted: number;
      totalQuizzesCompleted: number;
      totalScore: number;
    };
  };
  message?: string;     // Optional message, especially for errors
}
/**
 * Provider response structure from the API
 */
export interface ProvidersResponse {
  status: string;
  data: {
    providers: Provider[];
  };
}

/**
 * Paths response structure from the API
 */
export interface PathsResponse {
  status: string;
  data: {
    paths: { [providerId: string]: PathResponse[] };
  };
}
