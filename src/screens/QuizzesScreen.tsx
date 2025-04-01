import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card, Title, Paragraph, Button, Text } from 'react-native-paper';
import CloudStorage from '../assets/icons/cloud_storage.svg';
import ComputeEngine from '../assets/icons/compute_engine.svg';
import CloudFunctions from '../assets/icons/cloud_functions.svg';
import KubernetesEngine from '../assets/icons/google_kubernetes_engine.svg';
import CloudGeneric from '../assets/icons/cloud_generic.svg';
import StreamingAnalyticsIcon from '../assets/icons/streaming_analytics.svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useNavigation } from '@react-navigation/native';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_BASE_URL } from '@env';

const BASE_URL = REACT_APP_BASE_URL;

interface Quiz {
  id: string;
  title: string;
  description: string; // Added description
  questionCount: number; // Added questionCount
  icon: React.FC;
  moduleId: string;
}

// Define the icon map for the quizzes
const iconMap: { [key: string]: React.FC } = {
  'cloud-storage': CloudStorage,
  'compute-engine': ComputeEngine,
  'cloud-functions': CloudFunctions,
  'kubernetes-engine': KubernetesEngine,
  'cloud-generic': CloudGeneric,
  'streaming-analytics': StreamingAnalyticsIcon,
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'QuizzesDetail'>;

const QuizzesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
        } else {
          console.warn(
            'No user ID found in AsyncStorage. User might not be logged in.',
          );
          // Handle the case where there's no user ID (e.g., redirect to login)
          // For now, let's redirect to the Auth screen
          navigation.navigate('Auth');
        }
      } catch (e) {
        console.error('Error getting user ID:', e);
      }
    };

    fetchUserId();
  }, [navigation]);

  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      setError(null);
      try {
        // Replace with your actual API endpoint
        const response = await axios.get(`${BASE_URL}/api/v1/quizzes/list-quizzes`); // Corrected URL
        console.log('API Response:', response.data); // Log the entire API response

        // Map the API response to the Quiz interface
        const formattedQuizzes: Quiz[] = response.data.quizzes.map(
          (quiz: any) => {
            console.log('Quiz Data from API:', quiz); // Log each quiz object
            return {
              id: quiz.id,
              title: quiz.title,
              description: quiz.description, // Added description
              questionCount: quiz.questions.length, // Added questionCount
              icon: iconMap[quiz.moduleId] || CloudGeneric, // Default to CloudGeneric if icon not found
              moduleId: quiz.moduleId,
            };
          },
        );
        console.log('Formatted Quizzes:', formattedQuizzes); // Log the formatted quizzes
        setQuizzes(formattedQuizzes);
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const axiosError = err as AxiosError;
          if (axiosError.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error(
              'Server responded with:',
              axiosError.response.status,
              axiosError.response.data,
            );
            setError(
              `Server Error: ${axiosError.response.status} - ${
                axiosError.response.data || axiosError.response.statusText
              }`,
            );
          } else if (axiosError.request) {
            // The request was made but no response was received
            console.error('No response received:', axiosError.request);
            setError(
              'Network error: Unable to connect to server. Please check your connection.',
            );
          } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error setting up the request:', axiosError.message);
            setError(`Error: ${axiosError.message}`);
          }
        } else {
          // Handle non-Axios errors
          console.error('An unexpected error occurred:', err);
          setError(`An unexpected error occurred: ${err}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  const handleStartQuiz = (moduleId: string) => {
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please log in again.');
      return;
    }
    navigation.navigate('QuizzesDetail', { moduleId: moduleId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading quizzes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {quizzes.map(quiz => {
        const Icon = quiz.icon;
        console.log('Quiz Data for UI:', quiz); // Log each quiz object before rendering
        return (
          <Card key={quiz.id} style={styles.card}>
            <Card.Content>
              <View style={styles.headerRow}>
                <View style={styles.iconContainer}>
                  <Icon
                    width={34}
                    height={34}
                    {...(Icon as React.SVGProps<SVGSVGElement>)}
                  />
                </View>
                <Title style={styles.title}>{quiz.title}</Title>
              </View>
              <Paragraph>{quiz.description}</Paragraph> {/* Display description */}
              <Paragraph style={styles.questionCount}>
              {`${quiz.questionCount} Questions`} {/* Use template literal */}
              </Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button
                mode="contained"
                onPress={() => handleStartQuiz(quiz.moduleId)} // Corrected line
              >
                Start Quiz
              </Button>
            </Card.Actions>
          </Card>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    marginRight: 12,
    width: 34, // Set a fixed width
    height: 34, // Set a fixed height
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginLeft: 8,
  },
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
  questionCount: {
    marginTop: 8,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});

export default QuizzesScreen;
