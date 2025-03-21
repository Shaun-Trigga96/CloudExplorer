import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
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
import axios from 'axios';

const BASE_URL = '[http://10.0.2.2:5000](http://10.0.2.2:5000)';

interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
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

  const modules: Module[] = [
    {
      id: 'compute-engine',
      title: 'Compute Engine',
      description: 'Learn about virtual machines in Google Cloud Platform',
      progress: 0,
      icon: ComputeEngineIcon,
    },
    {
      id: 'cloud-storage',
      title: 'Cloud Storage',
      description: 'Master object storage in the cloud',
      progress: 0,
      icon: CloudStorageIcon,
    },
    {
      id: 'cloud-functions',
      title: 'Cloud Functions',
      description: 'Build serverless applications',
      progress: 0,
      icon: CloudFunctionsIcon,
    },
    {
      id: 'kubernetes-engine',
      title: 'Kubernetes Engine',
      description: 'Container orchestration with GKE',
      progress: 0,
      icon: KubernetesEngineIcon,
    },
  ];
  const fetchUserProgress = async () => {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {return;}

    try {
      const response = await axios.get(`${BASE_URL}/user/${userId}/progress`);
      const { learningProgress, modules: apiModules } = response.data;

      const progress: Record<string, number> = {};

      // Calculate progress percentage for each module
      apiModules.forEach((module: { id: string }) => {
        const moduleId = module.id;
        const learningData = learningProgress as LearningProgress;

        // Check if module is in different states
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
    }
  };

  useEffect(() => {
    fetchUserProgress();
    const userId = auth().currentUser?.uid;
    if (!userId) {return;}

     // Subscribe to progress updates
     const unsubscribe = firestore()
     .collection('users')
     .doc(userId)
     .collection('learningProgress')
     .onSnapshot(snapshot => {
       const progress: Record<string, number> = {};
       // Check if snapshot exists and has docs
       if (snapshot && snapshot.docs) {
         snapshot.docs.forEach(doc => {
           progress[doc.id] = doc.data().progress || 0;
         });
       }
       setModuleProgress(progress);
     });

   return () => unsubscribe();
 }, []);

  const handleStartLearning = async (moduleId: string) => {
    const userId = await AsyncStorage.getItem('userId');
    console.log('userId', userId);
    if (userId) {
      try {
        await axios.post(`${BASE_URL}/user/${userId}/module/start`, { moduleId });
      } catch (error) {
        console.error('Error starting module:', error);
        // Handle the error appropriately (e.g., show an error message to the user)
      }
    }
    navigation.navigate('ModuleDetail', { moduleId });
  };


  return (
    <ScrollView style={styles.container}>
      {modules.map((module) => {
        const IconComponent = module.icon;
        const progress = moduleProgress[module.id] || 0;

        return (
          <Card key={module.id} style={styles.card}>
            <Card.Content>
              <View style={styles.headerRow}>
                <IconComponent width={34} height={34} style={styles.icon} {...(IconComponent as React.SVGProps<SVGSVGElement>)} />
                <Title style={styles.title}>{module.title}</Title>
              </View>
              <Paragraph>{module.description}</Paragraph>
              <ProgressBar
                progress={progress}
                style={styles.progressBar}
              />
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => handleStartLearning(module.id)}
              >
                {progress > 0 ? 'Continue Learning' : 'Start Learning'}
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
});

export default ModulesScreen;
