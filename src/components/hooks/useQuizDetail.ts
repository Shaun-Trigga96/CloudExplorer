// src/components/hooks/useQuizDetail.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_BASE_URL } from '@env';
import { QuizDetail, QuestionType, QuizResult } from '../../types/quiz'; // Adjust path
import { Module } from '../../types/moduleDetail'; // Adjust path
import { handleError } from '../../utils/handleError'; // Adjust path

const BASE_URL = REACT_APP_BASE_URL;

// Define expected API response structures
interface QuizDetailResponse {
  status: 'success' | 'error';
  data: {
    quiz: QuizDetail;
    moduleTitle?: string; // Optional: API might return module title
  };
  message?: string;
}

interface ModuleResponse {
    status: 'success' | 'error';
    data: Module; // Assuming Module type has a title
    message?: string;
}

interface SubmitProgressResponse {
    status: 'success' | 'error';
    message?: string;
    // Include any other relevant data returned on submission
}


export const useQuizDetail = (
  moduleId: string,
  providerId: string, // ADDED
  pathId: string,     // ADDED
  quizId: string | undefined, // ADDED (optional, but useful)
  navigation: any // Use specific navigation type if available
) => {
  const [quiz, setQuiz] = useState<QuestionType[] | null>(null);
  const [quizMeta, setQuizMeta] = useState<Omit<QuizDetail, 'questions'> | null>(null); // Store quiz metadata separately
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string | number, string>>({}); // { questionId: answerLetter }
  const [showResults, setShowResults] = useState<boolean>(false);
  const [submittingResults, setSubmittingResults] = useState<boolean>(false);

  const fetchQuizData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setShowResults(false); // Reset results view on fetch
    setUserAnswers({});   // Reset answers
    console.log(`[useQuizDetail] Fetching quiz for module: ${moduleId}, provider: ${providerId}, path: ${pathId}, quizId: ${quizId}`);

    try {
      // --- Determine API endpoint ---
      // Option 1: Fetch by Quiz ID if available (preferred if globally unique)
      // Option 2: Fetch by Module ID (assuming one quiz per module within a path)
      const fetchUrl = quizId
        ? `${BASE_URL}/api/v1/quizzes/${quizId}` // Assumes endpoint exists
        : `${BASE_URL}/api/v1/quizzes/module/${moduleId}`; // Existing endpoint

      console.log(`[useQuizDetail] Using fetch URL: ${fetchUrl}`);
      const response = await axios.get<QuizDetailResponse>(fetchUrl, { timeout: 10000 });

      if (response.data.status !== 'success' || !response.data.data.quiz) {
        throw new Error(response.data.message || 'Failed to load quiz details');
      }

      const { quiz: quizData } = response.data.data;
      const { questions, ...meta } = quizData;

      console.log(`[useQuizDetail] Fetched quiz "${meta.title}" with ${questions.length} questions.`);
      setQuiz(questions);
      setQuizMeta(meta);

      // Fetch module title separately if not included in quiz response
      if (!response.data.data.moduleTitle && meta.moduleId) {
        try {
            const moduleUrl = `${BASE_URL}/api/v1/modules/${meta.moduleId}`;
            const moduleRes = await axios.get<ModuleResponse>(moduleUrl, { timeout: 5001 });
            if (moduleRes.data.status === 'success') {
                setModuleTitle(moduleRes.data.data.title);
            }
        } catch (moduleError) {
            console.warn("[useQuizDetail] Could not fetch module title:", moduleError);
            setModuleTitle(`Module ${meta.moduleId}`); // Fallback title
        }
      } else {
         setModuleTitle(response.data.data.moduleTitle || `Module ${meta.moduleId}`);
      }

    } catch (err: any) {
      console.error('[useQuizDetail] Error fetching quiz data:', err.response?.data || err.message);
      handleError(err, (msg) => setError(msg || 'Failed to load the quiz.'));
      setQuiz(null);
      setQuizMeta(null);
      setModuleTitle(null);
    } finally {
      setLoading(false);
    }
  }, [moduleId, providerId, pathId, quizId]); // Add dependencies

  useEffect(() => {
    fetchQuizData();
    // Optional: Post 'start' action here if needed
    // postProgressUpdate('start');
  }, [fetchQuizData]); // Fetch on mount and when fetchQuizData changes

  const handleAnswer = (questionId: number | string, answerLetter: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answerLetter }));
  };

  const calculateScore = useCallback(() => {
    if (!quiz) return 0;
    return quiz.reduce((score, question) => {
      const correct = question.correctAnswer.toLowerCase();
      const userAnswer = userAnswers[question.id]?.toLowerCase();
      return score + (userAnswer === correct ? 1 : 0);
    }, 0);
  }, [quiz, userAnswers]);

  const isAnswerCorrect = useCallback((questionId: number | string): boolean => {
    const question = quiz?.find(q => q.id === questionId);
    if (!question) return false;
    return userAnswers[questionId]?.toLowerCase() === question.correctAnswer.toLowerCase();
  }, [quiz, userAnswers]);

  const submitQuizResults = useCallback(async () => {
    if (!quiz || !quizMeta) {
      Alert.alert('Error', 'Quiz data is missing.');
      return;
    }
    if (submittingResults) return; // Prevent double submission

    setSubmittingResults(true);
    setError(null); // Clear previous errors

    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      setError('User ID not found. Please log in again.');
      setSubmittingResults(false);
      return;
    }

    const score = calculateScore();
    const totalQuestions = quiz.length;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    const passed = percentage >= (quizMeta.passingScore || 70); // Use fetched passing score, default 70

    console.log(`[useQuizDetail] Submitting results for quiz: ${quizMeta.id}, user: ${userId}`);
    console.log(`[useQuizDetail] Score: ${score}/${totalQuestions} (${percentage}%), Passed: ${passed}`);
    console.log(`[useQuizDetail] Path context: ${providerId}/${pathId}`);

    try {
      const progressUrl = `${BASE_URL}/api/v1/users/${userId}/progress`;
      const payload: Partial<QuizResult> & { resourceType: string; action: string; resourceId: string } = {
        resourceType: 'quiz',
        resourceId: quizMeta.id, // Use the actual quiz ID
        action: 'complete', // Action type
        providerId: providerId, // Include providerId
        pathId: pathId,         // Include pathId
        moduleId: quizMeta.moduleId, // Include moduleId
        score: score,
        percentage: percentage,
        passed: passed,
        answers: userAnswers, // Send the user's answers
        timestamp: new Date().toISOString(), // Use ISO string for consistency
      };

      console.log('[useQuizDetail] Progress payload:', payload);

      const response = await axios.post<SubmitProgressResponse>(progressUrl, payload, { timeout: 10000 });

      if (response.data.status !== 'success') {
        throw new Error(response.data.message || 'Failed to submit quiz results.');
      }

      console.log('[useQuizDetail] Submission successful.');
      setShowResults(true); // Show results card on success

    } catch (err: any) {
      console.error('[useQuizDetail] Error submitting quiz results:', err.response?.data || err.message);
      handleError(err, (msg) => setError(msg || 'Failed to submit results. Please try again.'));
      // Don't show results card on error, keep user on questions
    } finally {
      setSubmittingResults(false);
    }
  }, [quiz, quizMeta, userAnswers, calculateScore, providerId, pathId, submittingResults]); // Add dependencies

  const handleRetry = () => {
    // Reset state and fetch again
    fetchQuizData();
  };

  return {
    quiz, // Array of questions
    quizMeta, // Quiz metadata (title, passingScore etc.)
    loading,
    error,
    moduleTitle,
    userAnswers,
    showResults,
    submittingResults,
    handleAnswer,
    calculateScore,
    isAnswerCorrect,
    submitQuizResults,
    handleRetry,
  };
};
