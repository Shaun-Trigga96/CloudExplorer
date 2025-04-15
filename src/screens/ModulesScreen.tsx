import React, { FC, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, ActivityIndicator, Alert, ImageSourcePropType } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { REACT_APP_BASE_URL } from '@env';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import ModuleCard from '../components/modules/ModuleCard';
import {ErrorView}  from '../components/common/ErrorView';
import { ApiModule,UserProgressResponse } from '../types/modules';
import { handleError } from '../utils/handleError';

const BASE_URL = REACT_APP_BASE_URL;

const iconMap: { [key: string]: ImageSourcePropType } = {
  'digital-transformation': require('../assets/images/digital_transformation.jpeg'),
  'artificial-intelligence': require('../assets/images/artificial_intelligence.jpeg'),
  'infrastructure-application': require('../assets/images/infrastructure_application.jpeg'),
  'scailing-operations': require('../assets/images/scailing_operations.jpeg'),
  'trust-security': require('../assets/images/trust_security.jpeg'),
  'data-transformation': require('../assets/images/data_transformation.jpeg'),
  'default': require('../assets/images/cloud_generic.png'),
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'ModuleDetail'>;

const ModulesScreen: FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useCustomTheme().theme;
  const [moduleProgress, setModuleProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [availableModules, setAvailableModules] = useState<ApiModule[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProgress = async () => {
    setLoading(true);
    setError(null);
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please log in again.');
      setLoading(false);
      return;
    }

    try {
      const modulesResponse = await axios.get<ApiModule[] | { modules: ApiModule[] } | null>(`${BASE_URL}/api/v1/modules/list`);
      let fetchedModules: ApiModule[] = [];
      if (modulesResponse.data) {
        fetchedModules = Array.isArray(modulesResponse.data) ? modulesResponse.data : (modulesResponse.data as any).modules || [];
      }
      setAvailableModules(fetchedModules);

      const progressResponse = await axios.get<UserProgressResponse>(`${BASE_URL}/api/v1/users/${userId}/progress`);
      const { learningProgress } = progressResponse.data;

      const progress: Record<string, number> = {};
      fetchedModules.forEach(apiModule => {
        const moduleId = apiModule.id;
        const learningData = learningProgress || {};
        const isStarted = learningData.modulesInProgress?.includes(moduleId);
        const isCompleted = learningData.completedModules?.includes(moduleId);
        const hasCompletedQuiz = learningData.completedQuizzes?.some(quiz => quiz.moduleId === moduleId);

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

      setModuleProgress(progress);
    } catch (err) {
      handleError(err, setError);
      setModuleProgress({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProgress();
  }, []);

  const handleStartLearning = async (moduleId: string) => {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Cannot start module.');
      return;
    }

    navigation.navigate('ModuleDetail', { moduleId });

    if ((moduleProgress[moduleId] ?? 0) === 0) {
      try {
        await axios.post(`${BASE_URL}/api/v1/users/${userId}/progress`, {
          resourceType: 'module',
          resourceId: moduleId,
          action: 'start',
        });
        setModuleProgress(prev => ({ ...prev, [moduleId]: 0.25 }));
      } catch (err) {
        handleError(err, setError);
      }
    }
  };

  if (loading) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      </ScrollView>
    );
  }

  if (error) {
    return <ErrorView message={error} onRetry={fetchUserProgress} />;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {availableModules.map(module => (
        <ModuleCard
          key={module.id}
          id={module.id}
          title={module.title}
          description={module.description}
          imageSource={iconMap[module.id] || iconMap['default']}
          progress={moduleProgress[module.id] ?? 0}
          onStartLearning={handleStartLearning}
          navigation={navigation}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loading: {
    marginTop: 100,
  },
});

export default ModulesScreen;