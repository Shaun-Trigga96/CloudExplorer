import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import axios, { AxiosError } from 'axios';
import { Button, Card, Paragraph, Title, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import {REACT_APP_BASE_URL} from '@env';

const BASE_URL = REACT_APP_BASE_URL; 

interface Answer {
  letter: string;
  answer: string;
  uniqueKey: string;
}

interface QuestionType {
  question: string;
  answers: Answer[];
  correctAnswer: string;
  explanation: string;
}

interface Quiz extends QuestionType {
  id: number;
}

const QuizzesDetailScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { moduleId } = route.params;
  console.log('moduleId:', moduleId);
  const [quiz, setQuiz] = useState<Quiz[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null); // Initialize with null
  const [submittingResults, setSubmittingResults] = useState<boolean>(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Get user ID from AsyncStorage
    const getUserId = async () => {
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

    getUserId();

    const fetchQuiz = async () => {
      setLoading(true);
      try {
        const moduleResponse = await axios.get(`${BASE_URL}/api/v1/modules/${moduleId}`); // Corrected URL
        setModuleTitle(moduleResponse.data.title);

        const quizResponse = await axios.post(`${BASE_URL}/api/v1/quizzes/generate`, {
          moduleId,
        });
        const formattedQuiz = quizResponse.data.quiz
          .filter((q: Quiz) => {
            const isValidQuestion =
              q.question &&
              q.question.trim().length > 0 &&
              (q.correctAnswer === 'True' ||
                q.correctAnswer === 'False' ||
                ['a', 'b', 'c', 'd'].includes(q.correctAnswer));
            return (
              isValidQuestion &&
              (q.answers.length > 0 ||
                q.correctAnswer === 'True' ||
                q.correctAnswer === 'False')
            );
          })
          .map((q: Quiz, index: number) => ({
            ...q,
            id: index, // Assign a unique ID based on index
            question: q.question.replace(/\s*\(question\)\s*/g, '').trim(),
            answers: q.answers.map((a: any, answerIndex: number) => ({
              letter: a.letter,
              answer: a.answer.replace(/\s*\(answer\)\s*/g, '').trim(),
              uniqueKey: `${index}-${a.letter}-${answerIndex}`, // Ensure unique key for answers
            })),
          }));
        setQuiz(formattedQuiz);
        // eslint-disable-next-line no-catch-shadow, @typescript-eslint/no-shadow
      } catch (error: any) {
        console.error('Error fetching quiz:', error); // Log the error
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          if (axiosError.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Server responded with:', axiosError.response.status, axiosError.response.data);
            setError(
              `Server Error: ${axiosError.response.status} - ${axiosError.response.data || axiosError.response.statusText}`,
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
          console.error('An unexpected error occurred:', error.message);
          setError(`An unexpected error occurred: ${error.message}`);
        }
      } finally {
        setLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    };

    fetchQuiz();
  }, [moduleId, fadeAnim, navigation]);

  const handleAnswer = (questionId: number, answerLetter: string) => {
    setUserAnswers({ ...userAnswers, [questionId]: answerLetter });
  };

  const calculateScore = () => {
    let score = 0;
    if (quiz) {
      quiz.forEach(question => {
        const userAnswer = userAnswers[question.id];
        if (
          userAnswer &&
          userAnswer.toLowerCase() === question.correctAnswer.toLowerCase()
        ) {
          score++;
        }
      });
    }
    return score;
  };

  const isAnswerCorrect = (questionId: number) => {
    if (!quiz) {
      return false;
    }
    const question = quiz.find(q => q.id === questionId);
    if (!question) {
      return false;
    }

    const userAnswer = userAnswers[questionId];
    return (
      userAnswer &&
      userAnswer.toLowerCase() === question.correctAnswer.toLowerCase()
    );
  };

  const submitQuizResults = async () => {
    if (!userId || !quiz) {
      console.error('userId or quiz is null');
      return;
    }

    setSubmittingResults(true);
    try {
      const score = calculateScore();
      await AsyncStorage.getItem('userId');
      await axios.post(`${BASE_URL}/api/v1/quizzes/save-result`, {
        userId,
        moduleId,
        quizId: quiz || '',
        score,
        totalQuestions: quiz.length,
        answers: userAnswers,
        timestamp: new Date().toISOString(),
      });

      setShowResults(true); // Set showResults to true after successfully saving the results
    } catch (err) {
      console.error('Error submitting quiz results:', err);
      Alert.alert(
        'Error',
        'Failed to save your quiz results. Your score has been calculated but progress may not be tracked.',
        [{ text: 'OK', onPress: () => setShowResults(true) }],
      );
    } finally {
      setSubmittingResults(false);
    }
  };

  const handleSubmit = () => {
    // Check if all questions have been answered
    if (quiz && Object.keys(userAnswers).length < quiz.length) {
      Alert.alert(
        'Incomplete Quiz',
        "You haven't answered all questions. Do you want to continue?",
        [
          { text: 'Continue Answering', style: 'cancel' },
          { text: 'Submit Anyway', onPress: submitQuizResults },
        ],
      );
    } else {
      submitQuizResults();
    }
  };

  const handleRetry = () => {
    setUserAnswers({});
    setShowResults(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  if (!quiz || !moduleTitle) {
    return null;
  }

  if (showResults) {
    const score = calculateScore();
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        <Animated.View style={[styles.resultCard, { opacity: fadeAnim }]}>
          <Title style={styles.resultTitle}>Quiz Results</Title>
          <Text style={styles.resultScore}>
            {score} / {quiz.length}
          </Text>
          <Text style={styles.scorePercentage}>
            {Math.round((score / quiz.length) * 100)}%
          </Text>

          <View style={styles.resultActions}>
            <Button
              mode="contained"
              onPress={() => handleRetry()}
              style={styles.retryButton}
              labelStyle={styles.buttonText}>
              Try Again
            </Button>

            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              // eslint-disable-next-line react-native/no-inline-styles
              style={[styles.retryButton, { backgroundColor: '#4285F4' }]}
              labelStyle={styles.buttonText}>
              Back to Module
            </Button>
          </View>
        </Animated.View>

        <Title style={styles.reviewTitle}>Review Answers</Title>

        {quiz.map(question => {
          const userAnswer = userAnswers[question.id];
          const isCorrect = isAnswerCorrect(question.id);


          return (
            <Card
              key={question.id}
              style={[
                styles.reviewCard,
                isCorrect ? styles.correctCard : styles.incorrectCard,
              ]}>
              <Card.Content>
                <View style={styles.questionHeader}>
                  <IconButton
                    icon={isCorrect ? 'check-circle' : 'close-circle'}
                    size={24}
                    style={styles.statusIcon}
                  />
                  <Paragraph style={styles.reviewQuestion}>
                    {question.question}
                  </Paragraph>
                </View>

                {question.answers.length > 0 ? (
                  // Multiple choice review
                  <View style={styles.reviewAnswersContainer}>
                    {question.answers.map(answer => (
                      <View
                        key={answer.uniqueKey}
                        style={[
                          styles.reviewAnswer,
                          answer.letter.toLowerCase() ===
                            question.correctAnswer.toLowerCase()
                            ? styles.correctAnswer
                            : userAnswer === answer.letter && !isCorrect
                              ? styles.wrongAnswer
                              : styles.neutralAnswer,
                        ]}>
                        <Text style={styles.answerLetter}>
                          {answer.letter.toUpperCase()}
                        </Text>
                        <Text style={styles.reviewAnswerText}>
                          {answer.answer}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  // True/False review
                  <View style={styles.reviewAnswersContainer}>
                    {['True', 'False'].map(option => (
                      <View
                        key={`${question.id}-${option.toLowerCase()}`} // Unique key for each option
                        style={[
                          styles.reviewAnswer,
                          question.correctAnswer === option
                            ? styles.correctAnswer
                            : userAnswer === option && !isCorrect
                              ? styles.wrongAnswer
                              : styles.neutralAnswer,
                        ]}>
                        <Text style={styles.reviewAnswerText}>{option}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {!isCorrect && (
                  <View style={styles.explanationContainer}>
                    <Text style={styles.explanationTitle}>Explanation:</Text>
                    <Text style={styles.explanationText}>
                      {question.explanation}
                    </Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Title style={styles.moduleTitle}>{moduleTitle} Quiz</Title>
        <Text style={styles.progress}>
          Progress: {Object.keys(userAnswers).length} / {quiz.length}
        </Text>
      </Animated.View>
      {quiz.map(question => (
        <Animated.View
          key={question.id}
          style={[styles.card, { opacity: fadeAnim }]}>
          <Card.Content>
            <Paragraph style={styles.question}>{question.question}</Paragraph>
            {question.answers.length > 0 ? (
              <View style={styles.answerContainer}>
                {question.answers.map(answer => (
                  <TouchableOpacity
                    key={answer.uniqueKey}
                    onPress={() => handleAnswer(question.id, answer.letter)}
                    style={[
                      styles.answerButton,
                      userAnswers[question.id] === answer.letter &&
                      styles.selectedAnswer,
                    ]}
                    activeOpacity={0.7}>
                    <View style={styles.answerInner}>
                      <Text
                        style={[
                          styles.answerLetter,
                          userAnswers[question.id] === answer.letter &&
                          styles.selectedAnswerLetter,
                        ]}>
                        {answer.letter.toUpperCase()}
                      </Text>
                      <Text
                        style={[
                          styles.answerText,
                          userAnswers[question.id] === answer.letter &&
                          styles.selectedAnswerText,
                        ]}>
                        {answer.answer}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.answerContainer}>
                <TouchableOpacity
                  key={`${question.id}-true`}
                  onPress={() => handleAnswer(question.id, 'True')}
                  style={[
                    styles.answerButton,
                    userAnswers[question.id] === 'True' &&
                    styles.selectedAnswer,
                  ]}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.answerText,
                      userAnswers[question.id] === 'True' &&
                      styles.selectedAnswerText,
                    ]}>
                    True
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  key={`${question.id}-false`}
                  onPress={() => handleAnswer(question.id, 'False')}
                  style={[
                    styles.answerButton,
                    userAnswers[question.id] === 'False' &&
                    styles.selectedAnswer,
                  ]}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.answerText,
                      userAnswers[question.id] === 'False' &&
                      styles.selectedAnswerText,
                    ]}>
                    False
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Card.Content>
        </Animated.View>
      ))}
      <Button
        mode="contained"
        onPress={() => handleSubmit()}
        style={styles.submitButton}
        labelStyle={styles.buttonText}
        loading={submittingResults}
        disabled={submittingResults}>
        Submit Quiz
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  // --- General Layout & Containers ---
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5', // Light gray background
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  error: {
    padding: 20,
    fontSize: 16,
    color: '#d93025', // Red error color
    textAlign: 'center',
    fontFamily: 'System',
  },

  // --- Header ---
  header: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  moduleTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a73e8', // Primary blue color
    textAlign: 'center',
    marginBottom: 5,
    fontFamily: 'System',
  },
  progress: {
    fontSize: 14,
    color: '#5f6368', // Gray text color
    textAlign: 'center',
    fontFamily: 'System',
  },
  loadingText: {
    fontSize: 18,
    color: '#5f6368',
    fontFamily: 'System',
  },

  // --- Quiz Card ---
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124', // Dark text color
    marginBottom: 15,
    lineHeight: 24,
    fontFamily: 'System',
  },

  // --- Answer Options ---
  answerContainer: {
    gap: 10,
  },
  answerButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0', // Light gray border
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  answerInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  answerLetter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5f6368', // Gray text color
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  answerText: {
    fontSize: 16,
    color: '#202124', // Dark text color
    fontFamily: 'System',
  },
  selectedAnswer: {
    backgroundColor: '#1a73e8', // Primary blue color
    borderColor: '#1a73e8',
    shadowOpacity: 0.2,
  },
  selectedAnswerText: {
    color: '#ffffff', // White text color
  },
  selectedAnswerLetter: {
    color: '#ffffff', // White text color
  },

  // --- Submit Button ---
  submitButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#1a73e8', // Primary blue color
    borderRadius: 10,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff', // White text color
    fontFamily: 'System',
  },

  // --- Result Card ---
  resultCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#202124', // Dark text color
    marginBottom: 10,
    fontFamily: 'System',
  },
  resultScore: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1a73e8', // Primary blue color
    marginBottom: 20,
    fontFamily: 'System',
  },
  scorePercentage: {
    fontSize: 24,
    color: '#5f6368', // Gray text color
    marginBottom: 20,
    fontFamily: 'System',
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  retryButton: {
    paddingVertical: 10,
    backgroundColor: '#34a853', // Green color
    borderRadius: 10,
    elevation: 3,
  },

// --- Review Section ---
reviewTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  marginTop: 20,
  marginBottom: 10,
  color: '#202124', // Dark text color
  textAlign: 'center', // Center the title
},
reviewCard: {
  borderRadius: 12,
  marginBottom: 20, // Increased margin for more space
  overflow: 'hidden',
  elevation: 3, // Slightly increased elevation
  shadowColor: '#000', // Added shadow color
  shadowOffset: { width: 0, height: 2 }, // Added shadow offset
  shadowOpacity: 0.1, // Added shadow opacity
  shadowRadius: 4, // Added shadow radius
},
correctCard: {
  borderLeftWidth: 8, // Increased border width
  borderLeftColor: '#34a853', // Green color
},
incorrectCard: {
  borderLeftWidth: 8, // Increased border width
  borderLeftColor: '#ea4335', // Red color
},
questionHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  padding: 15,
  paddingBottom: 0, // Reduced padding at the bottom
},
statusIcon: {
  marginRight: 10,
  color: '#fff', // White icon color
  backgroundColor: '#1a73e8', // Blue background for the icon
  borderRadius: 100, // Make it circular
  padding: 5, // Add some padding around the icon
},
reviewQuestion: {
  fontSize: 18,
  fontWeight: '600',
  color: '#202124', // Dark text color
  flex: 1, // Allow the question to take up available space
  lineHeight: 24, // Added line height for better readability
},
reviewAnswersContainer: {
  marginTop: 10, // Added margin top
  paddingHorizontal: 15, // Added horizontal padding
  paddingBottom: 15, // Added padding bottom
  gap: 10, // Added gap between answers
},
reviewAnswer: {
  borderRadius: 10,
  padding: 15, // Increased padding
  flexDirection: 'row', // Align letter and text horizontally
  alignItems: 'center', // Center items vertically
  gap: 10, // Added gap between letter and text
},
reviewAnswerText: {
  fontSize: 16,
  color: '#202124', // Dark text color
  flex: 1, // Allow the text to take up available space
  lineHeight: 22, // Added line height for better readability
},
neutralAnswer: {
  backgroundColor: '#f0f2f5', // Light gray
},
correctAnswer: {
  backgroundColor: '#e8f5e9', // Light green
},
wrongAnswer: {
  backgroundColor: '#ffebee', // Light red
},
explanationContainer: {
  marginTop: 15, // Increased margin top
  padding: 15, // Increased padding
  backgroundColor: '#f0f2f5', // Light gray
  borderRadius: 12, // Increased border radius
},
explanationTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#202124', // Dark text color
  marginBottom: 8, // Increased margin bottom
},
explanationText: {
  fontSize: 15, // Slightly reduced font size
  color: '#5f6368', // Gray text color
  lineHeight: 22, // Added line height for better readability
},
});

export default QuizzesDetailScreen;
