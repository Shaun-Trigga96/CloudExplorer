import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Button, ProgressBar, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import ComputeEngineIcon from '../assets/icons/compute_engine.svg';
import CloudStorageIcon from '../assets/icons/cloud_storage.svg';
import CloudFunctionsIcon from '../assets/icons/cloud_functions.svg';
import KubernetesEngineIcon from '../assets/icons/google_kubernetes_engine.svg';
import CloudGenericIcon from '../assets/icons/cloud_generic.svg';
import StreamingAnalyticsIcon from '../assets/icons/streaming_analytics.svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import { REACT_APP_BASE_URL } from '@env';

const BASE_URL = REACT_APP_BASE_URL;

type NavigationProp = StackNavigationProp<RootStackParamList, 'ModuleDetail'>;

interface LearningProgress {
  modulesInProgress?: string[];
  completedModules?: string[];
  completedQuizzes?: { moduleId: string }[];
}

interface ApiModule {
  id: string;
  title: string;
  description: string;
  icon: React.FC;
}

interface UserProgressResponse {
  learningProgress: LearningProgress;
  availableModules: ApiModule[];
}

// Define the icon map for the modules
const iconMap: { [key: string]: React.FC } = {
  'cloud-storage': CloudStorageIcon,
  'compute-engine': ComputeEngineIcon,
  'cloud-functions': CloudFunctionsIcon,
  'kubernetes-engine': KubernetesEngineIcon,
  'cloud-fundamentals': CloudGenericIcon,
  'data-transformation': StreamingAnalyticsIcon,
};

const ModulesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [moduleProgress, setModuleProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [availableModules, setAvailableModules] = useState<ApiModule[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProgress = async () => {
    setLoading(true);
    setError(null);
    const userId = await AsyncStorage.getItem('userId');
    console.log('fetchUserProgress: User ID:', userId); // Log the user ID
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      // Fetch the list of available modules
      const modulesResponse = await axios.get<ApiModule[] | { modules: ApiModule[] } | null>(`${BASE_URL}/api/v1/modules/list`);
      console.log('fetchUserProgress: Modules API Response:', modulesResponse.data);

      let fetchedModules: ApiModule[] = [];
      if (modulesResponse.data) {
        if (Array.isArray(modulesResponse.data)) {
          fetchedModules = modulesResponse.data;
        } else if (modulesResponse.data.modules && Array.isArray(modulesResponse.data.modules)) {
          fetchedModules = modulesResponse.data.modules;
        } else {
          console.warn('fetchUserProgress: Invalid modules response format.');
          fetchedModules = [];
        }
      } else {
        console.warn('fetchUserProgress: Modules response data is null or undefined.');
        fetchedModules = [];
      }
      setAvailableModules(fetchedModules);

      // Fetch user progress
      const progressResponse = await axios.get<UserProgressResponse>(
        `${BASE_URL}/api/v1/users/${userId}/progress`,
      );
      console.log('fetchUserProgress: Raw API Response:', progressResponse.data); // Log the raw response
      const { learningProgress } = progressResponse.data;

      const progress: Record<string, number> = {};

      if (fetchedModules && fetchedModules.length > 0) {
        fetchedModules.forEach((apiModule) => {
          const moduleId = apiModule.id;
          const learningData = learningProgress || {};
          const isStarted = learningData.modulesInProgress?.includes(moduleId);
          const isCompleted = learningData.completedModules?.includes(moduleId);
          const hasCompletedQuiz = learningData.completedQuizzes?.some(
            (quiz) => quiz.moduleId === moduleId,
          );
          console.log(`fetchUserProgress: Module ID: ${moduleId}`);
          console.log(
            `fetchUserProgress: isStarted: ${isStarted}, isCompleted: ${isCompleted}, hasCompletedQuiz: ${hasCompletedQuiz}`,
          );

          // Determine the progress status based on the following logic:
          // 1. If the module is completed, progress is 100% (1.0).
          // 2. If a quiz for the module is completed, progress is 75% (0.75).
          // 3. If the module is started (but not completed or quiz completed), progress is 25% (0.25).
          // 4. Otherwise, progress is 0% (0).
          if (isCompleted) {
            progress[moduleId] = 1.0;
          } else if (hasCompletedQuiz) {
            progress[moduleId] = 0.75;
          } else if (isStarted) {
            progress[moduleId] = 0.25;
          } else {
            progress[moduleId] = 0;
          }
        });
      }

      setModuleProgress(progress);
    } catch (error) {
      console.error('fetchUserProgress: Error fetching user progress:', error);
      handleError(error);
      setModuleProgress({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('useEffect: Component mounted, fetching user progress.');
    fetchUserProgress();
  }, []);

  const handleStartLearning = async (moduleId: string) => {
    const userId = await AsyncStorage.getItem('userId');
    console.log(
      `handleStartLearning: Attempting to start module ${moduleId} for user ${userId}`,
    );
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Cannot start module.');
      return;
    }

    navigation.navigate('ModuleDetail', { moduleId });

    try {
      await axios.post(`${BASE_URL}/api/v1/users/${userId}/progress`, {
        resourceType: 'module',
        resourceId: moduleId,
        action: 'start',
      });
      console.log(
        `handleStartLearning: Successfully marked module ${moduleId} as started for user ${userId}`,
      );
      fetchUserProgress(); // Refresh progress after starting the module
    } catch (error) {
      console.error(
        `handleStartLearning: Error starting module ${moduleId} for user ${userId}:`,
        error,
      );
      handleError(error);
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 1) {
      return '#4CAF50';
    } else if (progress > 0) {
      return '#FFC107';
    } else {
      return '#e0e0e0';
    }
  };

  const getButtonLabel = (progress: number) => {
    if (progress === 1) {
      return 'Review Module';
    } else if (progress > 0) {
      return 'Continue Learning';
    } else {
      return 'Start Learning';
    }
  };

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ee" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {availableModules.map((apiModule) => {
        const IconComponent = iconMap[apiModule.id] || CloudGenericIcon;
        const progress = moduleProgress[apiModule.id] ?? 0;
        const progressColor = getProgressColor(progress);
        const buttonLabel = getButtonLabel(progress);

        return (
          <Card key={apiModule.id} style={styles.card}>
            <Card.Content>
              <View style={styles.headerRow}>
                <View style={styles.icon}>
                  <IconComponent />
                </View>
                <Title style={styles.title}>{apiModule.title}</Title>
              </View>
              <Paragraph>{apiModule.description}</Paragraph>
              <ProgressBar
                progress={progress}
                color={progressColor}
                style={styles.progressBar}
              />
              <Paragraph style={styles.percentageText}>
                {`${(progress * 100).toFixed(0)}%`}
              </Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => handleStartLearning(apiModule.id)}
                style={
                  buttonLabel === 'Review Module' ? styles.completedButton : {}
                }
              >
                {buttonLabel}
              </Button>
            </Card.Actions>
          </Card>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  icon: {
    marginRight: 8,
  },
  title: {
    marginLeft: 8,
  },
  progressBar: {
    height: 6,
    marginTop: 8,
    backgroundColor: '#e0e0e0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  completedButton: {
    backgroundColor: '#4CAF50',
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
});

export default ModulesScreen;
