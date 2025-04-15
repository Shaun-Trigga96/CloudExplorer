// src/services/quizService.ts
import axios from 'axios';
import { REACT_APP_BASE_URL } from '@env';
import { ApiQuiz, Quiz, UserProgressResponse } from '../types/quiz';
import  iconMap  from '../utils/iconMap';

const BASE_URL = REACT_APP_BASE_URL;

/**
 * Fetches user quiz data including available quizzes and progress
 */
export async function fetchUserQuizData(userId: string): Promise<{ fetchedQuizzes: Quiz[], progress: Record<string, boolean> }> {
  // Fetch the list of available quizzes
  const quizzesResponse = await axios.get<{ quizzes: ApiQuiz[] } | null>(`${BASE_URL}/api/v1/quizzes/list-quizzes`);
  console.log('fetchUserProgress: Quizzes API Response:', quizzesResponse.data);

  let fetchedQuizzes: Quiz[] = [];
  if (quizzesResponse.data && quizzesResponse.data.quizzes && Array.isArray(quizzesResponse.data.quizzes)) {
    fetchedQuizzes = quizzesResponse.data.quizzes.map((quiz: any) => ({
      id: String(quiz.id || ''),
      title: String(quiz.title || ''),
      description: String(quiz.description || ''),
      questionCount: quiz.questions && Array.isArray(quiz.questions) ? quiz.questions.length : 0,
      icon: iconMap[quiz.moduleId],
      moduleId: String(quiz.moduleId || ''),
    }));
  } else {
    console.warn('fetchUserProgress: Invalid quizzes response format.');
    fetchedQuizzes = [];
  }

  // Fetch user progress
  const progressResponse = await axios.get<UserProgressResponse>(
    `${BASE_URL}/api/v1/users/${userId}/progress`,
  );
  console.log('fetchUserProgress: User Progress API Response:', progressResponse.data);
  const { learningProgress } = progressResponse.data;

  const progress: Record<string, boolean> = {};

  if (fetchedQuizzes && fetchedQuizzes.length > 0) {
    fetchedQuizzes.forEach((quiz) => {
      const moduleId = quiz.moduleId;
      const learningData = learningProgress || {};
      const hasCompletedQuiz = learningData.completedQuizzes?.some(
        (completedQuiz) => completedQuiz.moduleId === moduleId,
      );

      console.log(`fetchUserProgress: Quiz ModuleID: ${moduleId}, hasCompletedQuiz: ${hasCompletedQuiz}`);
      progress[moduleId] = !!hasCompletedQuiz;
    });
  }

  return { fetchedQuizzes, progress };
}