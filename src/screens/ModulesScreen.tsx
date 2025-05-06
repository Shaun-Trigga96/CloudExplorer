// c:\Users\thabi\Desktop\CloudExplorer\src\screens\ModulesScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react'; // Added useCallback
import { ScrollView, StyleSheet, ActivityIndicator, Alert, Text, View } from 'react-native'; // Added View
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { REACT_APP_BASE_URL } from '@env';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import { useActiveLearningPath } from '../context/ActiveLearningPathContext'; // Import context hook
import ModuleCard from '../components/modules/ModuleCard';
import { ErrorView } from '../components/common/ErrorView';
import { ApiModule, ListModulesResponse, UserProgressData } from '../types/modules';
import { handleError } from '../utils/handleError';
import { imageMap } from '../utils/imageMap';

const BASE_URL = REACT_APP_BASE_URL;

type NavigationProp = StackNavigationProp<RootStackParamList, 'ModulesScreen'>;

const ModulesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useCustomTheme().theme;
  const [moduleProgress, setModuleProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [availableModules, setAvailableModules] = useState<ApiModule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const isMounted = useRef(true);

  // --- Use Context for providerId and pathId ---
  const { activeProviderId, activePathId } = useActiveLearningPath();


  // --- Fetch User Progress (using context values) ---
  const fetchUserProgress = useCallback(async (currentProviderId: string | null, currentPathId: string | null) => {
    console.log('FRONTEND: Attempting fetch with context:', { currentProviderId, currentPathId });

    if (!currentProviderId || !currentPathId) {
      console.error("FRONTEND: Missing provider or pathId from context!");
      setError("Learning path information is missing.");
      setLoading(false);
      return;
    }

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
      if (isMounted.current) {
        setLoading(false);
      }
      return;
    }

    try {
      const moduleUrl = `${BASE_URL}/api/v1/modules/list`;
      console.log('FRONTEND: Making axios.get request to:', moduleUrl);
      console.log('FRONTEND: Axios params being sent:', { limit: 20, lastId: null, providerId: currentProviderId, pathId: currentPathId });

      const modulesResponse = await axios.get<ListModulesResponse>(moduleUrl, {
        params: { limit: 20, lastId: null, providerId: currentProviderId, pathId: currentPathId }, // Use context values
        timeout: 10000, // Increased timeout
      });

      console.log('Modules Response:', JSON.stringify(modulesResponse.data, null, 2));

      if (!isMounted.current) return;
      if (modulesResponse.data.status !== 'success') throw new Error('Failed to fetch modules');

      const { modules, hasMore: newHasMore, lastId: newLastId } = modulesResponse.data.data;
      console.log(`Fetched ${modules.length} modules for provider: ${currentProviderId}`);
      setAvailableModules(modules);
      setHasMore(newHasMore);
      setLastId(newLastId);

      if (modules.length === 0) {
        setError(`No modules found for this path. Try a different one or check back later.`);
      }

      // Fetch user progress
      console.log('Fetching user progress for userId:', userId);
      const progressResponse = await axios.get<UserProgressData>(`${BASE_URL}/api/v1/users/${userId}/progress`, {
        timeout: 10000, // Increased timeout
      });
      console.log('Progress Response:', JSON.stringify(progressResponse.data, null, 2));

      if (!isMounted.current) return;
      if (!progressResponse.data || !progressResponse.data.data || !progressResponse.data.data.userExists) {
        console.log('User not found in progress response');
        // Handle appropriately, maybe show error or navigate
        return;
      }
      // Updated section of ModulesScreen.tsx

      // 1. Add this debugging function at the top of the component
      const logModuleIdComparison = (apiModules: ApiModule[], completedModules: string[] = []) => {
        console.log('=== MODULE ID COMPARISON DEBUG ===');
        console.log('API Module IDs:', apiModules.map(m => m.id));
        console.log('Completed Module IDs from backend:', completedModules);
        console.log('=================================');
      };

     // Access the data properly from the nested structure
const { learningPaths } = progressResponse.data.data; // IMPORTANT: data is nested inside data

// Find the specific learning path progress for the current pathId
const currentPathData = learningPaths.find((path) => path.pathId === currentPathId);
const currentPathProgress = currentPathData?.progress; // Use optional chaining

console.log('Current path progress found:', !!currentPathProgress, 
  'Completed modules:', currentPathProgress?.completedModules?.length || 0);

const progress: Record<string, number> = {};
modules.forEach((apiModule) => {
  const moduleId = apiModule.id;
  let moduleStatus = 0; // Default to 0 (Not Started)

  if (currentPathProgress && currentPathProgress.completedModules) {
    // Debug log the exact strings we're comparing
    console.log(`Module ID comparison for ${moduleId}:`, {
      moduleIdFromAPI: moduleId,
      isCompleted: currentPathProgress.completedModules.includes(moduleId)
    });
    
    if (currentPathProgress.completedModules.includes(moduleId)) {
      moduleStatus = 1.0; // Completed
      console.log(`Module ${moduleId} marked as COMPLETED`);
    } else if (currentPathProgress.completedQuizzes?.some((quizId) => quizId.startsWith(moduleId))) {
      moduleStatus = 0.75; // Quiz Completed
    } else if (moduleProgress[moduleId] === 0.25) {
      moduleStatus = 0.25; // Started
    }
  }
  
  progress[moduleId] = moduleStatus;
});

console.log('Final module progress:', progress);
setModuleProgress(progress);

    } catch (err: any) {
      console.error('Error in fetchUserProgress:', { /* ... error logging ... */ });
      if (isMounted.current) {
        handleError(err, (msg) => setError(msg || 'Failed to fetch modules or progress.'));
        setModuleProgress({});
      }
    } finally {
      if (isMounted.current) {
        console.log('Setting loading to false, final state:', { loading: false, error, modules: availableModules.length });
        setLoading(false);
      }
    }
    // Add useCallback dependency
  }, [handleError, setAvailableModules, setError, setHasMore, setLastId, setLoading, setModuleProgress]); // REMOVED lastId, moduleProgress

  // --- useEffect to trigger fetch ---
  useEffect(() => {
    console.log('ModulesScreen mounted/context changed:', { activeProviderId, activePathId });
    isMounted.current = true;
    // Fetch data when context values are available
    if (activeProviderId && activePathId) {
      fetchUserProgress(activeProviderId, activePathId);
    } else {
      // Handle case where context is not yet ready or user needs to select path
      setError("Please select a learning path first.");
      setLoading(false);
    }

    return () => {
      console.log('ModulesScreen unmounting');
      isMounted.current = false;
    };
    // Dependency on context values
  }, [activeProviderId, activePathId, fetchUserProgress]);


  // --- handleStartLearning (using context values) ---
  const handleStartLearning = useCallback(async (moduleId: string) => {
    // Use context values directly
    if (!activeProviderId || !activePathId) {
      Alert.alert('Error', 'Learning path not selected.');
      return;
    }

    const userId = await AsyncStorage.getItem('userId');
    console.log('handleStartLearning called with moduleId:', moduleId, 'userId:', userId);
    if (!userId) {
      console.log('No userId found in handleStartLearning, showing alert');
      Alert.alert('Error', 'User ID not found. Cannot start module.');
      return;
    }

    // Optimistic update
    setModuleProgress((prev) => ({ ...prev, [moduleId]: 0.25 }));

    try {
      console.log('Posting progress update for moduleId:', moduleId);
      await axios.post(`${BASE_URL}/api/v1/users/${userId}/progress`, {
        resourceType: 'module',
        resourceId: moduleId,
        action: 'start',
        providerId: activeProviderId, // Use context value
        pathId: activePathId,       // Use context value
      }, {
        timeout: 5000,
      });
      console.log('Progress updated for moduleId:', moduleId);
      // No need to set progress again, optimistic update is done
    } catch (err: any) {
      console.error('Error in handleStartLearning:', { /* ... error logging ... */ });
      // Revert optimistic update on error
      setModuleProgress((prev) => ({ ...prev, [moduleId]: prev[moduleId] === 0.25 ? 0 : prev[moduleId] }));
      handleError(err, setError);
    }
    // Add dependencies for useCallback
  }, [activeProviderId, activePathId, setModuleProgress, setError]);


  // --- handleLoadMore (using context values) ---
  const handleLoadMore = useCallback(async () => {
    // Use context values directly
    if (!activeProviderId || !activePathId) return;
    if (!hasMore || loading) return;

    setLoading(true);
    console.log('handleLoadMore called, loading: true');
    try {
      console.log('Loading more modules with params:', { limit: 20, lastId, providerId: activeProviderId, pathId: activePathId });
      const modulesResponse = await axios.get<ListModulesResponse>(`${BASE_URL}/api/v1/modules/list`, {
        params: { limit: 20, lastId, providerId: activeProviderId, pathId: activePathId }, // Use context values
        timeout: 10000, // Increased timeout
      });

      if (!isMounted.current) return;
      if (modulesResponse.data.status !== 'success') throw new Error('Failed to fetch more modules');

      const { modules, hasMore: newHasMore, lastId: newLastId } = modulesResponse.data.data;
      console.log(`Fetched ${modules.length} additional modules`);
      setAvailableModules((prev) => [...prev, ...modules]);
      setHasMore(newHasMore);
      setLastId(newLastId);
      console.log('Updated state after load more:', { modules: availableModules.length + modules.length, hasMore: newHasMore, lastId: newLastId });

    } catch (err: any) {
      console.error('Error loading more modules:', { /* ... error logging ... */ });
      handleError(err, setError);
    } finally {
      if (isMounted.current) {
        console.log('Setting loading to false in handleLoadMore');
        setLoading(false);
      }
    }
    // Add dependencies for useCallback
  }, [loading, hasMore, lastId, activeProviderId, activePathId, setAvailableModules, setHasMore, setLastId, setError]);


  // --- Render Logic ---
  console.log('Rendering ModulesScreen, state:', { loading, error, modules: availableModules.length });

  if (loading && availableModules.length === 0) {
    console.log('Rendering loading state');
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    console.log('Rendering error state:', error);
    // Pass fetch function with current context values
    return <ErrorView message={error} onRetry={() => fetchUserProgress(activeProviderId, activePathId)} />;
  }

  if (availableModules.length === 0 && !loading) { // Check loading state here too
    console.log('Rendering empty state');
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.noModulesText, { color: colors.text }]}>
          No modules available for this path yet.
        </Text>
      </View>
    );
  }

  console.log('Rendering module list, modules:', availableModules.map(m => m.id));
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      onScrollEndDrag={({ nativeEvent }) => {
        // Check if near bottom to trigger load more
        if (nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 20) {
          handleLoadMore();
        }
      }}
      scrollEventThrottle={400} // Adjust frequency as needed
    >
      {availableModules.map((module) => {
        console.log(`Rendering ModuleCard for ${module.id} with progress:`, moduleProgress[module.id] || 0);
        return (
          <ModuleCard
            key={module.id}
            moduleId={module.id}
            title={module.title}
            description={module.description || 'No description available'}
            imageSource={imageMap[module.id] || imageMap['default']}
            progress={moduleProgress[module.id] ?? 0}
            providerId={activeProviderId || ''} // Pass context value
            pathId={activePathId || ''}       // Pass context value
            onStartLearning={() => handleStartLearning(module.id)} // Simplified call
            navigation={navigation}
          />
        );
      })}
      {loading && availableModules.length > 0 && ( // Show loading indicator at bottom only when loading more
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
  // Removed loading style, using centered View instead
  loadingMore: {
    marginVertical: 20,
  },
  noModulesText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20, // Add padding for better text wrapping
  },
});

export default ModulesScreen;
