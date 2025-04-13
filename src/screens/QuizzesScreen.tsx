import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ImageSourcePropType,
  Image,
} from 'react-native';
import { Card, Title, Paragraph, Button, Text } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useNavigation } from '@react-navigation/native';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_BASE_URL } from '@env';
import strings from '../localization/strings';
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
  buttonPrimaryBackground: '#0A84FF',
  buttonCompletedBackground: '#32D74B', // Brighter green button
  buttonText: '#FFFFFF',
};
// --- End Theme Colors ---

interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  icon: any;
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
// Define the icon map for the modules
const iconMap: { [key: string]: ImageSourcePropType } = {
  'digital-transformation':  require('../assets/images/digital_transformation.jpeg'),
  'artificial-intelligence':  require('../assets/images/artificial_intelligence.jpeg'),
  'infrastructure-application':  require('../assets/images/infrastructure_application.jpeg'),
  'scailing-operations':  require('../assets/images/scailing_operations.jpeg'),
  'trust-security':  require('../assets/images/trust_security.jpeg'),
  'data-transformation':  require('../assets/images/data_transformation.jpeg'),
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'QuizzesDetail'>;

const QuizzesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { isDarkMode } = useTheme(); // Get theme state
  const colors = isDarkMode ? darkColors : lightColors; // Select color palette

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
          icon: iconMap[quiz.moduleId],
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

  // --- Loading State ---
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {strings.loadingQuizzes || 'Loading...'}
        </Text>
      </View>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{String(error)}</Text>
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
      {quizzes.length > 0 ? (
        quizzes.map(quiz => {
          const imageSource = iconMap[quiz.id] || iconMap['default'];
          const isCompleted = quizProgress[quiz.moduleId];
          const buttonLabel = getButtonLabel(quiz.moduleId);
          const buttonBackgroundColor = isCompleted
            ? colors.buttonCompletedBackground
            : colors.buttonPrimaryBackground;

          return (
            <Card
              key={quiz.id}
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
                <View style={styles.iconContainer}>
                  <Image
                    source={imageSource}
                    style={styles.iconImage}
                    resizeMode="contain" // Adjust resizeMode as needed
                  />
                </View>
                  <Title style={[styles.title, { color: colors.text }]}>{String(quiz.title)}</Title>
                </View>
                <Paragraph style={{ color: colors.textSecondary }}>{String(quiz.description)}</Paragraph>
                <Paragraph style={[styles.questionCount, { color: colors.textSecondary }]}>
                  {`${quiz.questionCount} ${strings.questionsSuffix || 'Questions'}`}
                </Paragraph>
                {isCompleted && (
                  <Paragraph style={[styles.completedText, { color: colors.success }]}>
                    Completed
                  </Paragraph>
                )}
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="contained"
                  onPress={() => handleStartQuiz(quiz.moduleId)}
                  style={{ backgroundColor: buttonBackgroundColor }}
                  labelStyle={{ color: colors.buttonText }}
                >
                  {buttonLabel}
                </Button>
              </Card.Actions>
            </Card>
          );
        })
      ) : (
        <View style={styles.noQuizzesContainer}>
          <Text style={{ color: colors.textSecondary }}>No quizzes available</Text>
        </View>
      )}
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
  iconContainer: {
    marginRight: 12,
    width: 34, // Keep size consistent
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginLeft: 8,
    flex: 1, // Allow title to take remaining space
    // color applied dynamically
  },
  questionCount: {
    marginTop: 8,
    // color applied dynamically
  },
  completedText: {
    marginTop: 4,
    fontWeight: 'bold',
    // color applied dynamically (using success color)
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor applied dynamically
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    // color applied dynamically
  },
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
  noQuizzesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    marginTop: 50, // Add some margin to center it better visually
  },
  iconImage: { // Style for the Image component itself
    width: 30, // Control image dimensions
    height: 30,
  },
  // Button styles are handled inline using theme colors
});

export default QuizzesScreen;
