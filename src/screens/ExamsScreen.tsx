import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { Card, Title, Paragraph, Button, ActivityIndicator, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_BASE_URL } from '@env';

const BASE_URL = REACT_APP_BASE_URL; 

type ExamsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExamDetail'>;

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: number;
  passRate?: number;
  questionsCount?: number;
}

const ExamsScreen = () => {
  const navigation = useNavigation<ExamsScreenNavigationProp>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exams] = useState<Exam[]>([
    {
      id: 'cloud-digital-leader-exam',
      title: 'Cloud Digital Leader',
      description: 'Cloud Digital LeaderCertification Practice Exam',
      duration: '2 hours',
      icon: require('../assets/images/cloud-digital-leader.png'),
      passRate: 70,
      questionsCount: 50,
    },
      {
      id: 'cloud-architect-exam',
      title: 'Professional Cloud Architect',
      description: 'Professional Cloud Architect Certification Practice Exam',
      duration: '2 hours',
      icon: require('../assets/images/cloud-architect.png'),
      passRate: 70,
      questionsCount: 50,
    },
    {
      id: 'cloud-engineer-exam',
      title: 'Professional Data Engineer',
      description: 'Professional Data Engineer Certification Practice Exam',
      duration: '2 hours',
      icon: require('../assets/images/data-engineer.png'),
      passRate: 70,
      questionsCount: 50,
    },

    {
      id: 'cloud-security-engineer-exam',
      title: 'Security Engineer',
      description: 'Professional Security Engineer Certification Practice Exam',
      duration: '2 hours',
      icon: require('../assets/images/security-engineer.png'),
      passRate: 70,
      questionsCount: 50,
    },
  ]);

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

  const fetchExamAttempts = async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get(`${BASE_URL}/api/v1/exams/progress/{userId}`); // Corrected endpoint

      if (response.data) {
        const attempts: Record<string, number> = {};
        const scores: Record<string, number> = {};

        response.data.forEach((attempt: any) => {
          attempts[attempt.examId] = (attempts[attempt.examId] || 0) + 1;
          if (!scores[attempt.examId] || attempt.score > scores[attempt.examId]) {
            scores[attempt.examId] = attempt.score;
          }
        });

        setExamAttempts(attempts);
        setExamScores(scores);
      }
    // eslint-disable-next-line no-catch-shadow, @typescript-eslint/no-shadow
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
      <Title style={styles.screenTitle}>Certification Practice Exams</Title>
      <Paragraph style={styles.screenDescription}>
        Test your knowledge with full-length practice exams for Google Cloud certifications.
        Each exam simulates the actual certification experience.
      </Paragraph>

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        exams.map((exam) => (
          <Card key={exam.id} style={styles.card}>
            <Card.Content>
              <View style={styles.headerRow}>
                <Image
                  source={exam.icon}
                  style={styles.icon}
                  resizeMode="contain"
                />
                <Title style={styles.title}>{exam.title}</Title>
              </View>
              <Paragraph>{exam.description}</Paragraph>

              <View style={styles.examDetails}>
                <View style={styles.examDetailItem}>
                  <Text style={styles.detailLabel}>Duration</Text>
                  <Text style={styles.detailValue}>{exam.duration}</Text>
                </View>

                <View style={styles.examDetailItem}>
                  <Text style={styles.detailLabel}>Questions</Text>
                  <Text style={styles.detailValue}>{exam.questionsCount}</Text>
                </View>

                <View style={styles.examDetailItem}>
                  <Text style={styles.detailLabel}>Pass Rate</Text>
                  <Text style={styles.detailValue}>{exam.passRate}%</Text>
                </View>
              </View>

              {examAttempts[exam.id] > 0 && (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    Previous attempts: {examAttempts[exam.id]}
                  </Text>
                  {examScores[exam.id] && (
                    <Text style={styles.progressText}>
                      Best score: {examScores[exam.id].toFixed(1)}%
                    </Text>
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
                Start Practice Exam
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
  icon: {
    width: 52,
    height: 52,
    marginRight: 12,
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
