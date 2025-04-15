// src/screens/QuizzesScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Text } from 'react-native-paper';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import { REACT_APP_BASE_URL } from '@env';
import strings from '../localization/strings';
import { handleError } from '../utils/handleError';
import { fetchUserQuizData } from '../services/QuizService';
import QuizCard from '../components/quizzes/QuizCard';
import { Quiz } from '../types/quiz';
import { ErrorView, LoadingView } from '../components/common';

const BASE_URL = REACT_APP_BASE_URL;

type NavigationProp = StackNavigationProp<RootStackParamList, 'QuizzesDetail'>;

const QuizzesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useCustomTheme().theme;

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quizProgress, setQuizProgress] = useState<Record<string, boolean>>({});

  useEffect(() => {
    console.log('useEffect: Component mounted, fetching user progress.');
    fetchUserProgress();
  }, []);

  const fetchUserProgress = async () => {
    setLoading(true);
    setError(null);

    const userId = await AsyncStorage.getItem('userId');
    console.log('fetchUserProgress: User ID:', userId);

    if (!userId) {
      setError('User ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const { fetchedQuizzes, progress } = await fetchUserQuizData(userId);
      setQuizzes(fetchedQuizzes);
      setQuizProgress(progress);
    } catch (error) {
      console.error('fetchUserProgress: Error fetching user progress:', error);
      handleError(error, setError);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async (moduleId: string) => {
    const userId = await AsyncStorage.getItem('userId');
    console.log(
      `handleStartQuiz: Attempting to start quiz for module ${moduleId} for user ${userId}`,
    );

    if (!userId) {
      setError('User ID not found. Cannot start quiz.');
      return;
    }

    navigation.navigate('QuizzesDetail', { moduleId: moduleId });

    // If the quiz isn't already completed, mark it as started
    if (!quizProgress[moduleId]) {
      try {
        await axios.post(`${BASE_URL}/api/v1/users/${userId}/progress`, {
          resourceType: 'quiz',
          resourceId: moduleId,
          action: 'start',
        });
        console.log(
          `handleStartQuiz: Successfully marked quiz for module ${moduleId} as started for user ${userId}`,
        );
      } catch (error) {
        console.error(
          `handleStartQuiz: Error starting quiz for module ${moduleId} for user ${userId}:`,
          error,
        );
        handleError(error, setError);
      }
    }
  };

  if (loading) {
    return <LoadingView message={strings.loadingQuizzes || 'Loading...'} />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={fetchUserProgress} />;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {quizzes.length > 0 ? (
        quizzes.map(quiz => (
          <QuizCard
            key={quiz.id}
            quiz={quiz}
            isCompleted={quizProgress[quiz.moduleId]}
            onPress={() => handleStartQuiz(quiz.moduleId)}
          />
        ))
      ) : (
        <View style={styles.noQuizzesContainer}>
          <Text style={{ color: colors.textSecondary }}>No quizzes available</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  noQuizzesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    marginTop: 50,
  },
});

export default QuizzesScreen;