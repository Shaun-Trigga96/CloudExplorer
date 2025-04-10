import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card, Title, Paragraph, Button, Text } from 'react-native-paper';
import CloudStorage from '../assets/icons/cloud_storage.svg';
import ComputeEngine from '../assets/icons/compute_engine.svg';
import CloudFunctions from '../assets/icons/cloud_functions.svg';
import KubernetesEngine from '../assets/icons/google_kubernetes_engine.svg';
import CloudGenericIcon from '../assets/icons/cloud_generic.svg';
import StreamingAnalyticsIcon from '../assets/icons/streaming_analytics.svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useNavigation } from '@react-navigation/native';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_BASE_URL } from '@env';
import strings from '../localization/strings';

const BASE_URL = REACT_APP_BASE_URL;

interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  icon: React.FC;
  moduleId: string;
}

interface LearningProgress {
  modulesInProgress?: string[];
  completedModules?: string[];
  completedQuizzes?: { moduleId: string }[];
}

interface ApiQuiz {
  id: string;
  title: string;
  description: string;
  moduleId: string;
  icon?: React.FC;
}

interface UserProgressResponse {
  learningProgress: LearningProgress;
  availableQuizzes: ApiQuiz[];
}

// Define the icon map for the quizzes
const iconMap: { [key: string]: React.FC } = {
  'cloud-storage': CloudStorage,
  'compute-engine': ComputeEngine,
  'cloud-functions': CloudFunctions,
  'kubernetes-engine': KubernetesEngine,
  'cloud-fundamentals': CloudGenericIcon,
  'data-transformation': StreamingAnalyticsIcon,
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'QuizzesDetail'>;

const QuizzesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quizProgress, setQuizProgress] = useState<Record<string, boolean>>({});

  const fetchUserProgress = async () => {
    setLoading(true);
    setError(null);
    
    const userId = await AsyncStorage.getItem('userId');
    console.log('fetchUserProgress: User ID:', userId);
    
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
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
          icon: iconMap[quiz.moduleId] || CloudGenericIcon,
          moduleId: String(quiz.moduleId || ''),
        }));
      } else {
        console.warn('fetchUserProgress: Invalid quizzes response format.');
        fetchedQuizzes = [];
      }
      
      setQuizzes(fetchedQuizzes);

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

      setQuizProgress(progress);
    } catch (error) {
      console.error('fetchUserProgress: Error fetching user progress:', error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useEffect: Component mounted, fetching user progress.');
    fetchUserProgress();
  }, []);

  const handleError = (err: any) => {
    if (axios.isAxiosError(err)) {
      const axiosError = err as AxiosError;
      if (!axiosError.response) {
        Alert.alert(
          'Network Error',
          'Could not connect to the server. Please check your internet connection and try again.',
          [{ text: 'OK' }],
        );
      } else {
        let message = `An error occurred on the server: ${axiosError.response.status}`;
        if (axiosError.response.status === 404) {
          message = 'User progress data not found. Please try again later.';
        } else if (axiosError.response.status === 401) {
          message = 'Authentication error. Please log in again.';
        } else if (axiosError.response.data) {
          message += ` - ${JSON.stringify(axiosError.response.data)}`;
        }
        Alert.alert('Server Error', message, [{ text: 'OK' }]);
      }
    } else {
      Alert.alert(
        'Unexpected Error',
        'An unexpected error occurred. Please try again later.',
        [{ text: 'OK' }],
      );
    }
    setError(err.message || 'An unexpected error occurred');
  };

  const handleStartQuiz = async (moduleId: string) => {
    const userId = await AsyncStorage.getItem('userId');
    console.log(
      `handleStartQuiz: Attempting to start quiz for module ${moduleId} for user ${userId}`,
    );
    
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Cannot start quiz.');
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
        handleError(error);
      }
    }
  };

  const getButtonLabel = (moduleId: string) => {
    return quizProgress[moduleId] ? 'Review Quiz' : 'Start Quiz';
  };

  const getButtonStyle = (moduleId: string) => {
    return quizProgress[moduleId] ? styles.completedButton : {};
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text>{strings.loadingQuizzes || 'Loading...'}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{String(error)}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {quizzes.length > 0 ? (
        quizzes.map(quiz => {
          const Icon = quiz.icon;
          const buttonLabel = getButtonLabel(quiz.moduleId);
          const buttonStyle = getButtonStyle(quiz.moduleId);
          
          return (
            <Card key={quiz.id} style={styles.card}>
              <Card.Content>
                <View style={styles.headerRow}>
                  <View style={styles.iconContainer}>
                    {Icon && <Icon />}
                  </View>
                  <Title style={styles.title}>{String(quiz.title)}</Title>
                </View>
                <Paragraph>{String(quiz.description)}</Paragraph>
                <Paragraph style={styles.questionCount}>
                  {`${quiz.questionCount} ${strings.questionsSuffix || 'Questions'}`}
                </Paragraph>
                {quizProgress[quiz.moduleId] && (
                  <Paragraph style={styles.completedText}>
                    Completed
                  </Paragraph>
                )}
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="contained"
                  onPress={() => handleStartQuiz(quiz.moduleId)}
                  style={buttonStyle}
                >
                  {buttonLabel}
                </Button>
              </Card.Actions>
            </Card>
          );
        })
      ) : (
        <View style={styles.noQuizzesContainer}>
          <Text>No quizzes available</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    marginRight: 12,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginLeft: 8,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionCount: {
    marginTop: 8,
    color: '#666',
  },
  completedText: {
    marginTop: 4,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  noQuizzesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  completedButton: {
    backgroundColor: '#4CAF50',
  },
});

export default QuizzesScreen;