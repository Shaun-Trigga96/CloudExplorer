/* eslint-disable no-catch-shadow */
/* eslint-disable @typescript-eslint/no-shadow */
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Card, Title, Button, Text, RadioButton, Divider, ProgressBar, useTheme } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {REACT_APP_BASE_URL} from '@env';

const BASE_URL = REACT_APP_BASE_URL; 

// Add timeout and retry functionality to axios
axios.defaults.timeout = 10000; // 10 seconds timeout

type ExamDetailsScreenRouteProp = RouteProp<RootStackParamList, 'ExamDetail'>;
type ExamDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExamDetail'>;

interface ExamDetailsScreenProps {
  route: ExamDetailsScreenRouteProp;
  navigation: ExamDetailsScreenNavigationProp;
}

interface Answer {
  letter: string;
  answer: string;
  uniqueKey: string;
}

interface Question {
  id: number;
  question: string;
  answers: Answer[];
  correctAnswer: string;
  explanation: string;
}

interface ExamResult {
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  isPassed: boolean;
  answeredQuestions: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  }[];
}

interface ExamTimingData {
  startTime: string;
  timeSpent: number;
}

const ExamDetailsScreen: React.FC<ExamDetailsScreenProps> = ({ route, navigation }) => {
  const { examId, title } = route.params;
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [examCompleted, setExamCompleted] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(7200); // 2 hours in seconds
  const [examStarted, setExamStarted] = useState(false);
  const [examStartTime, setExamStartTime] = useState<Date | null>(null);
  const [examTiming, setExamTiming] = useState<ExamTimingData | null>(null);

  const fetchExamQuestions = useCallback(async () => {
  console.log('fetchExamQuestions: Starting to fetch exam questions...');
    try {
      setLoading(true);
      setError(null);

      // Fetch exam questions from your API
      const response = await axios.post(`${BASE_URL}/api/v1/exams/generate`, {
        examId,
        numberOfQuestions: 25, // Typical for certification practice exams
        questionTypes: ['multiple choice', 'true or false'],
      }, {
        timeout: 30000, // 20 seconds timeout for this specific request
      });

      if (response.data && response.data.questions) {
        setQuestions(response.data.questions);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Error fetching exam questions:', err);
      let errorMessage = 'Failed to load exam questions. Please try again.';

      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (err.response) {
        // Server responded with an error status
        if (err.response.status === 404) {
          errorMessage = 'Exam not found. Please check the exam ID.';
        } else {
          errorMessage = `Server error (${err.response.status}). Please try again later.`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Please check your network connection.';
      }

      setError(errorMessage);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  // Load any saved exam state when component mounts
  useEffect( () => {
    console.log('useEffect [examId, fetchExamQuestions]: Component mounted or dependencies changed.');
    const loadSavedExamState = async () => {
      try {
        const savedExamState = await AsyncStorage.getItem(`exam_${examId}_state`);
        if (savedExamState) {
          const parsedState = JSON.parse(savedExamState);
          setUserAnswers(parsedState.userAnswers || {});
          setCurrentQuestionIndex(parsedState.currentQuestionIndex || 0);
          setExamTiming(parsedState.examTiming || null);

          // If there was timing data, initialize the timer
          if (parsedState.examTiming) {
            const startDate = new Date(parsedState.examTiming.startTime);
            const currentDate = new Date();
            const elapsedSeconds = Math.floor((currentDate.getTime() - startDate.getTime()) / 1000);
            const remainingTime = Math.max(7200 - parsedState.examTiming.timeSpent - elapsedSeconds, 0);

            setTimeLeft(remainingTime);
            setExamStarted(true);
            setExamStartTime(startDate);
            console.log('useEffect [examId, fetchExamQuestions]: Loaded timer from saved state.');
          }
        } else {
          console.log('useEffect [examId, fetchExamQuestions]: No saved exam state found.');
        }
      } catch (error) {
        console.error('Error loading saved exam state:', error);
      }
    };

    loadSavedExamState();
    fetchExamQuestions();
  }, [examId, fetchExamQuestions]);

  // Save exam state when answers or current question changes
  useEffect(() => {
    const saveExamState = async () => {
      if (!examStarted || examCompleted) {
        console.log('useEffect [userAnswers, currentQuestionIndex, timeLeft, examId, examStarted, examCompleted, examStartTime]: Exam not started or already completed, skipping save.');
        return;
      }

      try {
        const examState = {
          userAnswers,
          currentQuestionIndex,
          examTiming: {
            startTime: examStartTime?.toISOString(),
            timeSpent: 7200 - timeLeft,
          },
        };
        console.log('useEffect [userAnswers, currentQuestionIndex, timeLeft, examId, examStarted, examCompleted, examStartTime]: Saving exam state:', examState);
        await AsyncStorage.setItem(`exam_${examId}_state`, JSON.stringify(examState));
        console.log('useEffect [userAnswers, currentQuestionIndex, timeLeft, examId, examStarted, examCompleted, examStartTime]: Exam state saved successfully.');
      } catch (error) {
        console.error('useEffect [userAnswers, currentQuestionIndex, timeLeft, examId, examStarted, examCompleted, examStartTime]: Error saving exam state:', error);
      }
    };

    saveExamState();
  }, [userAnswers, currentQuestionIndex, timeLeft, examId, examStarted, examCompleted, examStartTime]);

  const processExamSubmission = useCallback(async () => {
    console.log('processExamSubmission: Starting exam submission process...');
    try {
      setSubmitting(true);

      // Calculate results
      let correctAnswers = 0;
      const answeredQuestions = questions.map(question => {
        const userAnswer = userAnswers[question.id] || '';
        const isCorrect = userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();

        if (isCorrect) { correctAnswers++; }

        return {
          question: question.question,
          userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          explanation: question.explanation,
        };
      });

      const score = (correctAnswers / questions.length) * 100;
      const isPassed = score >= 70; // Typically 70% is passing for certification exams

      const result: ExamResult = {
        totalQuestions: questions.length,
        correctAnswers,
        score,
        isPassed,
        answeredQuestions,
      };
      console.log('processExamSubmission: Exam results calculated:', result);

      try {
        // Save exam results to your backend
        const saveResultUrl = `${BASE_URL}/api/v1/exams/save-result`;
        console.log('processExamSubmission: Saving results to backend:', saveResultUrl, result);
        await axios.post(saveResultUrl, {
          examId,
          result,
        });
        console.log('processExamSubmission: Results saved to backend successfully.');
      } catch (error) {
        console.error('processExamSubmission: Error saving results to backend:', error);
        // Continue anyway as we have the results locally
      }

      setExamResult(result);
      setExamCompleted(true);

      // Clear saved exam state when exam is completed
      try {
        await AsyncStorage.removeItem(`exam_${examId}_state`);
        console.log('processExamSubmission: Cleared saved exam state.');
      } catch (error) {
        console.error('processExamSubmission: Error clearing saved exam state:', error);
      }
    } catch (err) {
      console.error('processExamSubmission: Error submitting exam:', err);
      Alert.alert('Error', 'Failed to submit exam. Your results have been saved locally.');
    } finally {
      setSubmitting(false);
      console.log('processExamSubmission: Submission process finished.');
    }
  }, [examId, questions, userAnswers]);

  const submitExam = useCallback(async () => {
    console.log('submitExam: Attempting to submit the exam.');
    if (Object.keys(userAnswers).length < questions.length) {
      Alert.alert(
        'Incomplete Exam',
        `You've only answered ${Object.keys(userAnswers).length} out of ${questions.length} questions. Are you sure you want to submit?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit Anyway', onPress: processExamSubmission },
        ]
      );
      console.log('submitExam: Exam is incomplete, showing confirmation alert.');
    } else {
      console.log('submitExam: All questions answered, proceeding with submission.');
      processExamSubmission();
    }
  }, [userAnswers, questions, processExamSubmission]);

  // Handle timer countdown
  useEffect(() => {
    if (!examStarted || examCompleted) {
      console.log('useEffect [examStarted, examCompleted, submitExam]: Exam not started or completed, timer not running.');
      return;
    }

    console.log('useEffect [examStarted, examCompleted, submitExam]: Starting timer.');
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          console.log('useEffect [examStarted, examCompleted, submitExam]: Timer reached 0, submitting exam.');
          clearInterval(timer);
          submitExam();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      console.log('useEffect [examStarted, examCompleted, submitExam]: Timer cleared.');
    };
  }, [examStarted, examCompleted, submitExam]);


  const startExam = () => {
    console.log('startExam: Exam started.');
    const startTime = new Date();
    setExamStarted(true);
    setExamStartTime(startTime);
    setExamTiming({
      startTime: startTime.toISOString(),
      timeSpent: 0,
    });
  };

  const handleAnswerSelection = (questionId: number, answerLetter: string) => {
    console.log(`handleAnswerSelection: Question ID: ${questionId}, Answer: ${answerLetter} selected.`);
    setUserAnswers({
      ...userAnswers,
      [questionId]: answerLetter,
    });
    console.log('handleAnswerSelection: Current user answers:', {
      ...userAnswers,
      [questionId]: answerLetter,
    });
  };

  const navigateToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      console.log(`MapsToNextQuestion: Navigated to question index: ${currentQuestionIndex + 1}`);
    }
  };

  const navigateToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      console.log(`MapsToPreviousQuestion: Navigated to question index: ${currentQuestionIndex - 1}`);
    }
  };

  const navigateToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    console.log(`MapsToQuestion: Navigated to question index: ${index}`);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading exam questions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Network Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        {retryCount > 2 && (
          <View style={styles.troubleshootingContainer}>
            <Text style={styles.troubleshootingTitle}>Troubleshooting Tips:</Text>
            <Text style={styles.troubleshootingText}>• Check your internet connection</Text>
            <Text style={styles.troubleshootingText}>• Make sure your backend server is running</Text>
            <Text style={styles.troubleshootingText}>• Verify the server URL is correct (currently {BASE_URL})</Text>
            <Text style={styles.troubleshootingText}>• Check if your server is accessible from your device</Text>
          </View>
        )}
        <Button mode="contained" onPress={fetchExamQuestions} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  if (examCompleted && examResult) {
    return (
      <ScrollView style={styles.container}>
        <Card style={styles.resultCard}>
          <Card.Content>
            <Title style={styles.resultTitle}>
              Exam Results: {examResult.isPassed ? 'PASSED' : 'FAILED'}
            </Title>

            <View style={styles.resultSummary}>
              <Text style={styles.resultText}>
                Score: {examResult.score.toFixed(1)}%
              </Text>
              <Text style={styles.resultText}>
                Correct Answers: {examResult.correctAnswers} / {examResult.totalQuestions}
              </Text>
              <Text style={styles.resultText}>
                Passing Score: 70%
              </Text>
              {examStartTime && (
                <Text style={styles.resultText}>
                  Exam Started: {examStartTime.toLocaleString()}
                </Text>
              )}
              {examTiming && (
                <Text style={styles.resultText}>
                  Time Spent: {formatTime(7200 - timeLeft)}
                </Text>
              )}
            </View>

            <Divider style={styles.divider} />

            <Title style={styles.reviewTitle}>Question Review</Title>

            {examResult.answeredQuestions.map((item, index) => (
              <Card key={index} style={[
                styles.reviewCard,
                item.isCorrect ? styles.correctCard : styles.incorrectCard,
              ]}>
                <Card.Content>
                  <Text style={styles.questionNumber}>Question {index + 1}</Text>
                  <Text style={styles.questionText}>{item.question}</Text>

                  <View style={styles.answerReview}>
                    <Text>Your Answer: {item.userAnswer.toUpperCase() || 'Not Answered'}</Text>
                    <Text>Correct Answer: {item.correctAnswer.toUpperCase()}</Text>
                  </View>

                  <Divider style={styles.miniDivider} />

                  <Text style={styles.explanationTitle}>Explanation:</Text>
                  <Text style={styles.explanationText}>{item.explanation}</Text>
                </Card.Content>
              </Card>
            ))}
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Home')}
            style={styles.actionButton}
          >
            Back to Exams
          </Button>

          <Button
            mode="outlined"
            onPress={() => {
              setExamCompleted(false);
              setUserAnswers({});
              setCurrentQuestionIndex(0);
              setTimeLeft(7200);
              setExamStarted(false);
              setExamStartTime(null);
              setExamTiming(null);
              fetchExamQuestions();
            }}
            style={styles.actionButton}
          >
            Retake Exam
          </Button>
        </View>
      </ScrollView>
    );
  }

  if (!examStarted) {
    return (
      <View style={styles.startScreenContainer}>
        <Card style={styles.startCard}>
          <Card.Content>
            <Title style={styles.startTitle}>{title}</Title>
            <Text style={styles.startDescription}>
              You are about to start the {title} certification practice exam.
            </Text>

            <View style={styles.examInfoContainer}>
              <View style={styles.examInfoItem}>
                <Text style={styles.infoLabel}>Total Questions</Text>
                <Text style={styles.infoValue}>{questions.length}</Text>
              </View>

              <View style={styles.examInfoItem}>
                <Text style={styles.infoLabel}>Time Limit</Text>
                <Text style={styles.infoValue}>2 Hours</Text>
              </View>

              <View style={styles.examInfoItem}>
                <Text style={styles.infoLabel}>Passing Score</Text>
                <Text style={styles.infoValue}>70%</Text>
              </View>
            </View>

            <Text style={styles.examRules}>
              • You can navigate between questions using the Previous and Next buttons.
              {'\n'}• You can jump to any question using the question navigator at the bottom.
              {'\n'}• The timer will start as soon as you begin the exam.
              {'\n'}• Your progress will be saved if you need to exit the app.
              {'\n'}• Submit your exam when you're finished or when time runs out.
            </Text>
          </Card.Content>

          <Card.Actions style={styles.startActions}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={startExam}
              style={styles.beginButton}
            >
              Begin Exam
            </Button>
          </Card.Actions>
        </Card>
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = currentQuestionIndex / questions.length;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.examTitle}>{title}</Text>
        <Text style={[
          styles.timerText,
          timeLeft < 300 && styles.timerWarning,
          timeLeft < 60 && styles.timerCritical,
        ]}>
          Time Remaining: {formatTime(timeLeft)}
        </Text>
        <ProgressBar
          progress={progress}
          color={theme.colors.primary}
          style={styles.progressBar}
        />
        <Text style={styles.progressText}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Text>
      </View>

      <ScrollView style={styles.questionContainer}>
        <Card style={styles.questionCard}>
          <Card.Content>
            <Text style={styles.questionText}>{currentQuestion?.question}</Text>

            <RadioButton.Group
              onValueChange={(value) => handleAnswerSelection(currentQuestion.id, value)}
              value={userAnswers[currentQuestion.id] || ''}
            >
              {currentQuestion?.answers.map((answer) => (
                <View key={answer.uniqueKey} style={styles.answerOption}>
                  <RadioButton value={answer.letter} color={theme.colors.primary} />
                  <Text style={styles.answerText}>
                    {answer.letter.toUpperCase()}. {answer.answer}
                  </Text>
                </View>
              ))}
            </RadioButton.Group>
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={styles.navigationContainer}>
        <Button
          mode="outlined"
          onPress={navigateToPreviousQuestion}
          disabled={currentQuestionIndex === 0}
          style={styles.navButton}
        >
          Previous
        </Button>

        <Button
          mode="outlined"
          onPress={navigateToNextQuestion}
          disabled={currentQuestionIndex === questions.length - 1}
          style={styles.navButton}
        >
          Next
        </Button>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.questionNavigator}
      >
        {questions.map((_, index) => (
          <Button
            key={index}
            mode={index === currentQuestionIndex ? 'contained' :
              userAnswers[questions[index].id] ? 'outlined' : 'text'}
            compact
            onPress={() => navigateToQuestion(index)}
            style={styles.questionButton}
            labelStyle={styles.questionButtonLabel}
          >
            {index + 1}
          </Button>
        ))}
      </ScrollView>

      <View style={styles.submitContainer}>
        <Button
          mode="contained"
          onPress={submitExam}
          loading={submitting}
          disabled={submitting}
          style={styles.submitButton}
        >
          Submit Exam
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 16,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  troubleshootingContainer: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  troubleshootingTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  troubleshootingText: {
    marginBottom: 4,
  },
  retryButton: {
    marginTop: 16,
  },
  headerContainer: {
    padding: 16,
    backgroundColor: 'white',
    elevation: 4,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timerText: {
    fontSize: 16,
    marginBottom: 12,
    color: '#2196F3',
  },
  timerWarning: {
    color: '#FF9800',
  },
  timerCritical: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  questionContainer: {
    flex: 1,
    padding: 16,
  },
  questionCard: {
    marginBottom: 16,
  },
  questionText: {
    fontSize: 16,
    marginBottom: 20,
  },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  answerText: {
    fontSize: 15,
    marginLeft: 8,
    flex: 1,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  navButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  questionNavigator: {
    padding: 4,
    backgroundColor: 'white',
  },
  questionButton: {
    marginHorizontal: 4,
    minWidth: 40,
  },
  questionButtonLabel: {
    fontSize: 12,
  },
  submitContainer: {
    padding: 16,
    backgroundColor: 'white',
    elevation: 4,
  },
  submitButton: {
    paddingVertical: 8,
  },
  resultCard: {
    margin: 16,
  },
  resultTitle: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  resultSummary: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultText: {
    fontSize: 16,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  reviewTitle: {
    marginBottom: 16,
  },
  reviewCard: {
    marginBottom: 16,
  },
  correctCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  incorrectCard: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  questionNumber: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  answerReview: {
    marginVertical: 12,
  },
  miniDivider: {
    marginVertical: 12,
  },
  explanationTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  // Start exam screen styles
  startScreenContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  startCard: {
    padding: 8,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  startDescription: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  examInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 8,
  },
  examInfoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  examRules: {
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    lineHeight: 20,
  },
  startActions: {
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  beginButton: {
    flex: 2,
  },
});

export default ExamDetailsScreen;
