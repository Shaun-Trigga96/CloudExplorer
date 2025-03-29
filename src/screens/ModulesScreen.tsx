import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, ProgressBar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
// Removed unused Firebase imports: firestore, auth
import ComputeEngineIcon from '../assets/icons/compute_engine.svg';
import CloudStorageIcon from '../assets/icons/cloud_storage.svg';
import CloudFunctionsIcon from '../assets/icons/cloud_functions.svg';
import KubernetesEngineIcon from '../assets/icons/google_kubernetes_engine.svg';
import CloudGenericIcon from '../assets/icons/cloud_generic.svg';
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
  icon: React.FC<React.SVGProps<SVGSVGElement>>; // Corrected icon type slightly
}

type NavigationProp = StackNavigationProp<RootStackParamList, 'ModuleDetail'>;

interface LearningProgress {
  modulesInProgress?: string[];
  completedModules?: string[];
  completedQuizzes?: { moduleId: string }[];
}

// Define the structure of the API response data more explicitly
interface UserProgressResponse {
    learningProgress: LearningProgress;
    // Assuming 'modules' from the API refers to the list of all modules available
    // Renaming to avoid conflict with the component's 'modules' constant
    availableModules: { id: string; /* other module fields from API if needed */ }[];
}


const ModulesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [moduleProgress, setModuleProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // Your static module definitions remain the same
  const modules: Module[] = [
     {
       id: 'cloud-fundamentals',
       title: 'GCP Cloud Fundamentals',
       description: 'Learn the fundamentals of cloud computing in Google Cloud',
       icon: CloudGenericIcon,
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
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please log in again.'); // Inform user
      setLoading(false);
      return;
    }

    try {
      // Use the explicit response type
      const response = await axios.get<UserProgressResponse>(`${BASE_URL}/api/v1/users/${userId}/progress`); // Corrected template literal
      const { learningProgress, availableModules } = response.data;

      const progress: Record<string, number> = {};

      // Calculate progress based on the available modules from the API response
      availableModules.forEach((apiModule) => {
        const moduleId = apiModule.id;
        // Ensure learningProgress exists before accessing its properties
        const learningData = learningProgress || {};

        const isStarted = learningData.modulesInProgress?.includes(moduleId);
        const isCompleted = learningData.completedModules?.includes(moduleId);
        const hasCompletedQuiz = learningData.completedQuizzes?.some(
          (quiz) => quiz.moduleId === moduleId
        );

        if (isCompleted) {
          progress[moduleId] = 1.0; // 100%
        } else if (hasCompletedQuiz) {
          progress[moduleId] = 0.75; // 75% (Example logic)
        } else if (isStarted) {
          progress[moduleId] = 0.25; // 25% (Example logic)
        } else {
          progress[moduleId] = 0; // 0%
        }
      });

      setModuleProgress(progress);
    } catch (error) {
      console.error('Error fetching user progress:', error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (!axiosError.response) {
          Alert.alert(
            'Network Error',
            'Could not connect to the server. Please check your internet connection and try again.',
            [{ text: 'OK' }]
          );
        } else {
           // Provide more specific error feedback if possible
           let message = `An error occurred on the server: ${axiosError.response.status}`;
           if (axiosError.response.status === 404) {
               message = 'User progress data not found. Please try again later.';
           } else if (axiosError.response.status === 401) {
               message = 'Authentication error. Please log in again.';
               // Optionally trigger logout or re-login flow
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
       // Set empty progress or default state on error?
       setModuleProgress({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch progress via the API call on mount
    fetchUserProgress();

    // --- Firestore onSnapshot listener removed ---
    // No cleanup function needed as there's no active listener to unsubscribe from

  }, []); // Empty dependency array ensures this runs only once on mount

  const handleStartLearning = async (moduleId: string) => {
     const userId = await AsyncStorage.getItem('userId');
     if (!userId) {
         Alert.alert('Error', 'User ID not found. Cannot start module.');
         return;
     }

     // Optimistically navigate
     navigation.navigate('ModuleDetail', { moduleId });

     try {
        // Call backend API to mark module as started
        // Using PUT or POST based on your API design (POST used here)
        await axios.post(`${BASE_URL}/api/v1/users/${userId}/modules/${moduleId}/start`); // Example endpoint
        // Optionally re-fetch progress after starting, or rely on next screen load
        // fetchUserProgress();
     } catch (error) {
        console.error('Error starting module:', error);
        // Handle API errors similar to fetchUserProgress
        if (axios.isAxiosError(error)) {
          // ... (Axios error handling)
           Alert.alert('Error', 'Could not update module start status.');
        } else {
          // ... (Generic error handling)
           Alert.alert('Error', 'An unexpected error occurred.');
        }
        // If API call fails after navigation, consider navigating back or showing persistent error
     }
  };

  const getProgressColor = (progress: number) => {
    if (progress === 1) {
      return '#4CAF50'; // Green for completed
    } else if (progress > 0) {
      return '#FFC107'; // Yellow for in progress
    } else {
      return '#e0e0e0'; // Light gray for not started
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

  // --- Render logic remains largely the same ---
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
          // Ensure progress is accessed safely, defaulting to 0
          const progress = moduleProgress[module.id] ?? 0;
          const progressColor = getProgressColor(progress);
          const buttonLabel = getButtonLabel(progress);

          return (
            <Card key={module.id} style={styles.card}>
              <Card.Content>
                <View style={styles.headerRow}>
                  <IconComponent
                    width={34}
                    height={34}
                    style={styles.icon}
                     // Removed unnecessary spread, assuming SVG component handles props correctly
                  />
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
    backgroundColor: '#4CAF50', // Green for completed
  },
});

export default ModulesScreen;
