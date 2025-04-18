import React, { FC, useEffect, useState, useRef } from 'react';
import { ScrollView, StyleSheet, ActivityIndicator, Alert, ImageSourcePropType, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { REACT_APP_BASE_URL } from '@env';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import ModuleCard from '../components/modules/ModuleCard';
import { ErrorView } from '../components/common/ErrorView';
import { ApiModule, UserProgressResponse, ListModulesResponse } from '../types/modules';
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

type NavigationProp = StackNavigationProp<RootStackParamList, 'ModulesScreen'>;
type Props = StackScreenProps<RootStackParamList, 'ModulesScreen'>;

const ModulesScreen: FC<Props> = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<Props['route']>();
  const { colors } = useCustomTheme().theme;
  const [moduleProgress, setModuleProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [availableModules, setAvailableModules] = useState<ApiModule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const isMounted = useRef(true);

  // Get provider from route params, default to 'gcp'
  const providerId = route.params;

  useEffect(() => {
    console.log('ModulesScreen mounted with params:', route.params);
    console.log('BASE_URL:', BASE_URL);
    isMounted.current = true;
    fetchUserProgress();

    return () => {
      console.log('ModulesScreen unmounting');
      isMounted.current = false;
    };
  }, [providerId]);

  const fetchUserProgress = async () => {
    if (!isMounted.current) {
      console.log('fetchUserProgress aborted: component unmounted');
      return;
    }

    setLoading(true);
    setError(null);
    console.log('fetchUserProgress started, setting loading: true, error: null');

    const userId = await AsyncStorage.getItem('userId');
    console.log('Fetched userId from AsyncStorage:', userId);
    if (!userId) {
      console.log('No userId found, navigating to Auth');
      Alert.alert('Error', 'User ID not found. Please log in again.');
      if (isMounted.current) {
        setLoading(false);
      }
      return;
    }

    try {
      // Fetch modules
      const moduleUrl = `${BASE_URL}/api/v1/modules/list`;
      console.log('Attempting to fetch modules with params:', { limit: 20, lastId, providerId });
      console.log('Module fetch URL:', moduleUrl);
      const modulesResponse = await axios.get<ListModulesResponse>(moduleUrl, {
        params: { limit: 20, lastId, providerId },
        timeout: 5000,
      });
      console.log('Modules Response:', JSON.stringify(modulesResponse.data, null, 2));

      if (!isMounted.current) {
        console.log('fetchUserProgress aborted after module fetch: component unmounted');
        return;
      }

      if (modulesResponse.data.status !== 'success') {
        throw new Error('Failed to fetch modules: Invalid response status');
      }

      const { modules, hasMore: newHasMore, lastId: newLastId } = modulesResponse.data.data;
      console.log(`Fetched ${modules.length} modules for providerId: ${providerId}`);
      console.log('Modules IDs:', modules.map(m => m.id));
      setAvailableModules(modules);
      setHasMore(newHasMore);
      setLastId(newLastId);
      console.log('Updated state: availableModules:', modules.length, 'hasMore:', newHasMore, 'lastId:', newLastId);

      if (modules.length === 0) {
        console.log('No modules found, setting error state');
        setError(`No modules found for ${providerId}. Try a different provider or check back later.`);
      }

      // Fetch user progress
      console.log('Fetching user progress for userId:', userId);
      const progressResponse = await axios.get<UserProgressResponse>(`${BASE_URL}/api/v1/users/${userId}/progress`, {
        timeout: 5000,
      });
      console.log('Progress Response:', JSON.stringify(progressResponse.data, null, 2));

      if (!isMounted.current) {
        console.log('fetchUserProgress aborted after progress fetch: component unmounted');
        return;
      }

      if (!progressResponse.data.userExists) {
        console.log('User not found, navigating to Auth');
        Alert.alert('Error', 'User not found. Please log in again.');
        return;
      }

      const { learningPaths, quizResults } = progressResponse.data;

      const progress: Record<string, number> = {};
      modules.forEach((apiModule) => {
        const moduleId = apiModule.id;
        let isStarted = false;
        let isCompleted = false;
        let hasCompletedQuiz = false;

        learningPaths.forEach((path) => {
          const { learningProgress } = path;
          if (learningProgress.completedModules.includes(moduleId)) {
            isCompleted = true;
          }
          if (learningProgress.completedQuizzes.some((quizId) => {
            const quiz = quizResults.find((qr) => qr.quizId === quizId);
            return quiz?.moduleId === moduleId;
          })) {
            hasCompletedQuiz = true;
          }
          if (learningProgress.completedModules.includes(moduleId) && !isCompleted) {
            isStarted = true;
          }
        });

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

      console.log('Calculated progress:', progress);
      setModuleProgress(progress);
    } catch (err: any) {
      console.error('Error in fetchUserProgress:', {
        message: err.message,
        code: err.code,
        response: err.response ? {
          status: err.response.status,
          data: err.response.data,
        } : null,
        request: err.request ? err.request._header : null,
      });
      if (isMounted.current) {
        handleError(err, (msg) => setError(msg || 'Failed to fetch modules or progress. Please check your network and try again.'));
        setModuleProgress({});
      }
    } finally {
      if (isMounted.current) {
        console.log('Setting loading to false, final state: loading:', false, 'error:', error, 'modules:', availableModules.length);
        setLoading(false);
      }
    }
  };

  const handleStartLearning = async (moduleId: string) => {
    const userId = await AsyncStorage.getItem('userId');
    console.log('handleStartLearning called with moduleId:', moduleId, 'userId:', userId);
    if (!userId) {
      console.log('No userId found in handleStartLearning, showing alert');
      Alert.alert('Error', 'User ID not found. Cannot start module.');
      return;
    }

    if ((moduleProgress[moduleId] ?? 0) === 0) {
      try {
        console.log('Posting progress update for moduleId:', moduleId);
        await axios.post(`${BASE_URL}/api/v1/users/${userId}/progress`, {
          resourceType: 'module',
          resourceId: moduleId,
          action: 'start',
          providerId,
          pathId: route.params,
        }, {
          timeout: 5000,
        });
        console.log('Progress updated for moduleId:', moduleId);
        setModuleProgress((prev) => ({ ...prev, [moduleId]: 0.25 }));
      } catch (err: any) {
        console.error('Error in handleStartLearning:', {
          message: err.message,
          code: err.code,
          response: err.response ? {
            status: err.response.status,
            data: err.response.data,
          } : null,
        });
        handleError(err, setError);
      }
    }
  };

  const handleLoadMore = async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    console.log('handleLoadMore called, loading: true');
    try {
      console.log('Loading more modules with params:', { limit: 20, lastId, providerId });
      const modulesResponse = await axios.get<ListModulesResponse>(`${BASE_URL}/api/v1/modules/list`, {
        params: { limit: 20, lastId, providerId },
        timeout: 5000,
      });

      if (!isMounted.current) {
        console.log('handleLoadMore aborted: component unmounted');
        return;
      }

      if (modulesResponse.data.status !== 'success') {
        throw new Error('Failed to fetch more modules');
      }

      const { modules, hasMore: newHasMore, lastId: newLastId } = modulesResponse.data.data;
      console.log(`Fetched ${modules.length} additional modules for providerId: ${providerId}`);
      setAvailableModules((prev) => [...prev, ...modules]);
      setHasMore(newHasMore);
      setLastId(newLastId);
      console.log('Updated state after load more: availableModules:', availableModules.length + modules.length, 'hasMore:', newHasMore, 'lastId:', newLastId);
    } catch (err: any) {
      console.error('Error loading more modules:', {
        message: err.message,
        code: err.code,
        response: err.response ? {
          status: err.response.status,
          data: err.response.data,
        } : null,
      });
      handleError(err, setError);
    } finally {
      if (isMounted.current) {
        console.log('Setting loading to false in handleLoadMore');
        setLoading(false);
      }
    }
  };

  console.log('Rendering ModulesScreen, state:', { loading, error, modules: availableModules.length });

  if (loading && availableModules.length === 0) {
    console.log('Rendering loading state');
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
      </ScrollView>
    );
  }

  if (error) {
    console.log('Rendering error state:', error);
    return <ErrorView message={error} onRetry={fetchUserProgress} />;
  }

  if (availableModules.length === 0) {
    console.log('Rendering empty state');
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.noModulesText, { color: colors.text }]}>
          No modules available for {providerId.provider}. Try a different provider or check back later.
        </Text>
      </ScrollView>
    );
  }

  console.log('Rendering module list, modules:', availableModules.map(m => m.id));
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      onScrollEndDrag={() => hasMore && handleLoadMore()}
    >
      {availableModules.map((module) => (
        <ModuleCard
          key={module.id}
          id={module.id}
          title={module.title}
          description={module.description || 'No description available'}
          imageSource={iconMap[module.id] || iconMap['default']}
          progress={moduleProgress[module.id] ?? 0}
          onStartLearning={handleStartLearning}
          navigation={navigation}
        />
      ))}
      {loading && (
        <ActivityIndicator size="small" color={colors.primary} style={styles.loadingMore} />
      )}
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
  loadingMore: {
    marginVertical: 20,
  },
  noModulesText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default ModulesScreen;