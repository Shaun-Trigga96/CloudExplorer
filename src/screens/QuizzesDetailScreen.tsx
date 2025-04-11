// c:\Users\thabi\Desktop\CloudExplorer\src\screens\QuizzesDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator, // Import ActivityIndicator
} from 'react-native';
import axios, { AxiosError } from 'axios';
import { Button, Card, Paragraph, Title, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import {REACT_APP_BASE_URL} from '@env';
import { useTheme as useCustomTheme } from '../context/ThemeContext'; // Import your custom theme hook

const BASE_URL = REACT_APP_BASE_URL;

// --- Define Theme Colors (Matching other screens) ---
const lightColors = {
  background: '#F0F2F5',
  surface: '#FFFFFF',
  primary: '#007AFF',
  text: '#1C1C1E',
  textSecondary: '#6E6E73',
  border: '#D1D1D6',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FFC107',
  buttonText: '#FFFFFF',
  selectedAnswerBackground: '#007AFF',
  selectedAnswerText: '#FFFFFF',
  correctBackground: '#e8f5e9', // Light green
  wrongBackground: '#ffebee', // Light red
  neutralBackground: '#f0f2f5', // Light gray
  explanationBackground: '#f0f2f5',
};

const darkColors = {
  background: '#000000',
  surface: '#1C1C1E',
  primary: '#0A84FF',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#3A3A3C',
  error: '#FF453A',
  success: '#32D74B',
  warning: '#FFD60A',
  buttonText: '#FFFFFF',
  selectedAnswerBackground: '#0A84FF',
  selectedAnswerText: '#FFFFFF',
  correctBackground: 'rgba(50, 215, 75, 0.2)', // Darker green with opacity
  wrongBackground: 'rgba(255, 69, 58, 0.2)', // Darker red with opacity
  neutralBackground: '#2C2C2E', // Dark gray
  explanationBackground: '#2C2C2E',
};
// --- End Theme Colors ---


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
interface ApiQuiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  moduleId: string;
}

const QuizzesDetailScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { moduleId } = route.params;
  const { isDarkMode } = useCustomTheme(); // Use your custom theme hook
  const colors = isDarkMode ? darkColors : lightColors; // Select color palette

  console.log('moduleId:', moduleId);
  const [quiz, setQuiz] = useState<Quiz[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Start loading true
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
  setLoading(true); // Ensure loading is true at the start
  setError(null); // Reset error
  try {
    const moduleResponse = await axios.get(`${BASE_URL}/api/v1/modules/${moduleId}`); // Corrected URL
    setModuleTitle(moduleResponse.data.title);
    // Fetch the list of quizzes
    const quizzesResponse = await axios.get(`${BASE_URL}/api/v1/quizzes/list-quizzes`);
    const quizzes: ApiQuiz[] = quizzesResponse.data.quizzes;
    // Find the quiz associated with the current module
    const currentQuiz = quizzes.find(q => q.moduleId === moduleId);
    if (!currentQuiz) {
      throw new Error(`No quiz found for module ID: ${moduleId}`);
    }
    console.log("Fetching quiz questions for quizId:", currentQuiz.id); // Log 2: quizId before quiz request
    // Fetch the quiz questions using the correct quiz ID
    const quizResponse = await axios.get(`${BASE_URL}/api/v1/quizzes/${currentQuiz.id}`); // Corrected URL
    setQuiz(quizResponse.data.questions);
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Quiz...</Text>
      </View>
    );
  }

  if (error) {
    return (
        <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            {/* Optional: Add a retry button */}
            <Button
                mode="contained"
                onPress={() => { /* Implement retry logic if needed, e.g., call fetchQuiz() */ }}
                style={{ backgroundColor: colors.primary, marginTop: 15 }}
                labelStyle={{ color: colors.buttonText }}
            >
                Retry
            </Button>
        </View>
    );
  }

  if (!quiz || !moduleTitle) {
    // This case might happen briefly or if there's an issue not caught by error state
    return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Preparing quiz...</Text>
        </View>
    );
  }

  if (showResults) {
    const score = calculateScore();
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}>
        <Animated.View style={[styles.resultCard, { opacity: fadeAnim, backgroundColor: colors.surface }]}>
          <Title style={[styles.resultTitle, { color: colors.text }]}>Quiz Results</Title>
          <Text style={[styles.resultScore, { color: colors.primary }]}>
            {score} / {quiz.length}
          </Text>
          <Text style={[styles.scorePercentage, { color: colors.textSecondary }]}>
            {Math.round((score / quiz.length) * 100)}%
          </Text>

          <View style={styles.resultActions}>
            <Button
              mode="contained"
              onPress={() => handleRetry()}
              style={[styles.retryButton, { backgroundColor: colors.success }]} // Use success color for retry
              labelStyle={[styles.buttonText, { color: colors.buttonText }]}>
              Try Again
            </Button>

            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={[styles.retryButton, { backgroundColor: colors.primary }]} // Use primary for back
              labelStyle={[styles.buttonText, { color: colors.buttonText }]}>
              Back to Module
            </Button>
          </View>
        </Animated.View>

        <Title style={[styles.reviewTitle, { color: colors.text }]}>Review Answers</Title>

        {quiz.map(question => {
          const userAnswer = userAnswers[question.id];
          const isCorrect = isAnswerCorrect(question.id);

          return (
            <Card
              key={question.id}
              style={[
                styles.reviewCard,
                { backgroundColor: colors.surface }, // Use surface for card background
                isCorrect ? [styles.correctCard, { borderLeftColor: colors.success }] : [styles.incorrectCard, { borderLeftColor: colors.error }],
              ]}>
              <Card.Content>
                <View style={styles.questionHeader}>
                  <IconButton
                    icon={isCorrect ? 'check-circle' : 'close-circle'}
                    iconColor={isCorrect ? colors.success : colors.error} // Use theme colors for icon
                    size={24}
                    style={styles.statusIcon}
                  />
                  <Paragraph style={[styles.reviewQuestion, { color: colors.text }]}>
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
                            ? { backgroundColor: colors.correctBackground } // Use theme correct background
                            : userAnswer === answer.letter && !isCorrect
                              ? { backgroundColor: colors.wrongBackground } // Use theme wrong background
                              : { backgroundColor: colors.neutralBackground }, // Use theme neutral background
                        ]}>
                        <Text style={[styles.answerLetter, { color: colors.textSecondary }]}>
                          {answer.letter.toUpperCase()}
                        </Text>
                        <Text style={[styles.reviewAnswerText, { color: colors.text }]}>
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
                            ? { backgroundColor: colors.correctBackground }
                            : userAnswer === option && !isCorrect
                              ? { backgroundColor: colors.wrongBackground }
                              : { backgroundColor: colors.neutralBackground },
                        ]}>
                        <Text style={[styles.reviewAnswerText, { color: colors.text }]}>{option}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {!isCorrect && (
                  <View style={[styles.explanationContainer, { backgroundColor: colors.explanationBackground }]}>
                    <Text style={[styles.explanationTitle, { color: colors.text }]}>Explanation:</Text>
                    <Text style={[styles.explanationText, { color: colors.textSecondary }]}>
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
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}>
      <Animated.View style={[styles.header, { opacity: fadeAnim, backgroundColor: colors.surface }]}>
        <Title style={[styles.moduleTitle, { color: colors.primary }]}>{moduleTitle} Quiz</Title>
        <Text style={[styles.progress, { color: colors.textSecondary }]}>
          Progress: {Object.keys(userAnswers).length} / {quiz.length}
        </Text>
      </Animated.View>
      {quiz.map(question => (
        <Animated.View
          key={question.id}
          style={[styles.card, { opacity: fadeAnim, backgroundColor: colors.surface }]}>
          <Card.Content>
            <Paragraph style={[styles.question, { color: colors.text }]}>{question.question}</Paragraph>
            {question.answers.length > 0 ? (
              <View style={styles.answerContainer}>
                {question.answers.map(answer => (
                  <TouchableOpacity
                    key={answer.uniqueKey}
                    onPress={() => handleAnswer(question.id, answer.letter)}
                    style={[
                      styles.answerButton,
                      { backgroundColor: colors.surface, borderColor: colors.border }, // Use theme colors
                      userAnswers[question.id] === answer.letter &&
                      [styles.selectedAnswer, { backgroundColor: colors.selectedAnswerBackground, borderColor: colors.selectedAnswerBackground }], // Use theme selected colors
                    ]}
                    activeOpacity={0.7}>
                    <View style={styles.answerInner}>
                      <Text
                        style={[
                          styles.answerLetter,
                          { color: colors.textSecondary }, // Use theme secondary text
                          userAnswers[question.id] === answer.letter &&
                          [styles.selectedAnswerLetter, { color: colors.selectedAnswerText }], // Use theme selected text
                        ]}>
                        {answer.letter.toUpperCase()}
                      </Text>
                      <Text
                        style={[
                          styles.answerText,
                          { color: colors.text }, // Use theme text
                          userAnswers[question.id] === answer.letter &&
                          [styles.selectedAnswerText, { color: colors.selectedAnswerText }], // Use theme selected text
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
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    userAnswers[question.id] === 'True' &&
                    [styles.selectedAnswer, { backgroundColor: colors.selectedAnswerBackground, borderColor: colors.selectedAnswerBackground }],
                  ]}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.answerText,
                      { color: colors.text },
                      userAnswers[question.id] === 'True' &&
                      [styles.selectedAnswerText, { color: colors.selectedAnswerText }],
                    ]}>
                    True
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  key={`${question.id}-false`}
                  onPress={() => handleAnswer(question.id, 'False')}
                  style={[
                    styles.answerButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    userAnswers[question.id] === 'False' &&
                    [styles.selectedAnswer, { backgroundColor: colors.selectedAnswerBackground, borderColor: colors.selectedAnswerBackground }],
                  ]}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.answerText,
                      { color: colors.text },
                      userAnswers[question.id] === 'False' &&
                      [styles.selectedAnswerText, { color: colors.selectedAnswerText }],
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
        style={[styles.submitButton, { backgroundColor: colors.primary }]} // Use theme primary
        labelStyle={[styles.buttonText, { color: colors.buttonText }]} // Use theme button text
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
    // backgroundColor applied dynamically
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor applied dynamically
  },
  error: {
    padding: 20,
    fontSize: 16,
    // color applied dynamically
    textAlign: 'center',
    fontFamily: 'System',
  },

  // --- Header ---
  header: {
    marginBottom: 20,
    padding: 15,
    // backgroundColor applied dynamically
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
    // color applied dynamically
    textAlign: 'center',
    marginBottom: 5,
    fontFamily: 'System',
  },
  progress: {
    fontSize: 14,
    // color applied dynamically
    textAlign: 'center',
    fontFamily: 'System',
  },
  loadingText: {
    fontSize: 18,
    // color applied dynamically
    fontFamily: 'System',
  },

  // --- Quiz Card ---
  card: {
    // backgroundColor applied dynamically
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
    // color applied dynamically
    marginBottom: 15,
    lineHeight: 24,
    fontFamily: 'System',
  },

  // --- Answer Options ---
  answerContainer: {
    gap: 10,
  },
  answerButton: {
    // backgroundColor applied dynamically
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    // borderColor applied dynamically
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
    // color applied dynamically
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  answerText: {
    fontSize: 16,
    // color applied dynamically
    fontFamily: 'System',
  },
  selectedAnswer: {
    // backgroundColor applied dynamically
    // borderColor applied dynamically
    shadowOpacity: 0.2,
  },
  selectedAnswerText: {
    // color applied dynamically
  },
  selectedAnswerLetter: {
    // color applied dynamically
  },

  // --- Submit Button ---
  submitButton: {
    marginTop: 20,
    paddingVertical: 12,
    // backgroundColor applied dynamically
    borderRadius: 10,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    // color applied dynamically
    fontFamily: 'System',
  },

  // --- Result Card ---
  resultCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    // backgroundColor applied dynamically
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
    // color applied dynamically
    marginBottom: 10,
    fontFamily: 'System',
  },
  resultScore: {
    fontSize: 36,
    fontWeight: '800',
    // color applied dynamically
    marginBottom: 20,
    fontFamily: 'System',
  },
  scorePercentage: {
    fontSize: 24,
    // color applied dynamically
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
    // backgroundColor applied dynamically
    borderRadius: 10,
    elevation: 3,
  },

// --- Review Section ---
reviewTitle: {
  fontSize: 22,
  fontWeight: 'bold',
  marginTop: 20,
  marginBottom: 10,
  // color applied dynamically
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
  // backgroundColor applied dynamically
},
correctCard: {
  borderLeftWidth: 8, // Increased border width
  // borderLeftColor applied dynamically
},
incorrectCard: {
  borderLeftWidth: 8, // Increased border width
  // borderLeftColor applied dynamically
},
questionHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  padding: 15,
  paddingBottom: 0, // Reduced padding at the bottom
},
statusIcon: {
  marginRight: 10,
  // iconColor applied dynamically
  // backgroundColor: '#1a73e8', // Consider removing or making dynamic
  borderRadius: 100, // Make it circular
  padding: 5, // Add some padding around the icon
},
reviewQuestion: {
  fontSize: 18,
  fontWeight: '600',
  // color applied dynamically
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
  // backgroundColor applied dynamically
},
reviewAnswerText: {
  fontSize: 16,
  // color applied dynamically
  flex: 1, // Allow the text to take up available space
  lineHeight: 22, // Added line height for better readability
},
neutralAnswer: {
  // backgroundColor applied dynamically
},
correctAnswer: {
  // backgroundColor applied dynamically
},
wrongAnswer: {
  // backgroundColor applied dynamically
},
explanationContainer: {
  marginTop: 15, // Increased margin top
  padding: 15, // Increased padding
  // backgroundColor applied dynamically
  borderRadius: 12, // Increased border radius
},
explanationTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  // color applied dynamically
  marginBottom: 8, // Increased margin bottom
},
explanationText: {
  fontSize: 15, // Slightly reduced font size
  // color applied dynamically
  lineHeight: 22, // Added line height for better readability
},
});

export default QuizzesDetailScreen;
