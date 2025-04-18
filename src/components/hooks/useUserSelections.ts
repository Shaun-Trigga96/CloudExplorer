// src/components/hooks/useUserSelections.ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; // Import AxiosError if needed, but handleError handles 'any'
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { REACT_APP_BASE_URL } from '@env';
// Assuming this is the intended error handler based on its signature
import { handleError } from '../../utils/handleError';

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
    // Include these if needed by UI, otherwise keep minimal
    completedModules: string[];
    completedQuizzes: string[];
    completedExams: string[];
    score: number;
  };
  // Add timestamps/completion status as required by the interface
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
  name: string; // Backend now includes name
  logoUrl?: string; // Backend now includes logoUrl
  progress: {
    completionPercentage: number;
    completedModules: string[];
    completedQuizzes: string[];
    completedExams: string[];
    score: number;
  };
  startedAt: string | null; // Timestamps are likely ISO strings
  lastAccessedAt: string | null;
  completed: boolean;
  completedAt: string | null;
  // Include totals if backend sends them
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
      totalExamsCompleted: number; // Added based on backend
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
        activePath: { // Backend returns the active path info
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
  // State now uses the more detailed LearningPath type
  const [activeLearningPath, setActiveLearningPath] = useState<LearningPath | null>(null);
  const [allLearningPaths, setAllLearningPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // Store userId

  // Fetch User ID effect
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        console.log('')
        if (storedUserId) {
          setUserId(storedUserId);
          console.log('[useUserSelections] User ID loaded:', storedUserId);
        } else {
          console.warn('[useUserSelections] User ID not found in storage.');
          setError('User ID not found. Please log in.');
          navigation.navigate('Auth'); // Redirect if no user ID
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
    // Don't fetch if userId isn't loaded yet
    if (!userId) {
      console.log('[useUserSelections] Waiting for userId to fetch selections...');
      // Set loading true only if userId exists but data isn't fetched yet
      if (!loading && allLearningPaths.length === 0) setLoading(true);
      return;
    }

    console.log(`[useUserSelections] Fetching selections for userId: ${userId}`);
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<UserProgressResponse>(
        `${BASE_URL}/api/v1/user/${userId}/progress` // Use the stored userId
      );
      console.log('[useUserSelections] Progress response status:', response.data.status);
      console.log('[useUserSelections] Progress response data:', JSON.stringify(response.data.data, null, 2)); // Detailed log

      if (response.data.status !== 'success') {
        throw new Error(response.data.data?.toString() || 'Failed to fetch user progress');
      }

      if (!response.data.data.userExists) {
        console.warn('[useUserSelections] User does not exist according to backend, navigating to Auth');
        // Maybe clear userId from storage?
        // await AsyncStorage.removeItem('userId');
        navigation.navigate('Auth');
        return;
      }

      // Transform API paths to the format expected by components
      const fetchedPaths: LearningPath[] = response.data.data.learningPaths.map((path) => ({
        id: path.id, // Use the learning path instance ID from backend
        name: path.name || `Path ${path.pathId}`, // Use name from backend
        providerId: path.providerId,
        pathId: path.pathId,
        logoUrl: path.logoUrl, // Use logoUrl from backend
        progress: {
          // Use percentage directly from backend if available, otherwise default
          completionPercentage: path.progress?.completionPercentage ?? 0,
          // Map other progress details if needed by UI
          completedModules: path.progress?.completedModules || [],
          completedQuizzes: path.progress?.completedQuizzes || [],
          completedExams: path.progress?.completedExams || [],
          score: path.progress?.score || 0,
        },
        // *** FIX: Add the missing properties from the ApiLearningPath ***
        startedAt: path.startedAt,
        lastAccessedAt: path.lastAccessedAt,
        completed: path.completed,
        completedAt: path.completedAt,
      }));

      setAllLearningPaths(fetchedPaths);

      // Determine active path: Backend orders by lastAccessedAt desc. The first item is the most recent.
      const mostRecentPath = fetchedPaths.length > 0 ? fetchedPaths[0] : null;
      setActiveLearningPath(mostRecentPath);

      console.log(
        `[useUserSelections] Fetched ${fetchedPaths.length} learning paths. Active path ID: ${mostRecentPath?.id}`
      );
    } catch (err: any) {
      console.error('[useUserSelections] Error fetching selections:', err);
      // *** FIX: Call handleError correctly (it sets error state internally) ***
      handleError(err, setError);
      // Avoid navigating away if it's just a fetch error, unless it's specifically a 401/403
      if (err.response?.status === 401 || err.response?.status === 403) {
         console.warn('[useUserSelections] Unauthorized access, navigating to Auth');
         navigation.navigate('Auth');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, navigation]); // Depend on userId

  // Effect to trigger fetchSelections when userId is available
  useEffect(() => {
    if (userId) {
      fetchSelections();
    }
  }, [userId, fetchSelections]); // Run when userId changes or fetchSelections definition changes


  // --- Start a New Learning Path ---
  const startNewPath = useCallback(
    async (providerId: string, pathId: string): Promise<void> => { // Return Promise<void>
      if (!userId) {
        console.error('[useUserSelections] Cannot start path: userId is null');
        throw new Error('User session is not available. Please log in.');
      }
      setError(null); // Clear previous errors
      console.log(`[useUserSelections] Attempting to start path: userId=${userId}, providerId=${providerId}, pathId=${pathId}`);

      try {
        // Call the CORRECT backend endpoint
        const response = await axios.post<StartPathResponse>(
          `${BASE_URL}/api/v1/user/${userId}/paths`, // Correct endpoint
          { providerId, pathId } // Correct body
        );

        console.log('[useUserSelections] Start path response status:', response.data.status);
        console.log('[useUserSelections] Start path response data:', response.data.data);

        if (response.data.status !== 'success') {
          // Throw error with message from backend if available
          throw new Error(response.data.message || 'Server responded with an error');
        }

        // Backend handles creating or activating. Refresh selections to get the latest state.
        await fetchSelections();

        // No need for optimistic update here, fetchSelections will update the state correctly.
        // The HomeScreen will navigate based on the refreshed state from fetchSelections.

      } catch (err: any) {
        console.error('[useUserSelections] Error starting new path:', err);
        // *** FIX: Call handleError correctly ***
        handleError(err, setError); // Show alert, set state
        // Re-throw a generic message or derive one if needed for the calling component
        const messageForThrow = (err instanceof Error ? err.message : null) || 'Failed to start learning path';
        throw new Error(messageForThrow);
      }
    },
    [userId, fetchSelections] // Depend on userId and fetchSelections
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
        const response = await axios.post<ActivatePathResponse>(
          `${BASE_URL}/api/v1/user/${userId}/paths/${learningPathId}/activate` // Correct endpoint
          // No body needed for this request based on the backend controller
        );

        console.log('[useUserSelections] Set active path response status:', response.data.status);

        if (response.data.status !== 'success') {
          throw new Error(response.data.message || 'Server responded with an error');
        }

        // Refresh selections to reflect the change in lastAccessedAt and potentially active status
        await fetchSelections();

      } catch (err: any) {
        console.error('[useUserSelections] Error setting active path:', err);
        // *** FIX: Call handleError correctly ***
        handleError(err, setError); // Show alert, set state
        // Re-throw a generic message or derive one if needed for the calling component
        const messageForThrow = (err instanceof Error ? err.message : null) || 'Failed to activate learning path';
        throw new Error(messageForThrow);
      }
    },
    [userId, fetchSelections]
  );


  // --- Refresh Selections Manually ---
  const refreshSelections = useCallback(() => {
    console.log('[useUserSelections] Manual refresh triggered');
    if (userId) { // Only refresh if userId is available
        fetchSelections();
    } else {
        console.warn('[useUserSelections] Cannot refresh: userId is null');
    }
  }, [userId, fetchSelections]); // Depend on userId


  return {
    activeLearningPath,
    allLearningPaths,
    loading,
    error,
    startNewPath, // Use the corrected function
    setActivePath, // Expose the new function
    // Determine hasActivePath based on whether activeLearningPath is set after fetch
    hasActivePath: !!activeLearningPath,
    refreshSelections,
  };
};
