// c:\Users\thabi\Desktop\CloudExplorer\src\types\modules.ts

// --- Module Types ---

// Represents a single Module item from the /modules/list endpoint
export interface ApiModule {
  id: string;
  title: string;
  description: string | null;
  duration: number | null;
  prerequisites: string[];
  providerId: string | null;
  pathId: string | null;
  order: number | null;
  createdAt: string | null; // ISO Date string or null
  updatedAt: string | null; // ISO Date string or null
}


// --- User Progress Types ---

// Represents progress within a specific learning path
export interface LearningPathProgressData {
  completionPercentage?: number; // Optional from backend
  completedModules: string[];
  completedQuizzes: string[];
  completedExams: string[];
  score: number;
}

// Represents a user's enrolled learning path within the progress payload
export interface UserLearningPath {
  id: string; // User's specific learning path instance ID
  providerId: string;
  pathId: string; // ID of the path definition (e.g., 'cdl')
  name?: string; // Optional name from backend
  logoUrl?: string; // Optional logo
  progress: LearningPathProgressData; // Use the defined progress type
  totalModules?: number;
  totalQuizzes?: number;
  totalExams?: number;
  startedAt?: string | null;
  lastAccessedAt?: string | null;
  completed?: boolean;
  completedAt?: string | null;
}

// Represents a single quiz result within the progress payload
export interface UserQuizResult {
  id: string; // Result document ID
  moduleId: string | null;
  quizId: string;
  percentage: number;
  // Add other fields if backend sends them (score, timestamp, etc.)
  score?: number;
  timestamp?: string | null; // ISO Date string or null
}

// Represents a single exam result within the progress payload
export interface UserExamResult {
  id: string; // Result document ID
  examId: string;
  percentage: number;
  // Add other fields if backend sends them (score, timestamp, etc.)
  score?: number;
  timestamp?: string | null; // ISO Date string or null
}

// Represents the PAYLOAD inside the 'data' key of the user progress API response
export interface UserProgressData { // Renamed from the original UserProgressResponse
  userExists: boolean;
  overallProgress: {
    totalModulesCompleted: number;
    totalQuizzesCompleted: number;
    totalScore: number;
    totalExamsCompleted?: number; // Keep optional if not always present
  };
  learningPaths: UserLearningPath[]; // Use the defined UserLearningPath type
  quizResults?: UserQuizResult[]; // Optional array using UserQuizResult type
  examResults?: UserExamResult[]; // Optional array using UserExamResult type
}

// Removed the incorrect UserProgressData definition that wrapped UserProgressResponse
export interface ApiModule {
  id: string;
  title: string;
  description: string | null;
  duration: number | null; // CHANGED - Backend sends number or null
  prerequisites: string[];
  providerId: string | null; // Matches learningPathInfo.providerId
  pathId: string | null;     // ADDED - Matches learningPathInfo.pathId
  order: number | null;      // ADDED - Matches data.order
  createdAt: string | null;  // ISO Date string or null
  updatedAt: string | null;  // ISO Date string or null
}


export interface UserProgressResponse {
  userExists: boolean;
  overallProgress: {
    totalModulesCompleted: number;
    totalQuizzesCompleted: number;
    totalScore: number;
    totalExamsCompleted?: number;
  };
  learningPaths: Array<{
    id: string; // User's specific learning path instance ID
    providerId: string;
    pathId: string; // ID of the path definition (e.g., 'cdl')
    name?: string; // Optional name from backend
    logoUrl?: string; // Optional logo
    progress: { // Renamed from learningProgress for consistency if needed
      completionPercentage?: number; // Optional from backend
      completedModules: string[];
      completedQuizzes: string[];
      completedExams: string[];
      score: number;
    };
    // Add other fields if the backend sends them for learningPaths
    totalModules?: number;
    totalQuizzes?: number;
    totalExams?: number;
    startedAt?: string | null;
    lastAccessedAt?: string | null;
    completed?: boolean;
    completedAt?: string | null;
  }>;
  quizResults?: Array<{ // Make optional if not always present
    id: string; // Result document ID
    moduleId: string | null;
    quizId: string;
    percentage: number;
    // Add other fields if backend sends them (score, timestamp, etc.)
  }>;
  // Add examResults if your API sends them
  examResults?: Array<{
      id: string; // Result document ID
      examId: string;
      percentage: number;
      // Add other fields
  }>;
}

export interface UserProgressData {
  status: 'success' | 'error' | 'fail'; // Or other statuses your API uses
  message?: string; // Optional message field
  data?: UserProgressResponse; // The nested data object, matching the interface above
}

export interface ListModulesResponse {
  status: string;
  data: {
    modules: ApiModule[];
    hasMore: boolean;
    lastId: string | null;
  };
}