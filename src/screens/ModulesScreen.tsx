import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, ProgressBar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import ComputeEngineIcon from '../assets/icons/compute_engine.svg';
import CloudStorageIcon from '../assets/icons/cloud_storage.svg';
import CloudFunctionsIcon from '../assets/icons/cloud_functions.svg';
import KubernetesEngineIcon from '../assets/icons/google_kubernetes_engine.svg';
import CloudGenericIcon from '../assets/icons/cloud_generic.svg'
import StreamingAnalyticsIcon from '../assets/icons/streaming_analytics.svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import {REACT_APP_BASE_URL} from '@env';

const BASE_URL = REACT_APP_BASE_URL;

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.FC;
}

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
  // Add other fields if needed
}

interface UserProgressResponse {
    learningProgress: LearningProgress;
    availableModules: ApiModule[];
}


const ModulesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [moduleProgress, setModuleProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [availableModules, setAvailableModules] = useState<ApiModule[]>([]);

  const modules: Module[] = [
     {
       id: 'cloud-fundamentals',
       title: 'GCP Cloud Fundamentals',
       description: 'Learn the fundamentals of cloud computing in Google Cloud',
       icon: CloudGenericIcon,
     },
     {
      id: 'data-transformation',
      title: 'Data Transformation',
      description: 'Learn the value of data in Google Cloud',
      icon: StreamingAnalyticsIcon,
    },
     {
       id: 'compute-engine',
       title: 'Compute Engine',
       description: 'Learn about virtual machines in Google Cloud Platform',
       icon: ComputeEngineIcon,
     },
     {
       id: 'cloud-storage',
       title: 'Cloud Storage',
       description: 'Master object storage in the cloud',
       icon: CloudStorageIcon,
     },
     {
       id: 'cloud-functions',
       title: 'Cloud Functions',
       description: 'Build serverless applications',
       icon: CloudFunctionsIcon,
     },
     {
       id: 'kubernetes-engine',
       title: 'Kubernetes Engine',
       description: 'Container orchestration with GKE',
       icon: KubernetesEngineIcon,
     },
  ];

  const fetchUserProgress = async () => {
    setLoading(true);
    const userId = await AsyncStorage.getItem('userId');
    console.log('fetchUserProgress: User ID:', userId); // Log the user ID
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get<UserProgressResponse>(`${BASE_URL}/api/v1/users/${userId}/progress`);
      console.log('fetchUserProgress: Raw API Response:', response.data); // Log the raw response
      const { learningProgress, availableModules } = response.data;

      setAvailableModules(availableModules);

      const progress: Record<string, number> = {};

      if (availableModules) {
        availableModules.forEach((apiModule) => {
          const moduleId = apiModule.id;
          const learningData = learningProgress || {};
          const isStarted = learningData.modulesInProgress?.includes(moduleId);
          const isCompleted = learningData.completedModules?.includes(moduleId);
          const hasCompletedQuiz = learningData.completedQuizzes?.some(
            (quiz) => quiz.moduleId === moduleId
          );
          console.log(`fetchUserProgress: Module ID: ${moduleId}`);
          console.log(`fetchUserProgress: isStarted: ${isStarted}, isCompleted: ${isCompleted}, hasCompletedQuiz: ${hasCompletedQuiz}`);

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
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (!axiosError.response) {
          Alert.alert(
            'Network Error',
            'Could not connect to the server. Please check your internet connection and try again.',
            [{ text: 'OK' }]
          );
        } else {
           let message = `An error occurred on the server: ${axiosError.response.status}`;
           if (axiosError.response.status === 404) {
               message = 'User progress data not found. Please try again later.';
           } else if (axiosError.response.status === 401) {
               message = 'Authentication error. Please log in again.';
           }
           Alert.alert('Server Error', message, [{ text: 'OK' }]);
        }
      } else {
        Alert.alert(
          'Unexpected Error',
          'An unexpected error occurred while fetching progress. Please try again later.',
          [{ text: 'OK' }]
        );
      }
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
     console.log(`handleStartLearning: Attempting to start module ${moduleId} for user ${userId}`);
     if (!userId) {
         Alert.alert('Error', 'User ID not found. Cannot start module.');
         return;
     }

     navigation.navigate('ModuleDetail', { moduleId });

     try {
        await axios.post(`${BASE_URL}/api/v1/users/${userId}/progress`, {
          resourceType: 'module',
          resourceId: moduleId,
          action: 'start'
        });
        console.log(`handleStartLearning: Successfully marked module ${moduleId} as started for user ${userId}`);
        fetchUserProgress(); // Refresh progress after starting the module
     } catch (error) {
        console.error(`handleStartLearning: Error starting module ${moduleId} for user ${userId}:`, error);
        if (axios.isAxiosError(error)) {
           Alert.alert('Error', 'Could not update module start status.');
        } else {
           Alert.alert('Error', 'An unexpected error occurred.');
        }
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

  return (
    <ScrollView style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ProgressBar indeterminate={true} color="#6200ee" />
        </View>
      )}
      {!loading &&
        modules.map((module) => {
          const IconComponent = module.icon;
          const progress = moduleProgress[module.id] ?? 0;
          const progressColor = getProgressColor(progress);
          const buttonLabel = getButtonLabel(progress);

          return (
            <Card key={module.id} style={styles.card}>
              <Card.Content>
                <View style={styles.headerRow}>
                  <View style={styles.icon}>
                    <IconComponent
                    />
                  </View>
                  <Title style={styles.title}>{module.title}</Title>
                </View>
                <Paragraph>{module.description}</Paragraph>
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
                  onPress={() => handleStartLearning(module.id)}
                  style={buttonLabel === 'Review Module' ? styles.completedButton : {}}
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
    marginBottom: 16,
  },
  percentageText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  completedButton: {
    backgroundColor: '#4CAF50',
  },
});

export default ModulesScreen;
