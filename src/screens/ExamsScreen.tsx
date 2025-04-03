import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Card, Title, Paragraph, Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_BASE_URL } from '@env';
import strings from '../localization/strings'; // Adjust the path as needed


const BASE_URL = REACT_APP_BASE_URL;

type ExamsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExamDetail'>;

interface Exam {
  id: string; // Persistent ID
  title: string;
  description: string;
  duration: number | null;
  prerequisites: string[];
  associatedModules?: string[]; // For AI context generation
  passingRate: number;
  icon: any;
}

const ExamsScreen = () => {
  const navigation = useNavigation<ExamsScreenNavigationProp>();
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
            id: exam.id,
            title: exam.title,
            description: exam.description,
            duration: exam.duration,
            prerequisites: exam.prerequisites,
            associatedModules: exam.associatedModules,
            passingRate: exam.passingRate,
            icon: getIconForExam(exam.examId),
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
      setLoading(true);
      setError(null);

      const response = await axios.get(`${BASE_URL}/api/v1/exams/progress/${userId}`); // Corrected endpoint

      if (Array.isArray(response.data.examProgress)) {
        const attempts: Record<string, number> = {};
        const scores: Record<string, number> = {};

        response.data.examProgress.forEach((attempt: any) => {
          attempts[attempt.examId] = (attempts[attempt.examId] || 0) + 1;
          if (!scores[attempt.examId] || attempt.score > scores[attempt.examId]) {
            scores[attempt.examId] = attempt.score;
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
            setError('Exam progress not found.');
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
      setExamAttempts({});
      setExamScores({});
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (exam: Exam) => {
    navigation.navigate('ExamDetail', {
      examId: exam.id,
      title: exam.title,
    });
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
    // Create a more robust mapping that handles the full exam IDs
    const iconMap: { [key: string]: any } = {
      'cloud-digital-leader-exam': require('../assets/images/cloud-digital-leader.png'),
      'cloud-architect-exam': require('../assets/images/cloud-architect.png'),
      'cloud-data-engineer': require('../assets/images/data-engineer.png'),
      'cloud-security-exam': require('../assets/images/security-engineer.png'),
      // Add more mappings as needed...
    };
  
    // Handle cases where the exam ID is not found in the map
    const icon = iconMap[examId] || require('../assets/images/cloud_generic.png');
    return icon;
  };
  
  // --- Loading/Error states ---
  if (userIdLoading) {
    return (
      <View style={styles.errorContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading user data...</Text>
      </View>
    );
  }

  if (userIdError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{userIdError}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={handleRetry}>
          Retry
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
       {/* Use string keys */}
      <Title style={styles.screenTitle}>{strings.certificationPracticeExamsTitle}</Title>
      <Paragraph style={styles.screenDescription}>
         {strings.certificationPracticeExamsDescription}
      </Paragraph>

      {loading ? ( // Separate loading indicator for exams list
        <ActivityIndicator style={styles.loader} />
      ) : (
        exams.map((exam) => (
          <Card key={exam.id} style={styles.card}>
            <Card.Content>
              <View style={styles.headerRow}>
                <View style={styles.iconContainer}>
                  <Image
                    source={exam.icon}
                    style={styles.icon}
                    resizeMode="contain"
                  />
                </View>
                <Title style={styles.title}>{exam.title}</Title>
              </View>
              <Paragraph>{exam.description}</Paragraph>

              <View style={styles.examDetails}>
                <View style={styles.examDetailItem}>
                   {/* Use string key */}
                  <Text style={styles.detailLabel}>{strings.durationLabel}</Text>
                  {/* Use template literal with string key */}
                  <Text style={styles.detailValue}>{exam.duration ? `${exam.duration} ${strings.minutesSuffix}`: 'N/A'}</Text>
                </View>

                <View style={styles.examDetailItem}>
                   {/* Use string key */}
                  <Text style={styles.detailLabel}>{strings.passRateLabel}</Text>
                   {/* Use template literal with string key */}
                  <Text style={styles.detailValue}>{exam.passingRate ? `${exam.passingRate}${strings.percentSuffix}` : 'N/A'}</Text>
                </View>
              </View>

              {examAttempts[exam.id] > 0 && (
                <View style={styles.progressContainer}>
                  {/* Use template literal with string key */}
                  <Text style={styles.progressText}>{`${strings.previousAttemptsPrefix}${examAttempts[exam.id]}`}</Text>
                  {examScores[exam.id] !== undefined && ( // Check if score exists
                     /* Use template literal with string key */
                    <Text style={styles.progressText}>{`${strings.bestScorePrefix}${examScores[exam.id].toFixed(1)}${strings.percentSuffix}`}</Text>
                  )}
                </View>
              )}
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => handleStartExam(exam)}
                style={styles.startButton}
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
    backgroundColor: '#f5f5f5',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  screenDescription: {
    marginBottom: 24,
    color: '#666',
  },
  loader: {
    marginTop: 24,
  },
  card: {
    marginBottom: 16,
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
  },
  examDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  examDetailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    marginBottom: 4,
  },
  startButton: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginBottom: 16,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});

export default ExamsScreen;
