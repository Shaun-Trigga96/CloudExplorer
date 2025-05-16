// src/hooks/useExams.ts
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_BASE_URL } from '@env';
import { Exam } from '../../types/exam';
import { handleError } from '../../utils/handleError'; // Import error handler

const BASE_URL = REACT_APP_BASE_URL;

// --- Define the correct API response structure ---
interface ListExamsApiResponse {
  status: string;
  data: {
    exams: any[]; // Use 'any' for now, or define a more specific raw exam type
    hasMore?: boolean;
    lastId?: string | null;
  };
  message?: string;
}

// --- Define the correct API response structure for Exam History ---
interface ExamHistoryApiResponse {
  status: string;
  data?: { examHistory: any[] }; // History is nested under data.examHistory
  message?: string;
}
interface UseExamsReturn {
  exams: Exam[];
  examAttempts: Record<string, number>;
  examScores: Record<string, number>;
  loading: boolean;
  error: string | null;
  userIdError: string | null;
  getIconForExam: (examId: string) => any;
  refetchExams: () => void;
}

// Make providerId and pathId potentially null to handle initial state
export const useExams = (providerId: string | null, pathId: string | null): UseExamsReturn => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examAttempts, setExamAttempts] = useState<Record<string, number>>({});
  const [examScores, setExamScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(false); // Start false, set true during fetch
  const [error, setError] = useState<string | null>(null);
  const [userIdError, setUserIdError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // Store userId in state

  // --- Get Icon ---
  const getIconForExam = useCallback((examId: string) => {
    const iconMap: { [key: string]: any } = {
      'cloud-digital-leader-exam': require('../../assets/images/cloud-digital-leader.png'),
      'aws-certified-cloud-practitioner-exam': require('../../assets/images/cloud-practitioner.png'),
      // Add other mappings as needed
    };
    return iconMap[examId] || require('../../assets/images/cloud_generic.png');
  }, []);

  // --- Fetch User ID ---
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
          setUserIdError(null); // Clear user ID error if found
          console.log('[useExams] Loaded userId:', storedUserId);
        } else {
          console.warn('[useExams] userId not found in storage.');
          setUserIdError('User ID not found. Please log in.');
          setUserId(null); // Ensure userId state is null
          setExams([]); // Clear exams if no user
          setExamAttempts({});
          setExamScores({});
        }
      } catch (e) {
        console.error('[useExams] Failed to load userId from storage:', e);
        setUserIdError('Failed to load user session.');
        setUserId(null);
      }
    };
    loadUserId();
  }, []); // Run only once on mount

  // --- Main Data Fetching Logic ---
  const fetchExamsAndProgress = useCallback(async () => {
    // Guard clauses: Don't fetch if required IDs are missing
    if (!userId) {
      console.log('[useExams] Skipping fetch: userId is missing.');
      // Don't set loading if we're not fetching because of missing userId
      // Ensure userIdError is set if userId is missing after initial load attempt
      if (!userIdError) setUserIdError('User session not found. Please log in.');
      setExams([]);
      setExamAttempts({});
      setExamScores({});
      return;
    }
     if (!providerId || !pathId) {
        console.log('[useExams] Skipping fetch: providerId or pathId is missing.');
        setLoading(false); // Ensure loading is false if path isn't selected
        setExams([]); // Clear exams if no path selected
        setExamAttempts({});
        setExamScores({});
        setError(null); // Clear previous path errors
        return;
     }

    console.log(`[useExams] Fetching exams and progress for user: ${userId}, path: ${providerId}/${pathId}`);
    setLoading(true);
    setError(null);
    setUserIdError(null); // Clear errors at start of fetch

    try {
      // --- Fetch Exams for the specific path ---
      const examsUrl = `${BASE_URL}/api/v1/exams/list-exams`;
      console.log(`[useExams] Fetching exams from: ${examsUrl} with params:`, { providerId, pathId });

      const examsResponse = await axios.get<ListExamsApiResponse>(examsUrl, {
        params: { providerId, pathId },
        timeout: 10000,
      });

      console.log('[useExams] Raw examsResponse.data:', JSON.stringify(examsResponse.data, null, 2));

      const fetchedExamsData = examsResponse.data?.data?.exams || [];

      const formattedExams: Exam[] = fetchedExamsData.map((exam: any) => ({
        id: exam.id,
        examId: exam.id,
        title: exam.title,
        description: exam.description,
        providerId: exam.providerId,
        pathId: exam.pathId,
        duration: exam.duration,
        prerequisites: exam.prerequisites,
        associatedModules: exam.associatedModules,
        passingRate: exam.passingRate,
        icon: getIconForExam(exam.id),
        questions: exam.questions?.length || 0, // Use the length of the questions array
      }));
      console.log(`[useExams] Fetched and formatted ${formattedExams.length} exams.`);
      setExams(formattedExams);

      // --- Fetch Exam Progress ---
      // --- FIX: Use the new exam history endpoint ---
      const progressUrl = `${BASE_URL}/api/v1/exams/user/${userId}/exam-history`;
      console.log(`[useExams] Fetching progress from: ${progressUrl}`);
      // --- FIX: Use the correct response type ---
      const progressResponse = await axios.get<ExamHistoryApiResponse>(progressUrl, {
          timeout: 10000,
      });

      // --- FIX: Access the nested examHistory array ---
      const examHistoryData = progressResponse.data?.data?.examHistory;

      if (Array.isArray(examHistoryData)) {
        const attempts: Record<string, number> = {};
        const scores: Record<string, number> = {};
        examHistoryData.forEach((attempt: any) => {
          if (formattedExams.some(exam => exam.examId === attempt.examId)) {
              attempts[attempt.examId] = (attempts[attempt.examId] || 0) + 1;
              if (
                attempt.score !== undefined &&
                typeof attempt.score === 'number' &&
                (!scores[attempt.examId] || attempt.score > scores[attempt.examId])
              ) {
                // Store the highest score (assuming attempt.score is percentage 0-100)
                scores[attempt.examId] = attempt.score;
              }
          }
        });
        console.log('[useExams] Calculated attempts:', attempts);
        console.log('[useExams] Calculated highest scores:', scores);
        setExamAttempts(attempts);
        setExamScores(scores);
      } else {
        console.warn('[useExams] No exam progress data found or invalid format for user:', userId, 'Response data:', progressResponse.data);
        setExamAttempts({});
        setExamScores({});
      }

    } catch (err: any) {
      console.error('[useExams] Error fetching data:', err.response?.data || err.message);
      handleError(err, (msg) => setError(msg || 'Failed to load exam data.'));
      setExams([]);
      setExamAttempts({});
      setExamScores({});
    } finally {
      setLoading(false);
    }
  // --- FIX: Remove userIdError from dependencies ---
  // It's derived state, not an input that should trigger re-fetching directly.
  // The fetch logic already handles the case where userId is missing.
  }, [userId, providerId, pathId, getIconForExam]);
  // --- END FIX ---

  // --- Effect to trigger fetch ---
  useEffect(() => {
    // Fetch only when all required IDs are available
    if (userId && providerId && pathId) {
      console.log('[useExams] useEffect triggered: Fetching exams and progress.');
      fetchExamsAndProgress();
    } else {
       console.log('[useExams] useEffect triggered: Waiting for required IDs.', { userId, providerId, pathId });
       // Reset state if IDs become invalid (e.g., path deselected)
       setExams([]);
       setExamAttempts({});
       setExamScores({});
       setLoading(false); // Ensure loading is false if not fetching
       // Don't clear userIdError here, it's handled by the userId fetch effect
    }
  // --- FIX: Add fetchExamsAndProgress to dependencies ---
  // Ensures the effect re-runs if the fetch function itself changes (though unlikely with useCallback)
  }, [userId, providerId, pathId, fetchExamsAndProgress]);
  // --- END FIX ---

  // --- Implement the refetch function ---
  const refetchExams = useCallback(() => {
    console.log('[useExams] Manual refetch triggered.');
    // Simply call the main fetching logic function
    fetchExamsAndProgress();
  // --- FIX: Add fetchExamsAndProgress as dependency ---
  // Ensures refetchExams is stable if fetchExamsAndProgress is stable
  }, [fetchExamsAndProgress]);
  // --- END FIX ---

  return {
    exams,
    examAttempts,
    examScores,
    loading,
    error,
    userIdError,
    getIconForExam,
    refetchExams, // Return the implemented function
  };
};
