import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, ProgressBar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import ComputeEngineIcon from '../assets/icons/compute_engine.svg';
import CloudStorageIcon from '../assets/icons/cloud_storage.svg';
import CloudFunctionsIcon from '../assets/icons/cloud_functions.svg';
import KubernetesEngineIcon from '../assets/icons/google_kubernetes_engine.svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';

const BASE_URL = 'http://10.0.2.2:5000';

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

const ModulesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [moduleProgress, setModuleProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const modules: Module[] = [
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
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${BASE_URL}/user/${userId}/progress`);
      const { learningProgress, modules: apiModules } = response.data;

      const progress: Record<string, number> = {};

      apiModules.forEach((module: { id: string }) => {
        const moduleId = module.id;
        const learningData = learningProgress as LearningProgress;

        const isStarted = learningData.modulesInProgress?.includes(moduleId);
        const isCompleted = learningData.completedModules?.includes(moduleId);
        const hasCompletedQuiz = learningData.completedQuizzes?.some(
          (quiz) => quiz.moduleId === moduleId
        );

        if (isCompleted) {
          progress[moduleId] = 1.0; // 100%
        } else if (hasCompletedQuiz) {
          progress[moduleId] = 0.75; // 75%
        } else if (isStarted) {
          progress[moduleId] = 0.25; // 25%
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
          Alert.alert(
            'Server Error',
            `An error occurred on the server: ${axiosError.response.status}`,
            [{ text: 'OK' }]
          );
        }
      } else {
        Alert.alert(
          'Unexpected Error',
          'An unexpected error occurred. Please try again later.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProgress();
    const userId = auth().currentUser?.uid;
    if (!userId) {
      return;
    }

    const unsubscribe = firestore()
      .collection('users')
      .doc(userId)
      .collection('learningProgress')
      .onSnapshot((snapshot) => {
        const progress: Record<string, number> = {};
        if (snapshot && snapshot.docs) {
          snapshot.docs.forEach((doc) => {
            progress[doc.id] = doc.data().progress || 0;
          });
        }
        setModuleProgress(progress);
      });

    return () => unsubscribe();
  }, []);

  const handleStartLearning = async (moduleId: string) => {
    const userId = await AsyncStorage.getItem('userId');
    if (userId) {
      try {
        await axios.post(`${BASE_URL}/user/${userId}/module/start`, { moduleId });
      } catch (error) {
        console.error('Error starting module:', error);
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          if (!axiosError.response) {
            Alert.alert(
              'Network Error',
              'Could not connect to the server. Please check your internet connection and try again.',
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Server Error',
              `An error occurred on the server: ${axiosError.response.status}`,
              [{ text: 'OK' }]
            );
          }
        } else {
          Alert.alert(
            'Unexpected Error',
            'An unexpected error occurred. Please try again later.',
            [{ text: 'OK' }]
          );
        }
      }
    }
    navigation.navigate('ModuleDetail', { moduleId });
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
      return 'Completed';
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
          const progress = moduleProgress[module.id] || 0;
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
                    {...(IconComponent as React.SVGProps<SVGSVGElement>)}
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
                  disabled={buttonLabel === 'Completed'}
                  style={buttonLabel === 'Completed' ? styles.completedButton : {}}
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
