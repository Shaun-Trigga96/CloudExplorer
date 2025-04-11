import React, { SVGProps, useEffect, useState } from 'react';
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
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const BASE_URL = REACT_APP_BASE_URL;

// --- Define Theme Colors (Matching other screens) ---
const lightColors = {
  background: '#F0F2F5', // Lighter grey background
  surface: '#FFFFFF', // Card background
  primary: '#007AFF', // Example primary blue
  text: '#1C1C1E', // Dark text
  textSecondary: '#6E6E73', // Grey text
  border: '#D1D1D6',
  error: '#FF3B30',
  success: '#34C759', // Green for completed
  warning: '#FFC107', // Yellow/Orange for in-progress
  progressBarBackground: '#e0e0e0', // Light grey for progress bar base
  buttonPrimaryBackground: '#007AFF',
  buttonCompletedBackground: '#34C759', // Green button for completed
  buttonText: '#FFFFFF',
};

const darkColors = {
  background: '#000000', // Black background
  surface: '#1C1C1E', // Dark grey card background
  primary: '#0A84FF', // Brighter blue for dark mode
  text: '#FFFFFF', // White text
  textSecondary: '#8E8E93', // Lighter grey text
  border: '#3A3A3C',
  error: '#FF453A',
  success: '#32D74B', // Brighter green for dark mode
  warning: '#FFD60A', // Brighter yellow/orange for dark mode
  progressBarBackground: '#3A3A3C', // Darker grey for progress bar base
  buttonPrimaryBackground: '#0A84FF',
  buttonCompletedBackground: '#32D74B', // Brighter green button
  buttonText: '#FFFFFF',
};
// --- End Theme Colors ---


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
  icon: React.FC; // Keep this, we'll handle fill later
}

interface UserProgressResponse {
  learningProgress: LearningProgress;
  availableModules: ApiModule[];
}

// Define the icon map for the modules
const iconMap: { [key: string]: React.FC } = { // Added SVGProps type
  'cloud-storage': CloudStorageIcon,
  'compute-engine': ComputeEngineIcon,
  'cloud-functions': CloudFunctionsIcon,
  'kubernetes-engine': KubernetesEngineIcon,
  'cloud-fundamentals': CloudGenericIcon,
  'data-transformation': StreamingAnalyticsIcon,
};

const ModulesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isDarkMode } = useTheme(); // Get theme state
  const colors = isDarkMode ? darkColors : lightColors; // Select color palette

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
        } else if ((modulesResponse.data as any).modules && Array.isArray((modulesResponse.data as any).modules)) {
          fetchedModules = (modulesResponse.data as any).modules;
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

    // Mark as started only if progress is 0
    if ((moduleProgress[moduleId] ?? 0) === 0) {
        try {
          await axios.post(`${BASE_URL}/api/v1/users/${userId}/progress`, {
            resourceType: 'module',
            resourceId: moduleId,
            action: 'start',
          });
          console.log(
            `handleStartLearning: Successfully marked module ${moduleId} as started for user ${userId}`,
          );
          // Optimistically update local progress state for immediate feedback
          setModuleProgress(prev => ({ ...prev, [moduleId]: 0.25 }));
          // Optionally refetch, but optimistic update is faster UX
          // fetchUserProgress();
        } catch (error) {
          console.error(
            `handleStartLearning: Error starting module ${moduleId} for user ${userId}:`,
            error,
          );
          handleError(error);
        }
    }
  };

  // Use theme colors for progress
  const getProgressColor = (progress: number) => {
    if (progress === 1) {
      return colors.success; // Use theme success color
    } else if (progress > 0) {
      return colors.warning; // Use theme warning color
    } else {
      return colors.progressBarBackground; // Use theme progress bar background
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

  // --- Loading State ---
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        {/* Optional: Add a retry button */}
        <Button
          mode="contained"
          onPress={fetchUserProgress}
          style={{ backgroundColor: colors.primary }}
          labelStyle={{ color: colors.buttonText }}
        >
          Retry
        </Button>
      </View>
    );
  }

  // --- Main Content ---
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {availableModules.map((apiModule) => {
        const IconComponent = iconMap[apiModule.id] || CloudGenericIcon;
        const progress = moduleProgress[apiModule.id] ?? 0;
        const progressColor = getProgressColor(progress);
        const buttonLabel = getButtonLabel(progress);
        const isCompleted = progress === 1;
        const buttonBackgroundColor = isCompleted
            ? colors.buttonCompletedBackground
            : colors.buttonPrimaryBackground;

        return (
          <Card
            key={apiModule.id}
            style={[
                styles.card,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: isDarkMode ? 1 : 0, // Add border in dark mode
                }
            ]}
          >
            <Card.Content>
              <View style={styles.headerRow}>
                <View style={styles.icon}>
                  {/* Pass fill color to SVG */}
                  <IconComponent fill={colors.primary} width={30} height={30} {...(IconComponent as React.ComponentProps<typeof IconComponent>) as SVGProps<SVGSVGElement>} />
                </View>
                <Title style={[styles.title, { color: colors.text }]}>{apiModule.title}</Title>
              </View>
              <Paragraph style={{ color: colors.textSecondary }}>{apiModule.description}</Paragraph>
              <ProgressBar
                progress={progress}
                color={progressColor}
                style={[styles.progressBar, { backgroundColor: colors.progressBarBackground }]} // Apply background color
              />
              <Paragraph style={[styles.percentageText, { color: colors.textSecondary }]}>
                {`${(progress * 100).toFixed(0)}%`}
              </Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => handleStartLearning(apiModule.id)}
                style={{ backgroundColor: buttonBackgroundColor }} // Use dynamic background
                labelStyle={{ color: colors.buttonText }} // Use theme button text color
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

// --- Updated Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    // backgroundColor applied dynamically
  },
  card: {
    marginBottom: 16,
    borderRadius: 18, // Match other screens
    overflow: 'hidden',
    // backgroundColor, borderColor, borderWidth applied dynamically
    // Shadows for light mode (subtle)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8, // Keep elevation for Android
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 12, // Increased margin
    width: 30, // Match icon size
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginLeft: 8,
    flex: 1, // Allow title to take remaining space
    // color applied dynamically
  },
  progressBar: {
    height: 8, // Slightly thicker progress bar
    marginTop: 12, // Increased margin
    borderRadius: 4,
    // backgroundColor applied dynamically
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor applied dynamically
  },
  percentageText: {
    marginTop: 6, // Adjusted margin
    fontSize: 12,
    // color applied dynamically
    alignSelf: 'flex-end', // Align percentage to the right
  },
  // completedButton style removed, handled inline now
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    // backgroundColor applied dynamically
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
    // color applied dynamically
  },
  // Button styles are handled inline using theme colors
});

export default ModulesScreen;
