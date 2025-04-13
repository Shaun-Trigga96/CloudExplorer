import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_BASE_URL } from '@env';
import strings from '../localization/strings'; // Adjust the path as needed
import { Timestamp, FieldValue } from '@react-native-firebase/firestore';
import { useTheme } from '../context/ThemeContext'; // Import useTheme

const BASE_URL = REACT_APP_BASE_URL;

// --- Define Theme Colors (Matching ProfileScreen/SettingsScreen) ---
const lightColors = {
  background: '#F0F2F5', // Lighter grey background
  surface: '#FFFFFF', // Card background
  primary: '#007AFF', // Example primary blue
  text: '#1C1C1E', // Dark text
  textSecondary: '#6E6E73', // Grey text
  border: '#D1D1D6',
  error: '#FF3B30',
  success: '#34C759',
  buttonSecondaryBackground: '#E5E5EA',
  examDetailBackground: '#f9f9f9', // Light background for details section
  progressBackground: '#e3f2fd', // Light blue background for progress
  progressBarBackground: '#e0e0e0', // Base color for progress bar
};

const darkColors = {
  background: '#000000', // Black background
  surface: '#1C1C1E', // Dark grey card background
  primary: '#0A84FF', // Brighter blue for dark mode
  text: '#FFFFFF', // White text
  textSecondary: '#8E8E93', // Lighter grey text
  border: '#3A3A3C',
  error: '#FF453A',
  success: '#32D74B',
  buttonSecondaryBackground: '#2C2C2E',
  examDetailBackground: '#2C2C2E', // Darker surface for details section
  progressBackground: '#1C1C1E', // Match card surface for progress background
  progressBarBackground: '#3A3A3C', // Dark border color for base
};
// --- End Theme Colors ---

type ExamsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExamDetail'>;

interface Exam {
  examId: string; // Persistent ID
  title: string;
  description: string;
  duration: number | null;
  prerequisites: string[];
  associatedModules?: string[]; // For AI context generation
  questions?: Question[]; // Store generated questions here
  questionsGeneratedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  passingRate: number;
  icon: any;
}

interface Question { // Assuming structure from AI parser
  id: number;
  explanation: string[];
  answers: Array<{ letter: string; answer: string; uniqueKey?: string }>;
  question: string;
  options: string[];
  correctAnswer: string;
}

const ExamsScreen = () => {
  const navigation = useNavigation<ExamsScreenNavigationProp>();
  const { isDarkMode } = useTheme(); // Get theme state
  const colors = isDarkMode ? darkColors : lightColors; // Select color palette

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [examAttempts, setExamAttempts] = useState<Record<string, number>>({});
  const [examScores, setExamScores] = useState<Record<string, number>>({});
  const [userIdLoading, setUserIdLoading] = useState(true);
  const [userIdError, setUserIdError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserIdAndExamAttempts = async () => {
      try {
        setUserIdLoading(true);
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          setUserIdError('User ID not found. Please log in.');
          return;
        }
        await fetchExamAttempts(userId);
      // eslint-disable-next-line no-catch-shadow, @typescript-eslint/no-shadow
      } catch (error) {
        setUserIdError('Failed to load user data.');
      } finally {
        setUserIdLoading(false);
      }
    };
    fetchUserIdAndExamAttempts();
  }, []);

  useEffect(() => {
    const fetchExams = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${BASE_URL}/api/v1/exams/list-exams`);
        console.log("Exams API Response:", response.data); // Log the API response
        const formattedExams: Exam[] = response.data.exams.map((exam: any) => {
          const formattedExam: Exam = {
            examId: exam.id,
            title: exam.title,
            description: exam.description,
            duration: exam.duration,
            prerequisites: exam.prerequisites,
            associatedModules: exam.associatedModules,
            passingRate: exam.passingRate,
            icon: getIconForExam(exam.id),
          };
          console.log("Formatted Exam:", formattedExam); // Log the formatted exam
          return formattedExam;
        });
        setExams(formattedExams);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const axiosError = err as AxiosError;
          if (axiosError.response) {
            console.error('Server responded with:', axiosError.response.status, axiosError.response.data);
            setError(
              `Server Error: ${axiosError.response.status} - ${axiosError.response.data || axiosError.response.statusText}`,
            );
          } else if (axiosError.request) {
            console.error('No response received:', axiosError.request);
            setError(
              'Network error: Unable to connect to server. Please check your connection.',
            );
          } else {
            console.error('Error setting up the request:', axiosError.message);
            setError(`Error: ${axiosError.message}`);
          }
        } else {
          console.error('An unexpected error occurred:', err);
          setError(`An unexpected error occurred: ${err}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, []);

  const fetchExamAttempts = async (userId: string) => {
    try {
      setLoading(true); // Keep loading indicator for attempts fetch
      setError(null);

      const response = await axios.get(`${BASE_URL}/api/v1/exams/progress/${userId}`); // Corrected endpoint

      if (Array.isArray(response.data.examProgress)) {
        const attempts: Record<string, number> = {};
        const scores: Record<string, number> = {};

        response.data.examProgress.forEach((attempt: any) => {
          attempts[attempt.examId] = (attempts[attempt.examId] || 0) + 1;
          // Ensure score exists and is a number before comparing
          if (attempt.score !== undefined && typeof attempt.score === 'number') {
            if (!scores[attempt.examId] || attempt.score > scores[attempt.examId]) {
              scores[attempt.examId] = attempt.score;
            }
          }
        });

        setExamAttempts(attempts);
        setExamScores(scores);
      } else if (response.data === null || response.data === undefined || response.data.examProgress === null || response.data.examProgress === undefined) {
        // Handle the case where the response is null or undefined
        console.warn('No exam progress data found for user:', userId);
        setExamAttempts({});
        setExamScores({});
      } else {
        // Handle the case where the response is not an array
        console.error('Unexpected response format:', response.data);
        setError('Unexpected response format from server.');
        setExamAttempts({});
        setExamScores({});
      }
    } catch (error) {
      console.error('Error fetching exam attempts:', error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('Server responded with:', axiosError.response.status, axiosError.response.data);
          if (axiosError.response.status === 400 && axiosError.response.data === 'User ID is required') {
            setError('User ID is required. Please log in.');
          } else if (axiosError.response.status === 404) {
            // It's okay if progress is not found initially, don't set an error
            console.log('Exam progress not found for user, initializing empty.');
            setExamAttempts({});
            setExamScores({});
          } else {
            setError(
              `Server Error: ${axiosError.response.status} - ${axiosError.response.data || axiosError.response.statusText}`,
            );
          }
        } else if (axiosError.request) {
          console.error('No response received:', axiosError.request);
          setError(
            'Network error: Unable to connect to server. Please check your connection.',
          );
        } else {
          console.error('Error setting up the request:', axiosError.message);
          setError(`Error: ${axiosError.message}`);
        }
      } else {
        console.error('An unexpected error occurred:', error);
        setError(`An unexpected error occurred: ${error}`);
      }
      // Only set empty if there was a non-404 error
      if (!(axios.isAxiosError(error) && error.response?.status === 404)) {
        setExamAttempts({});
        setExamScores({});
      }
    } finally {
      setLoading(false); // Stop loading indicator after attempts fetch
    }
  };

  const handleStartExam = (examId: string, examTitle: string) => { // Pass title
    console.log('examId:', examId);
    navigation.navigate('ExamDetail', { examId, title: examTitle }); // Pass title to detail screen
  };

  const handleRetry = async () => {
    const userId = await AsyncStorage.getItem('userId');
    if (userId) {
      await fetchExamAttempts(userId);
    } else {
      setError('User ID not found. Please log in.');
    }
  };

  const getIconForExam = (examId: string) => {
    const iconMap: { [key: string]: any } = {
      'cloud-digital-leader-exam': require('../assets/images/cloud-digital-leader.png'),
      // 'cloud-architect-exam': require('../assets/images/cloud-architect.png'),
      // 'cloud-data-engineer': require('../assets/images/data-engineer.png'),
      // 'cloud-security-exam': require('../assets/images/security-engineer.png'),
    };
    const icon = iconMap[examId] || require('../assets/images/cloud_generic.png');
    return icon;
  };

  // --- Loading/Error states ---
  if (userIdLoading) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Loading user data...</Text>
      </View>
    );
  }

  if (userIdError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{userIdError}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        <Button
          mode="contained"
          onPress={handleRetry}
          style={{ backgroundColor: colors.primary }}
          labelStyle={{ color: '#FFFFFF' }} // Ensure text is white
        >
          Retry
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
       {/* Use string keys */}
      <Title style={[styles.screenTitle, { color: colors.text }]}>{strings.certificationPracticeExamsTitle}</Title>
      <Paragraph style={[styles.screenDescription, { color: colors.textSecondary }]}>
         {strings.certificationPracticeExamsDescription}
      </Paragraph>

      {loading ? ( // Separate loading indicator for exams list
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : (
        exams.map((exam) => (
          <Card
            key={exam.examId}
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
                    source={exam.icon}
                    style={styles.icon}
                    resizeMode="contain"
                  />
                </View>
                <Title style={[styles.title, { color: colors.text }]}>{exam.title}</Title>
              </View>
              <Paragraph style={{ color: colors.textSecondary }}>{exam.description}</Paragraph>

              <View style={[styles.examDetails, { backgroundColor: colors.examDetailBackground }]}>
                <View style={styles.examDetailItem}>
                   {/* Use string key */}
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{strings.durationLabel}</Text>
                  {/* Use template literal with string key */}
                  <Text style={[styles.detailValue, { color: colors.text }]}>{exam.duration ? `${exam.duration} ${strings.minutesSuffix}`: 'N/A'}</Text>
                </View>

                <View style={styles.examDetailItem}>
                   {/* Use string key */}
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{strings.passRateLabel}</Text>
                   {/* Use template literal with string key */}
                  <Text style={[styles.detailValue, { color: colors.text }]}>{exam.passingRate ? `${exam.passingRate}${strings.percentSuffix}` : 'N/A'}</Text>
                </View>
              </View>

              {examAttempts[exam.examId] > 0 && (
                <View style={[styles.progressContainer, { backgroundColor: colors.progressBackground }]}>
                  {/* Use template literal with string key */}
                  <Text style={[styles.progressText, { color: colors.textSecondary }]}>{`${strings.previousAttemptsPrefix}${examAttempts[exam.examId]}`}</Text>
                  {examScores[exam.examId] !== undefined && ( // Check if score exists
                     /* Use template literal with string key */
                    <Text style={[styles.progressText, { color: colors.textSecondary }]}>{`${strings.bestScorePrefix}${examScores[exam.examId].toFixed(1)}${strings.percentSuffix}`}</Text>
                  )}
                </View>
              )}
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => handleStartExam(exam.examId, exam.title)} // Pass title here
                style={[styles.startButton, { backgroundColor: colors.primary }]}
                labelStyle={{ color: '#FFFFFF' }} // Ensure text is white
              >
                 {/* Use string key */}
                {strings.startPracticeExam}
              </Button>
            </Card.Actions>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    // backgroundColor applied dynamically
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    // color applied dynamically
  },
  screenDescription: {
    marginBottom: 24,
    // color applied dynamically
  },
  loader: {
    marginTop: 24,
  },
  card: {
    marginBottom: 16,
    borderRadius: 18, // Match Settings/Profile
    overflow: 'hidden',
    // backgroundColor, borderColor, borderWidth applied dynamically
    // Shadows for light mode (subtle)
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 5},
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8, // Keep elevation for Android
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    width: 52,
    height: 52,
  },
  title: {
    marginLeft: 8,
    flex: 1,
    // color applied dynamically
  },
  examDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
    // backgroundColor applied dynamically
    padding: 12,
    borderRadius: 8,
  },
  examDetailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    // color applied dynamically
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    // color applied dynamically
  },
  progressContainer: {
    marginTop: 12,
    padding: 12,
    // backgroundColor applied dynamically
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    marginBottom: 4,
    // color applied dynamically
  },
  startButton: {
    flex: 1,
    // backgroundColor applied dynamically
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    // backgroundColor applied dynamically
  },
  errorText: {
    marginBottom: 16,
    fontSize: 16,
    // color applied dynamically
    textAlign: 'center',
  },
});

export default ExamsScreen;
