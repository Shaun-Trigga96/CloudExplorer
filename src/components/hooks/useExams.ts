// src/hooks/useExams.ts
import { useState, useEffect, useCallback } from 'react';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_BASE_URL } from '@env';
import { Exam } from '../../types/exam';

const BASE_URL = REACT_APP_BASE_URL;

interface UseExamsReturn {
  exams: Exam[];
  examAttempts: Record<string, number>;
  examScores: Record<string, number>;
  loading: boolean;
  error: string | null;
  userIdError: string | null;
  fetchExamAttempts: (userId: string) => Promise<void>;
  getIconForExam: (examId: string) => any;
}

export const useExams = (): UseExamsReturn => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [examAttempts, setExamAttempts] = useState<Record<string, number>>({});
  const [examScores, setExamScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userIdError, setUserIdError] = useState<string | null>(null);

  const getIconForExam = useCallback((examId: string) => {
    const iconMap: { [key: string]: any } = {
      'cloud-digital-leader-exam': require('../../assets/images/cloud-digital-leader.png'),
      // Add other mappings as needed
    };
    return iconMap[examId] || require('../../assets/images/cloud_generic.png');
  }, []);

  const fetchExamAttempts = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${BASE_URL}/api/v1/exams/progress/${userId}`);
      if (Array.isArray(response.data.examProgress)) {
        const attempts: Record<string, number> = {};
        const scores: Record<string, number> = {};
        response.data.examProgress.forEach((attempt: any) => {
          attempts[attempt.examId] = (attempts[attempt.examId] || 0) + 1;
          if (
            attempt.score !== undefined &&
            typeof attempt.score === 'number' &&
            (!scores[attempt.examId] || attempt.score > scores[attempt.examId])
          ) {
            scores[attempt.examId] = attempt.score;
          }
        });
        setExamAttempts(attempts);
        setExamScores(scores);
      } else {
        console.warn('No exam progress data found for user:', userId);
        setExamAttempts({});
        setExamScores({});
      }
    } catch (error) {
      console.error('Error fetching exam attempts:', error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 404) {
          setExamAttempts({});
          setExamScores({});
        } else {
          setError(
            axiosError.response
              ? `Server Error: ${axiosError.response.status} - ${axiosError.response.data || axiosError.response.statusText}`
              : 'Network error: Unable to connect to server.'
          );
        }
      } else {
        setError(`An unexpected error occurred: ${error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserIdAndExams = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          setUserIdError('User ID not found. Please log in.');
          return;
        }
        await fetchExamAttempts(userId);
        setLoading(true);
        setError(null);
        const response = await axios.get(`${BASE_URL}/api/v1/exams/list-exams`);
        const formattedExams: Exam[] = response.data.exams.map((exam: any) => ({
          examId: exam.id,
          title: exam.title,
          description: exam.description,
          duration: exam.duration,
          prerequisites: exam.prerequisites,
          associatedModules: exam.associatedModules,
          passingRate: exam.passingRate,
          icon: getIconForExam(exam.id),
        }));
        setExams(formattedExams);
      } catch (err) {
        console.error('Error fetching exams:', err);
        if (axios.isAxiosError(err)) {
          const axiosError = err as AxiosError;
          setError(
            axiosError.response
              ? `Server Error: ${axiosError.response.status} - ${axiosError.response.data || axiosError.response.statusText}`
              : 'Network error: Unable to connect to server.'
          );
        } else {
          setError(`An unexpected error occurred: ${err}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserIdAndExams();
  }, [getIconForExam]);

  return {
    exams,
    examAttempts,
    examScores,
    loading,
    error,
    userIdError,
    fetchExamAttempts,
    getIconForExam,
  };
};