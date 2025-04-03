import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Card, Title, Paragraph, Button, Text } from 'react-native-paper';
import CloudStorage from '../assets/icons/cloud_storage.svg';
import ComputeEngine from '../assets/icons/compute_engine.svg';
import CloudFunctions from '../assets/icons/cloud_functions.svg';
import KubernetesEngine from '../assets/icons/google_kubernetes_engine.svg';
import CloudGenericIcon from '../assets/icons/cloud_generic.svg';
import StreamingAnalyticsIcon from '../assets/icons/streaming_analytics.svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useNavigation } from '@react-navigation/native';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_BASE_URL } from '@env';
import strings from '../localization/strings'; // Adjust the path as needed

const BASE_URL = REACT_APP_BASE_URL;

interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  icon: React.FC;
  moduleId: string;
}

// Define the icon map for the quizzes
const iconMap: { [key: string]: React.FC } = {
  'cloud-storage': CloudStorage,
  'compute-engine': ComputeEngine,
  'cloud-functions': CloudFunctions,
  'kubernetes-engine': KubernetesEngine,
  'cloud-generic': CloudGenericIcon,
  'data-transformation': StreamingAnalyticsIcon,
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
        const response = await axios.get(`${BASE_URL}/api/v1/quizzes/list-quizzes`);
        console.log('API Response:', response.data);

        if (!response.data || !response.data.quizzes || !Array.isArray(response.data.quizzes)) {
          setError('Invalid response format from server');
          return;
        }

        const formattedQuizzes: Quiz[] = response.data.quizzes.map((quiz: any) => {
          // Ensure all properties are valid string or number values
          return {
            id: String(quiz.id || ''),
            title: String(quiz.title || ''),
            description: String(quiz.description || ''),
            questionCount: quiz.questions && Array.isArray(quiz.questions) ? quiz.questions.length : 0,
            icon: iconMap[quiz.moduleId] || CloudGenericIcon,
            moduleId: String(quiz.moduleId || ''),
          };
        });
        
        setQuizzes(formattedQuizzes);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  // Separate function to handle errors
  const handleError = (err: any) => {
    if (axios.isAxiosError(err)) {
      const axiosError = err as AxiosError;
      if (axiosError.response) {
        let errorMessage = `Server Error: ${axiosError.response.status}`;
        
        // Safely handle response data regardless of type
        if (axiosError.response.data) {
          if (typeof axiosError.response.data === 'string') {
            errorMessage += ` - ${axiosError.response.data}`;
          } else if (typeof axiosError.response.data === 'object') {
            try {
              errorMessage += ` - ${JSON.stringify(axiosError.response.data)}`;
            } catch (e) {
              errorMessage += ' - [Complex Error Object]';
            }
          }
        }
        
        setError(errorMessage);
      } else if (axiosError.request) {
        setError('Network error: Unable to connect to server. Please check your connection.');
      } else {
        setError(`Error: ${String(axiosError.message)}`);
      }
    } else {
      setError(`An unexpected error occurred: ${String(err)}`);
    }
  };

  const handleStartQuiz = (moduleId: string) => {
    if (!userId) {
      // Use react-native's Alert instead of directly rendering strings
      const { Alert } = require('react-native');
      Alert.alert(
        strings.errorTitle,
        strings.errorUserIDNotFound
      );
      return;
    }
    navigation.navigate('QuizzesDetail', { moduleId: moduleId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>{strings.loadingQuizzes || 'Loading...'}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{String(error)}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {quizzes.length > 0 ? (
        quizzes.map(quiz => {
          const Icon = quiz.icon;
          return (
            <Card key={quiz.id} style={styles.card}>
              <Card.Content>
                <View style={styles.headerRow}>
                  <View style={styles.iconContainer}>
                    {Icon && (
                      <Icon
                        width={34}
                        height={34}
                        {...(Icon as React.SVGProps<SVGSVGElement>)}
                      />
                    )}
                  </View>
                  <Title style={styles.title}>{String(quiz.title)}</Title>
                </View>
                <Paragraph>{String(quiz.description)}</Paragraph>
                <Paragraph style={styles.questionCount}>
                  {`${quiz.questionCount} ${strings.questionsSuffix || 'Questions'}`}
                </Paragraph>
              </Card.Content>
              <Card.Actions>
                <Button
                  mode="contained"
                  onPress={() => handleStartQuiz(quiz.moduleId)}
                >
                  {strings.startQuiz || 'Start Quiz'}
                </Button>
              </Card.Actions>
            </Card>
          );
        })
      ) : (
        <View style={styles.noQuizzesContainer}>
          <Text>No quizzes available</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    marginRight: 12,
    width: 34,
    height: 34,
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
    padding: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  noQuizzesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
});

export default QuizzesScreen;