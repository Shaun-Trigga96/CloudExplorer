// src/hooks/useQuiz.ts
import { useState, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { REACT_APP_BASE_URL } from '@env';
import { QuestionType, ApiQuiz } from '../../types/quiz';

const BASE_URL = REACT_APP_BASE_URL;

interface UseQuizReturn {
  quiz: QuestionType[] | null;
  loading: boolean;
  error: string | null;
  moduleTitle: string | null;
  userId: string | null;
  userAnswers: Record<number, string>;
  showResults: boolean;
  submittingResults: boolean;
  setUserAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setShowResults: React.Dispatch<React.SetStateAction<boolean>>;
  handleAnswer: (questionId: number, answerLetter: string) => void;
  calculateScore: () => number;
  isAnswerCorrect: (questionId: number) => boolean;
  submitQuizResults: () => Promise<void>;
  handleRetry: () => void;
}

export const useQuiz = (
  moduleId: string,
  navigation: any,
): UseQuizReturn => {
  const [quiz, setQuiz] = useState<QuestionType[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState<boolean>(false);
  const [submittingResults, setSubmittingResults] = useState<boolean>(false);

  useEffect(() => {
    const getUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
        } else {
          navigation.navigate('Auth');
        }
      } catch (e) {
        console.error('Error getting user ID:', e);
      }
    };

    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      try {
        const moduleResponse = await axios.get(`${BASE_URL}/api/v1/modules/${moduleId}`);
        setModuleTitle(moduleResponse.data.title);
        const quizzesResponse = await axios.get(`${BASE_URL}/api/v1/quizzes/list-quizzes`);
        const quizzes: ApiQuiz[] = quizzesResponse.data.quizzes;
        const currentQuiz = quizzes.find(q => q.moduleId === moduleId);
        if (!currentQuiz) {
          throw new Error(`No quiz found for module ID: ${moduleId}`);
        }
        const quizResponse = await axios.get(`${BASE_URL}/api/v1/quizzes/${currentQuiz.id}`);
        setQuiz(quizResponse.data.questions);
      } catch (error: any) {
        console.error('Error fetching quiz:', error);
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          setError(
            axiosError.response
              ? `Server Error: ${axiosError.response.status} - ${axiosError.response.data || axiosError.response.statusText}`
              : 'Network error: Unable to connect to server.'
          );
        } else {
          setError(`An unexpected error occurred: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    getUserId();
    fetchQuiz();
  }, [moduleId, navigation]);

  const handleAnswer = (questionId: number, answerLetter: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answerLetter }));
  };

  const calculateScore = () => {
    let score = 0;
    if (quiz) {
      quiz.forEach(question => {
        const userAnswer = userAnswers[question.id];
        if (
          userAnswer &&
          userAnswer.toLowerCase() === question.correctAnswer.toLowerCase()
        ) {
          score++;
        }
      });
    }
    return score;
  };

  const isAnswerCorrect = (questionId: number): boolean => {
    if (!quiz) return false;
    const question = quiz.find(q => q.id === questionId);
    if (!question) return false;
    const userAnswer = userAnswers[questionId];
    return (
      userAnswer &&
      userAnswer.toLowerCase() === question.correctAnswer.toLowerCase()
    ) as boolean;
  };

  const submitQuizResults = async () => {
    if (!userId || !quiz) {
      console.error('userId or quiz is null');
      return;
    }
    setSubmittingResults(true);
    try {
      const score = calculateScore();
      await axios.post(`${BASE_URL}/api/v1/quizzes/save-result`, {
        userId,
        moduleId,
        quizId: quiz[0]?.id || '',
        score,
        totalQuestions: quiz.length,
        answers: userAnswers,
        timestamp: new Date().toISOString(),
      });
      setShowResults(true);
    } catch (err) {
      console.error('Error submitting quiz results:', err);
      Alert.alert(
        'Error',
        'Failed to save quiz results.',
        [{ text: 'OK', onPress: () => setShowResults(true) }],
      );
    } finally {
      setSubmittingResults(false);
    }
  };

  const handleRetry = () => {
    setUserAnswers({});
    setShowResults(false);
  };

  return {
    quiz,
    loading,
    error,
    moduleTitle,
    userId,
    userAnswers,
    showResults,
    submittingResults,
    setUserAnswers,
    setShowResults,
    handleAnswer,
    calculateScore,
    isAnswerCorrect,
    submitQuizResults,
    handleRetry,
  };
};