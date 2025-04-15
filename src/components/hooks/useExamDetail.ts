// src/hooks/useExam.ts
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { REACT_APP_BASE_URL } from '@env';
import { Question, ExamResult, ExamTimingData } from '../../types/exam';

const BASE_URL = REACT_APP_BASE_URL;

interface UseExamReturn {
  questions: Question[];
  loading: boolean;
  error: string | null;
  retryCount: number;
  userAnswers: Record<number, string>;
  currentQuestionIndex: number;
  examCompleted: boolean;
  examResult: ExamResult | null;
  examStarted: boolean;
  examTiming: ExamTimingData | null;
  setUserAnswers: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  setCurrentQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
  setExamCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  setExamStarted: React.Dispatch<React.SetStateAction<boolean>>;
  fetchExamQuestions: () => Promise<void>;
  processExamSubmission: () => Promise<void>;
  submitExam: () => void;
  startExam: () => void;
  handleAnswerSelection: (questionId: number, answerLetter: string) => void;
  navigateToNextQuestion: () => void;
  navigateToPreviousQuestion: () => void;
  navigateToQuestion: (index: number) => void;
}

export const useExam = (examId: string, navigation: any): UseExamReturn => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [examCompleted, setExamCompleted] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [examTiming, setExamTiming] = useState<ExamTimingData | null>(null);

  const fetchExamQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${BASE_URL}/api/v1/exams/${examId}`);
      if (response.data && response.data.questions) {
        setQuestions(response.data.questions);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      let errorMessage = 'Failed to load exam questions. Please try again.';
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection.';
      } else if (err.response) {
        errorMessage = err.response.status === 404
          ? 'Exam not found.'
          : `Server error (${err.response.status}).`;
      } else if (err.request) {
        errorMessage = 'No response from server.';
      }
      setError(errorMessage);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const processExamSubmission = useCallback(async () => {
    try {
      setExamCompleted(true);
      let correctAnswers = 0;
      const answeredQuestions = questions.map(question => {
        const userAnswer = userAnswers[question.id] || '';
        const isCorrect = userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
        if (isCorrect) correctAnswers++;
        return {
          ...question,
          userAnswer,
          isCorrect,
        };
      });

      const score = (correctAnswers / questions.length) * 100;
      const isPassed = score >= 70;

      const result: ExamResult = {
        totalQuestions: questions.length,
        correctAnswers,
        score,
        isPassed,
        answeredQuestions: answeredQuestions.map(question => ({
          question: question.question,
          userAnswer: question.userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect: question.isCorrect,
          explanation: question.explanation.join('\n'), // Join the explanation array into a single string
        })),

      };

      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        Alert.alert('Error', 'User ID not found. Please log in again.');
        return;
      }

      const maxRetries = 3;
      let retryCount = 0;
      let success = false;

      while (retryCount < maxRetries && !success) {
        try {
          const response = await axios.post(`${BASE_URL}/api/v1/exams/save-result`, {
            examId,
            result,
            userId,
          });
          result.timestamp = response.data.timestamp;
          success = true;
        } catch (error: any) {
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!success) {
        Alert.alert('Warning', 'Failed to save results to server.');
      } else {
        Alert.alert('Success', 'Exam submitted successfully.');
      }

      setExamResult(result);
      await AsyncStorage.removeItem(`exam_${examId}_state`);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit exam.');
    }
  }, [examId, questions, userAnswers]);

  const submitExam = useCallback(() => {
    if (Object.keys(userAnswers).length < questions.length) {
      Alert.alert(
        'Incomplete Exam',
        `You've answered ${Object.keys(userAnswers).length} of ${questions.length} questions. Submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: processExamSubmission },
        ]
      );
    } else {
      processExamSubmission();
    }
  }, [userAnswers, questions, processExamSubmission]);

  const startExam = () => {
    const startTime = new Date();
    setExamStarted(true);
    setExamTiming({
      startTime: startTime.toISOString(),
      timeSpent: 0,
    });
  };

  const handleAnswerSelection = (questionId: number, answerLetter: string) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: answerLetter }));
  };

  const navigateToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const navigateToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const navigateToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  useEffect(() => {
    const loadSavedExamState = async () => {
      try {
        const savedExamState = await AsyncStorage.getItem(`exam_${examId}_state`);
        if (savedExamState) {
          const parsedState = JSON.parse(savedExamState);
          setUserAnswers(parsedState.userAnswers || {});
          setCurrentQuestionIndex(parsedState.currentQuestionIndex || 0);
          setExamTiming(parsedState.examTiming || null);
          if (parsedState.examTiming) {
            setExamStarted(true);
          }
        }
      } catch (error) {
        console.error('Error loading saved exam state:', error);
      }
    };

    loadSavedExamState();
    fetchExamQuestions();
  }, [examId, fetchExamQuestions]);

  useEffect(() => {
    const saveExamState = async () => {
      if (!examStarted || examCompleted) return;
      try {
        const examState = {
          userAnswers,
          currentQuestionIndex,
          examTiming,
        };
        await AsyncStorage.setItem(`exam_${examId}_state`, JSON.stringify(examState));
      } catch (error) {
        console.error('Error saving exam state:', error);
      }
    };

    saveExamState();
  }, [userAnswers, currentQuestionIndex, examTiming, examId, examStarted, examCompleted]);

  return {
    questions,
    loading,
    error,
    retryCount,
    userAnswers,
    currentQuestionIndex,
    examCompleted,
    examResult,
    examStarted,
    examTiming,
    setUserAnswers,
    setCurrentQuestionIndex,
    setExamCompleted,
    setExamStarted,
    fetchExamQuestions,
    processExamSubmission,
    submitExam,
    startExam,
    handleAnswerSelection,
    navigateToNextQuestion,
    navigateToPreviousQuestion,
    navigateToQuestion,
  };
};