// src/components/hooks/useQuiz.ts
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_BASE_URL } from '@env';
import { Quiz } from '../../types/quiz'; // Adjust path as needed
import { UserProgressResponse } from '../../types/modules'; // Assuming this contains progress info
import { handleError } from '../../utils/handleError'; // Adjust path

const BASE_URL = REACT_APP_BASE_URL;

// Define the expected API response structure for listing quizzes
interface ListQuizzesResponse {
  status: 'success' | 'error';
  data: {
    quizzes: Quiz[];
    // Add pagination fields if your API supports them (lastId, hasMore)
  };
  message?: string;
}

export const useQuizList = (providerId: string, pathId: string) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quizProgress, setQuizProgress] = useState<Record<string, boolean>>({}); // Tracks completion by quizId or moduleId

  const fetchQuizzesAndProgress = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log(`[useQuizList] Fetching quizzes for provider: ${providerId}, path: ${pathId}`);

    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      setError('User ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      // --- Fetch Quizzes for the specific Learning Path ---
      const quizzesUrl = `${BASE_URL}/api/v1/quizzes/list`; // Assuming this endpoint exists
      console.log(`[useQuizList] Fetching quizzes from: ${quizzesUrl} with params:`, { providerId, pathId });
      const quizzesResponse = await axios.get<ListQuizzesResponse>(quizzesUrl, {
        params: { providerId, pathId }, // <--- THIS IS CRITICAL
        timeout: 10000,
      });

      if (quizzesResponse.data.status !== 'success') {
        throw new Error(quizzesResponse.data.message || 'Failed to fetch quizzes');
      }
      const fetchedQuizzes = quizzesResponse.data.data.quizzes || [];
      console.log(`[useQuizList] Fetched ${fetchedQuizzes.length} quizzes.`);
      setQuizzes(fetchedQuizzes);

      // --- Fetch User Progress ---
      console.log(`[useQuizList] Fetching progress for user: ${userId}`);
      const progressUrl = `${BASE_URL}/api/v1/users/${userId}/progress`;
      const progressResponse = await axios.get<UserProgressResponse>(progressUrl, {
        timeout: 10000,
      });

       if (!progressResponse.data.userExists) {
         setError('User progress data not found.');
         setLoading(false);
         return; // Or handle as needed (e.g., navigate to auth)
       }

      // --- Determine Quiz Completion Status ---
      const completedQuizIds = new Set<string>();
      // Iterate through the user's learning paths to find completed quizzes
      progressResponse.data.learningPaths?.forEach(path => {
        // Check if this path matches the current context (optional, but good practice)
        if (path.providerId === providerId && path.pathId === pathId) {
          path.learningProgress?.completedQuizzes?.forEach(quizId => {
            completedQuizIds.add(quizId);
          });
        }
        // If you want to show completion status regardless of the *current* path context,
        // you can remove the if condition above.
      });

      const progressMap: Record<string, boolean> = {};
      fetchedQuizzes.forEach(quiz => {
        // Use quiz.id (or quiz.quizId) which should be the unique identifier
        progressMap[quiz.id] = completedQuizIds.has(quiz.id);
      });

      console.log('[useQuizList] Calculated quiz progress:', progressMap);
      setQuizProgress(progressMap);

    } catch (err: any) {
      console.error('[useQuizList] Error fetching data:', err.response?.data || err.message);
      handleError(err, (msg) => setError(msg || 'Failed to load quizzes or progress.'));
      setQuizzes([]); // Clear quizzes on error
      setQuizProgress({});
    } finally {
      setLoading(false);
    }
  }, [providerId, pathId]); // Depend on providerId and pathId

  useEffect(() => {
    if (providerId && pathId) {
      fetchQuizzesAndProgress();
    } else {
      // Handle case where providerId or pathId is missing
      setError("Learning path context is missing.");
      setLoading(false);
    }
  }, [fetchQuizzesAndProgress, providerId, pathId]); // Fetch when context changes

  return { quizzes, quizProgress, loading, error, refetch: fetchQuizzesAndProgress };
};
