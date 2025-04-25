// src/components/hooks/useQuiz.ts
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_BASE_URL } from '@env';
import { Quiz } from '../../types/quiz'; // Ensure Quiz types are imported
import { handleError } from '../../utils/handleError';
// Import BOTH the full response type AND the payload type for progress
import {
  UserProgressResponse as ApiUserProgressResponse, // Full response { status: ..., data?: UserProgressData }
  UserProgressResponse
} from '../../types/modules'; // Adjust path if needed

const BASE_URL = REACT_APP_BASE_URL;

// Interface for the quiz list response (matches DashboardScreen)
interface ListQuizzesResponse {
  status: 'success' | 'error' | 'fail';
  message?: string;
  data?: { // The nested 'data' object
    quizzes: Quiz[]; // Use the final Quiz type here
    hasMore?: boolean;
    lastId?: string | null;
  };
}

// Helper type for a single learning path from the progress payload
type LearningPathProgress = UserProgressResponse['learningPaths'][number];

export const useQuizList = (providerId: string | null, pathId: string | null) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [quizProgress, setQuizProgress] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);

  // Effect to load userId
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
          console.log('[useQuizList] Loaded userId:', storedUserId);
        } else {
          console.warn('[useQuizList] userId not found in storage.');
          setError('User session not found. Please log in.');
        }
      } catch (e) {
        console.error('[useQuizList] Failed to load userId from storage:', e);
        setError('Failed to load user session.');
      }
    };
    loadUserId();
  }, []);

  const fetchQuizzesAndProgress = useCallback(async () => {
    // Guard clause
    if (!providerId || !pathId || !userId) {
      console.log('[useQuizList] Skipping fetch: providerId, pathId, or userId missing/invalid.', { providerId, pathId, userId });
      setQuizzes([]);
      setQuizProgress({});
      if (loading) setLoading(false);
      return;
    }

    console.log(`[useQuizList] Fetching data for path: ${providerId}/${pathId}, user: ${userId}`);
    setLoading(true);
    setError(null);

    let fetchedQuizzes: Quiz[] = []; // Define outside try block

    try {
      // --- Fetch Quizzes ---
      const quizzesUrl = `${BASE_URL}/api/v1/quizzes/list-quizzes`;
      console.log(`[useQuizList] Fetching quizzes from: ${quizzesUrl} with params:`, { providerId, pathId });
      const quizzesResponse = await axios.get<ListQuizzesResponse>(quizzesUrl, {
        params: { providerId, pathId },
        timeout: 10000,
      });
      console.log('[useQuizList] Raw quizzesResponse.data:', JSON.stringify(quizzesResponse.data, null, 2));

      if (quizzesResponse.data.status !== 'success') {
        // Use optional chaining for message if data might be missing
        throw new Error(quizzesResponse.data.message || 'Failed to fetch quizzes');
      }

      // Correctly extract quizzes from the nested structure
      // --- CORRECTED ASSIGNMENT LINE ---
      const fetchedQuizzes = quizzesResponse.data.data?.quizzes || [];
      // --- END CORRECTION ---
      console.log(`[useQuizList] Fetched ${fetchedQuizzes.length} quizzes.`);
      setQuizzes(fetchedQuizzes); // Set state immediately after fetching quizzes

      // --- Fetch User Progress ---
      console.log(`[useQuizList] Fetching progress for user: ${userId}`);
      const progressUrl = `${BASE_URL}/api/v1/users/${userId}/progress`;
      // Use the correct FULL response type
      const progressResponse = await axios.get<ApiUserProgressResponse>(progressUrl, {
        timeout: 10000,
      });

      // Access the nested 'data' object (payload)
      const progressDataPayload = progressResponse.data;

      // Check userExists within the payload
      if (!progressDataPayload?.userExists) {
        // Don't necessarily throw an error, maybe just log and skip progress processing
        console.warn('[useQuizList] User progress data not found or user does not exist in progress.');
        setQuizProgress({}); // Reset progress map
        // setError('User progress data not found.'); // Optionally set error
        // return; // Decide if you want to stop or continue without progress
      } else {
        // --- Determine Quiz Completion Status ---
        const completedQuizIds = new Set<string>();
        // Iterate over learningPaths within the payload
        progressDataPayload.learningPaths?.forEach((path: LearningPathProgress) => {
          if (path.providerId === providerId && path.pathId === pathId) {
            path.progress?.completedQuizzes?.forEach((quizId: string) => {
              if (quizId) completedQuizIds.add(quizId);
            });
          }
        });

        const progressMap: Record<string, boolean> = {};
        // Use the fetchedQuizzes variable which is now correctly populated
        if (Array.isArray(fetchedQuizzes)) {
          // Explicitly type 'quiz' for clarity
          fetchedQuizzes.forEach((quiz: Quiz) => {
            progressMap[quiz.id] = completedQuizIds.has(quiz.id);
          });
        } else {
          // This path should not be reached if extraction is correct
          console.error('[useQuizList] CRITICAL: fetchedQuizzes is not an array before progress mapping!', fetchedQuizzes);
        }
        console.log('[useQuizList] Calculated quiz progress:', progressMap);
        setQuizProgress(progressMap);
      } // End of else block for userExists check

    } catch (err: any) {
      console.error('[useQuizList] Error fetching data:', err.response?.data || err.message);
      handleError(err, (msg: string | null) => setError(msg || 'Failed to load quizzes or progress.'));
      setQuizzes([]); // Clear quizzes on error
      setQuizProgress({}); // Clear progress on error
    } finally {
      setLoading(false);
    }
  }, [providerId, pathId, userId]); // Removed 'loading' from dependencies

  // Effect to trigger fetch
  useEffect(() => {
    if (providerId && pathId && userId) {
      console.log('[useQuizList] useEffect triggered: Fetching quizzes and progress.');
      fetchQuizzesAndProgress();
    } else {
      console.log('[useQuizList] useEffect triggered: Waiting for required IDs.', { providerId, pathId, userId });
      setQuizzes([]);
      setQuizProgress({});
    }
  }, [providerId, pathId, userId]); // Depend only on inputs

  // Refetch function
  const refetch = useCallback(() => {
     console.log('[useQuizList] Manual refetch triggered.');
     fetchQuizzesAndProgress();
  }, [fetchQuizzesAndProgress]); // Depends on the stable fetch function


  return { quizzes, quizProgress, loading, error, refetch };
};
