// src/components/hooks/useUserSelections.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { REACT_APP_BASE_URL } from '@env';
import { handleError } from '../../utils/handleError';
import { useActiveLearningPath } from '../../context/ActiveLearningPathContext';

const BASE_URL = REACT_APP_BASE_URL;

// --- Types ---
export interface LearningPath {
  id: string; // This is the user's specific learning path instance ID
  providerId: string;
  pathId: string; // This is the ID of the path definition
  name: string;
  logoUrl?: string;
  progress: {
    completionPercentage: number;
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

// Type matching the backend response from GET /api/v1/user/:userId/progress
export interface ApiLearningPath {
  id: string;
  providerId: string;
  pathId: string;
  name: string;
  logoUrl?: string;
  progress: {
    completionPercentage: number;
    completedModules: string[];
    completedQuizzes: string[];
    completedExams: string[];
    score: number;
  };
  startedAt: string | null;
  lastAccessedAt: string | null;
  completed: boolean;
  completedAt: string | null;
  totalModules?: number;
  totalQuizzes?: number;
  totalExams?: number;
}

interface UserProgressResponse {
  status: string;
  data: {
    userExists: boolean;
    learningPaths: ApiLearningPath[];
    overallProgress: {
      totalModulesCompleted: number;
      totalQuizzesCompleted: number;
      totalExamsCompleted: number;
      totalScore: number;
    };
  };
}

// Type for the response from POST /api/v1/user/:userId/paths
interface StartPathResponse {
    status: string;
    message: string;
    data: {
        learningPathId: string;
        activePath: {
            id: string;
            providerId: string;
            pathId: string;
        }
    };
}

// Type for the response from POST /api/v1/user/:userId/paths/:learningPathId/activate
interface ActivatePathResponse {
    status: string;
    message: string;
    data: {
        activePath: {
            id: string;
            providerId: string;
            pathId: string;
        }
    };
}

export const useUserSelections = (
  navigation: NativeStackNavigationProp<RootStackParamList>
) => {
  // Get access to the ActiveLearningPathContext
  const activeLearningPathContext = useActiveLearningPath();
  
  const [activeLearningPath, setActiveLearningPath] = useState<LearningPath | null>(null);
  const [allLearningPaths, setAllLearningPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch User ID effect
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
          console.log('[useUserSelections] User ID loaded:', storedUserId);
        } else {
          console.warn('[useUserSelections] User ID not found in storage.');
          setError('User ID not found. Please log in.');
          navigation.navigate('Auth');
        }
      } catch (e) {
        console.error('[useUserSelections] Error loading userId:', e);
        setError('Failed to load user session.');
      }
    };
    loadUserId();
  }, [navigation]);

  // --- Fetch User's Learning Paths ---
  const fetchSelections = useCallback(async () => {
    if (!userId) {
      console.log('[useUserSelections] Waiting for userId to fetch selections...');
      if (!loading && allLearningPaths.length === 0) setLoading(true);
      return;
    }

    console.log(`[useUserSelections] Fetching selections for userId: ${userId}`);
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<UserProgressResponse>(
        `${BASE_URL}/api/v1/user/${userId}/progress`
      );
      console.log('[useUserSelections] Progress response status:', response.data.status);
      console.log('[useUserSelections] Progress response data:', JSON.stringify(response.data.data, null, 2));

      if (response.data.status !== 'success') {
        throw new Error(response.data.data?.toString() || 'Failed to fetch user progress');
      }

      if (!response.data.data.userExists) {
        console.warn('[useUserSelections] User does not exist according to backend, navigating to Auth');
        navigation.navigate('Auth');
        return;
      }

      // Transform API paths to the format expected by components
      const fetchedPaths: LearningPath[] = response.data.data.learningPaths.map((path) => ({
        id: path.id,
        name: path.name || `Path ${path.pathId}`,
        providerId: path.providerId,
        pathId: path.pathId,
        logoUrl: path.logoUrl,
        progress: {
          completionPercentage: path.progress?.completionPercentage ?? 0,
          completedModules: path.progress?.completedModules || [],
          completedQuizzes: path.progress?.completedQuizzes || [],
          completedExams: path.progress?.completedExams || [],
          score: path.progress?.score || 0,
        },
        startedAt: path.startedAt,
        lastAccessedAt: path.lastAccessedAt,
        completed: path.completed,
        completedAt: path.completedAt,
      }));

      setAllLearningPaths(fetchedPaths);

      // Determine active path: Backend orders by lastAccessedAt desc. The first item is the most recent.
      const mostRecentPath = fetchedPaths.length > 0 ? fetchedPaths[0] : null;
      setActiveLearningPath(mostRecentPath);

      // Update ActiveLearningPathContext with the active path details
      if (mostRecentPath) {
        activeLearningPathContext.setActivePath(
          mostRecentPath.providerId,
          mostRecentPath.pathId
        );
        console.log('[useUserSelections] Updated ActiveLearningPathContext:', {
          providerId: mostRecentPath.providerId,
          pathId: mostRecentPath.pathId
        });
      }

      console.log(
        `[useUserSelections] Fetched ${fetchedPaths.length} learning paths. Active path ID: ${mostRecentPath?.id}`
      );
    } catch (err: any) {
      console.error('[useUserSelections] Error fetching selections:', err);
      handleError(err, setError);
      if (err.response?.status === 401 || err.response?.status === 403) {
         console.warn('[useUserSelections] Unauthorized access, navigating to Auth');
         navigation.navigate('Auth');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, navigation, activeLearningPathContext]);

  // Effect to trigger fetchSelections when userId is available
  useEffect(() => {
    if (userId) {
      fetchSelections();
    }
  }, [userId, fetchSelections]);

  // --- Start a New Learning Path ---
  const startNewPath = useCallback(
    async (providerId: string, pathId: string): Promise<void> => {
      if (!userId) {
        console.error('[useUserSelections] Cannot start path: userId is null');
        throw new Error('User session is not available. Please log in.');
      }
      setError(null);
      console.log(`[useUserSelections] Attempting to start path: userId=${userId}, providerId=${providerId}, pathId=${pathId}`);

      try {
        const response = await axios.post<StartPathResponse>(
          `${BASE_URL}/api/v1/user/${userId}/paths`,
          { providerId, pathId }
        );

        console.log('[useUserSelections] Start path response status:', response.data.status);
        console.log('[useUserSelections] Start path response data:', response.data.data);

        if (response.data.status !== 'success') {
          throw new Error(response.data.message || 'Server responded with an error');
        }

        // Update the ActiveLearningPathContext before fetching
        activeLearningPathContext.setActivePath(providerId, pathId);
        console.log('[useUserSelections] Updated context after starting new path:', { providerId, pathId });

        // Refresh selections to get updated data
        await fetchSelections();

      } catch (err: any) {
        console.error('[useUserSelections] Error starting new path:', err);
        handleError(err, setError);
        const messageForThrow = (err instanceof Error ? err.message : null) || 'Failed to start learning path';
        throw new Error(messageForThrow);
      }
    },
    [userId, fetchSelections, activeLearningPathContext]
  );

  // --- Set an Existing Path as Active ---
  const setActivePath = useCallback(
    async (learningPathId: string): Promise<void> => {
      if (!userId) {
        console.error('[useUserSelections] Cannot set active path: userId is null');
        throw new Error('User session is not available. Please log in.');
      }
      setError(null);
      console.log(`[useUserSelections] Setting active path: userId=${userId}, learningPathId=${learningPathId}`);

      try {
        // Find the path details before making the API call
        const pathToActivate = allLearningPaths.find(path => path.id === learningPathId);
        if (!pathToActivate) {
          console.error(`[useUserSelections] Path with ID ${learningPathId} not found in allLearningPaths`);
          throw new Error('Learning path not found');
        }

        const response = await axios.post<ActivatePathResponse>(
          `${BASE_URL}/api/v1/user/${userId}/paths/${learningPathId}/activate`
        );

        console.log('[useUserSelections] Set active path response status:', response.data.status);

        if (response.data.status !== 'success') {
          throw new Error(response.data.message || 'Server responded with an error');
        }

        // Update ActiveLearningPathContext with path details
        activeLearningPathContext.setActivePath(
          pathToActivate.providerId,
          pathToActivate.pathId
        );
        console.log('[useUserSelections] Updated context after activating path:', {
          providerId: pathToActivate.providerId,
          pathId: pathToActivate.pathId
        });

        // Update local state for immediate UI reflection
        setActiveLearningPath(pathToActivate);

        // Refresh selections to get updated lastAccessedAt and other changes
        await fetchSelections();

      } catch (err: any) {
        console.error('[useUserSelections] Error setting active path:', err);
        handleError(err, setError);
        const messageForThrow = (err instanceof Error ? err.message : null) || 'Failed to activate learning path';
        throw new Error(messageForThrow);
      }
    },
    [userId, fetchSelections, allLearningPaths, activeLearningPathContext]
  );

  // --- Refresh Selections Manually ---
  const refreshSelections = useCallback(() => {
    console.log('[useUserSelections] Manual refresh triggered');
    if (userId) {
        fetchSelections();
    } else {
        console.warn('[useUserSelections] Cannot refresh: userId is null');
    }
  }, [userId, fetchSelections]);

  return {
    activeLearningPath,
    allLearningPaths,
    loading,
    error,
    startNewPath,
    setActivePath,
    hasActivePath: !!activeLearningPath,
    refreshSelections,
  };
};