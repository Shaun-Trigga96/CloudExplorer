// c:\Users\thabi\Desktop\CloudExplorer\src\screens\ExamDetailsScreen.tsx
/* eslint-disable no-catch-shadow */
/* eslint-disable @typescript-eslint/no-shadow */
import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Card, Title, Button, Text, RadioButton , Divider, ProgressBar, useTheme as usePaperTheme } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {REACT_APP_BASE_URL} from '@env';
import { useTheme as useCustomTheme } from '../context/ThemeContext'; // Import your custom theme hook

const BASE_URL = REACT_APP_BASE_URL;

// Add timeout and retry functionality to axios
axios.defaults.timeout = 10000; // 10 seconds timeout

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
  warning: '#FFC107', // For timer warning
  critical: '#FF3B30', // For timer critical (same as error)
  buttonText: '#FFFFFF',
  selectedAnswerBackground: '#007AFF',
  selectedAnswerText: '#FFFFFF',
  correctBackground: '#e8f5e9', // Light green
  wrongBackground: '#ffebee', // Light red
  neutralBackground: '#f0f2f5', // Light gray
  explanationBackground: '#f0f2f5',
  progressBarBackground: '#e0e0e0',
  troubleshootingBackground: '#f8f8f8',
  examInfoBackground: '#f8f8f8',
  examRulesBackground: '#e8f5e9',
  bottomBarBackground: '#FFFFFF', // Default bottom bar background
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
  warning: '#FFD60A', // Brighter yellow
  critical: '#FF453A', // Brighter red (same as error)
  buttonText: '#FFFFFF',
  selectedAnswerBackground: '#0A84FF',
  selectedAnswerText: '#FFFFFF',
  correctBackground: 'rgba(50, 215, 75, 0.2)', // Darker green with opacity
  wrongBackground: 'rgba(255, 69, 58, 0.2)', // Darker red with opacity
  neutralBackground: '#2C2C2E', // Dark gray
  explanationBackground: '#2C2C2E',
  progressBarBackground: '#3A3A3C',
  troubleshootingBackground: '#2C2C2E',
  examInfoBackground: '#2C2C2E',
  examRulesBackground: 'rgba(50, 215, 75, 0.15)', // Darker green rule background
  bottomBarBackground: '#1C1C1E', // Match surface for bottom bars
};
// --- End Theme Colors ---


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
  timestamp?: any; // Add timestamp to the interface
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
  const { isDarkMode } = useCustomTheme(); // Use your custom theme hook
  const colors = isDarkMode ? darkColors : lightColors; // Select color palette
  const paperTheme = usePaperTheme(); // Get Paper theme if needed

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
     const response = await axios.get(`${BASE_URL}/api/v1/exams/${examId}`);
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
     // --- Calculate Results ---
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
     const isPassed = score >= 70;

     const result: ExamResult = {
       totalQuestions: questions.length,
       correctAnswers,
       score,
       isPassed,
       answeredQuestions,
     };
     console.log('processExamSubmission: Exam results calculated:', result);

     // --- Get User ID ---
     const userId = await AsyncStorage.getItem('userId');
     if (!userId) {
       console.error('processExamSubmission: User ID not found.');
       Alert.alert('Error', 'User ID not found. Please log in again.');
       return; // Exit the function if no user ID
     }

     // --- Save Results to Backend (with Retry) ---
     const saveResultUrl = `${BASE_URL}/api/v1/exams/save-result`;
     console.log('processExamSubmission: Saving results to backend:', saveResultUrl, { examId, result, userId });

     const maxRetries = 3;
     let retryCount = 0;
     let success = false;

     while (retryCount < maxRetries && !success) {
       try {
         const response = await axios.post(saveResultUrl, { examId, result, userId });
         console.log('processExamSubmission: Results saved to backend successfully.', response.data);
         success = true;
         result.timestamp = response.data.timestamp;

       } catch (error: any) {
         console.error(`processExamSubmission: Attempt ${retryCount + 1} failed:`, error);
         if (error.response) {
           console.error('processExamSubmission: Server responded with:', error.response.status, error.response.data);
           Alert.alert('Error', `Failed to save results. Server responded with ${error.response.status}: ${JSON.stringify(error.response.data)}`);
          }
         retryCount++;
         if (retryCount < maxRetries) {
           console.log(`processExamSubmission: Retrying in 2 seconds...`);
           await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds before retrying
         }
       }
     }

     if (!success) {
       console.error('processExamSubmission: Failed to save results after multiple retries.');
       Alert.alert('Warning', 'Failed to save results to the server after multiple attempts. Your results have been saved locally but may not be reflected in your progress.');
     } else {
       Alert.alert('Success', 'Exam submitted successfully.');
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
     Alert.alert('Error', 'Failed to submit exam. An unexpected error occurred.');
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading exam questions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.error }]}>Network Error</Text>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        {retryCount > 2 && (
          <View style={[styles.troubleshootingContainer, { backgroundColor: colors.troubleshootingBackground }]}>
            <Text style={[styles.troubleshootingTitle, { color: colors.text }]}>Troubleshooting Tips:</Text>
            <Text style={[styles.troubleshootingText, { color: colors.textSecondary }]}>• Check your internet connection</Text>
            <Text style={[styles.troubleshootingText, { color: colors.textSecondary }]}>• Make sure your backend server is running</Text>
            <Text style={[styles.troubleshootingText, { color: colors.textSecondary }]}>• Verify the server URL is correct (currently {BASE_URL})</Text>
            <Text style={[styles.troubleshootingText, { color: colors.textSecondary }]}>• Check if your server is accessible from your device</Text>
          </View>
        )}
        <Button
          mode="contained"
          onPress={fetchExamQuestions}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          labelStyle={{ color: colors.buttonText }}
        >
          Retry
        </Button>
      </View>
    );
  }

  if (examCompleted && examResult) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
        <Card style={[styles.resultCard, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <Title style={[styles.resultTitle, { color: colors.text }]}>
              Exam Results: {examResult.isPassed ? 'PASSED' : 'FAILED'}
            </Title>

            <View style={[styles.resultSummary, { backgroundColor: colors.neutralBackground }]}>
              <Text style={[styles.resultText, { color: colors.text }]}>
                Score: {examResult.score.toFixed(1)}%
              </Text>
              <Text style={[styles.resultText, { color: colors.text }]}>
                Correct Answers: {examResult.correctAnswers} / {examResult.totalQuestions}
              </Text>
              <Text style={[styles.resultText, { color: colors.textSecondary }]}>
                Passing Score: 70%
              </Text>
              {examStartTime && (
                <Text style={[styles.resultText, { color: colors.textSecondary }]}>
                  Exam Started: {examStartTime.toLocaleString()}
                </Text>
              )}
              {examTiming && (
                <Text style={[styles.resultText, { color: colors.textSecondary }]}>
                  Time Spent: {formatTime(7200 - timeLeft)}
                </Text>
              )}
            </View>

            <Divider style={[styles.divider, { backgroundColor: colors.border }]} />

            <Title style={[styles.reviewTitle, { color: colors.text }]}>Question Review</Title>

            {examResult.answeredQuestions.map((item, index) => (
              <Card key={index} style={[
                styles.reviewCard,
                { backgroundColor: colors.surface }, // Use surface for card background
                item.isCorrect ? [styles.correctCard, { borderLeftColor: colors.success }] : [styles.incorrectCard, { borderLeftColor: colors.error }],
              ]}>
                <Card.Content>
                  <Text style={[styles.questionNumber, { color: colors.textSecondary }]}>Question {index + 1}</Text>
                  <Text style={[styles.questionText, { color: colors.text }]}>{item.question}</Text>

                  <View style={styles.answerReview}>
                    <Text style={{ color: colors.textSecondary }}>Your Answer: {item.userAnswer.toUpperCase() || 'Not Answered'}</Text>
                    <Text style={{ color: colors.textSecondary }}>Correct Answer: {item.correctAnswer.toUpperCase()}</Text>
                  </View>

                  <Divider style={[styles.miniDivider, { backgroundColor: colors.border }]} />

                  <Text style={[styles.explanationTitle, { color: colors.text }]}>Explanation:</Text>
                  <Text style={[styles.explanationText, { color: colors.textSecondary }]}>{item.explanation}</Text>
                </Card.Content>
              </Card>
            ))}
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Home')}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            labelStyle={{ color: colors.buttonText }}
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
            style={[styles.actionButton, { borderColor: colors.primary }]}
            labelStyle={{ color: colors.primary }}
          >
            Retake Exam
          </Button>
        </View>
      </ScrollView>
    );
  }

  if (!examStarted) {
    return (
      <View style={[styles.startScreenContainer, { backgroundColor: colors.background }]}>
        <Card style={[styles.startCard, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <Title style={[styles.startTitle, { color: colors.text }]}>{title}</Title>
            <Text style={[styles.startDescription, { color: colors.textSecondary }]}>
              You are about to start the {title} certification practice exam.
            </Text>

            <View style={[styles.examInfoContainer, { backgroundColor: colors.examInfoBackground }]}>
              <View style={styles.examInfoItem}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Total Questions</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{questions.length}</Text>
              </View>

              <View style={styles.examInfoItem}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Time Limit</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>2 Hours</Text>
              </View>

              <View style={styles.examInfoItem}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Passing Score</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>70%</Text>
              </View>
            </View>

            <Text style={[styles.examRules, { backgroundColor: colors.examRulesBackground, color: isDarkMode ? colors.text : colors.textSecondary }]}>
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
              style={[styles.cancelButton, { borderColor: colors.textSecondary }]}
              labelStyle={{ color: colors.textSecondary }}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={startExam}
              style={[styles.beginButton, { backgroundColor: colors.primary }]}
              labelStyle={{ color: colors.buttonText }}
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

  // Determine timer color based on time left
  let timerColor = colors.primary;
  if (timeLeft < 60) {
    timerColor = colors.critical;
  } else if (timeLeft < 300) {
    timerColor = colors.warning;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.examTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[
          styles.timerText,
          { color: timerColor }, // Apply dynamic color
          timeLeft < 60 && styles.timerCritical, // Keep bold style for critical
        ]}>
          Time Remaining: {formatTime(timeLeft)}
        </Text>
        <ProgressBar
          progress={progress}
          color={colors.primary}
          style={[styles.progressBar, { backgroundColor: colors.progressBarBackground }]}
        />
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </Text>
      </View>

      <ScrollView style={styles.questionContainer}>
        <Card style={[styles.questionCard, { backgroundColor: colors.surface }]}>
          <Card.Content>
            <Text style={[styles.questionText, { color: colors.text }]}>{currentQuestion?.question}</Text>

            <RadioButton.Group
              onValueChange={(value) => handleAnswerSelection(currentQuestion.id, value)}
              value={userAnswers[currentQuestion.id] || ''}
            >
              {currentQuestion?.answers.map((answer) => (
                <TouchableOpacity // Wrap RadioButton in TouchableOpacity for larger tap area
                  key={answer.uniqueKey}
                  onPress={() => handleAnswerSelection(currentQuestion.id, answer.letter)}
                  style={[
                    styles.answerOptionContainer, // Use a container style
                    { borderColor: colors.border },
                    userAnswers[currentQuestion.id] === answer.letter &&
                    [styles.selectedAnswerOptionContainer, { backgroundColor: colors.selectedAnswerBackground, borderColor: colors.selectedAnswerBackground }],
                  ]}
                  activeOpacity={0.7}
                >
                  <RadioButton.Android // Use Android or IOS specific for better control if needed
                    value={answer.letter}
                    color={userAnswers[currentQuestion.id] === answer.letter ? colors.selectedAnswerText : colors.primary}
                    uncheckedColor={colors.textSecondary}
                    status={userAnswers[currentQuestion.id] === answer.letter ? 'checked' : 'unchecked'}
                  />
                  <Text style={[
                    styles.answerText,
                    { color: colors.text },
                    userAnswers[currentQuestion.id] === answer.letter && { color: colors.selectedAnswerText }
                  ]}>
                    {answer.letter.toUpperCase()}. {answer.answer}
                  </Text>
                </TouchableOpacity>
              ))}
            </RadioButton.Group>
          </Card.Content>
        </Card>
      </ScrollView>

      <View style={[styles.navigationContainer, { backgroundColor: colors.bottomBarBackground, borderTopColor: colors.border }]}>
        <Button
          mode="outlined"
          onPress={navigateToPreviousQuestion}
          disabled={currentQuestionIndex === 0}
          style={[styles.navButton, { borderColor: colors.primary }]}
          labelStyle={{ color: colors.primary }}
        >
          Previous
        </Button>

        <Button
          mode="outlined"
          onPress={navigateToNextQuestion}
          disabled={currentQuestionIndex === questions.length - 1}
          style={[styles.navButton, { borderColor: colors.primary }]}
          labelStyle={{ color: colors.primary }}
        >
          Next
        </Button>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.questionNavigator, { backgroundColor: colors.bottomBarBackground, borderTopColor: colors.border }]}
      >
        {questions.map((_, index) => {
          const isCurrent = index === currentQuestionIndex;
          const isAnswered = !!userAnswers[questions[index].id];
          let buttonMode: "contained" | "outlined" | "text" = "text";
          let buttonStyle = {};
          let labelStyle = { color: colors.textSecondary };

          if (isCurrent) {
            buttonMode = "contained";
            buttonStyle = { backgroundColor: colors.primary };
            labelStyle = { color: colors.buttonText };
          } else if (isAnswered) {
            buttonMode = "outlined";
            buttonStyle = { borderColor: colors.primary };
            labelStyle = { color: colors.primary };
          }

          return (
            <Button
              key={index}
              mode={buttonMode}
              compact
              onPress={() => navigateToQuestion(index)}
              style={[styles.questionButton, buttonStyle]}
              labelStyle={[styles.questionButtonLabel, labelStyle]}
            >
              {index + 1}
            </Button>
          );
        })}
      </ScrollView>

      <View style={[styles.submitContainer, { backgroundColor: colors.bottomBarBackground, borderTopColor: colors.border }]}>
        <Button
          mode="contained"
          onPress={submitExam}
          loading={submitting}
          disabled={submitting}
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          labelStyle={{ color: colors.buttonText }}
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
    // backgroundColor applied dynamically
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor applied dynamically
  },
  loadingText: {
    marginTop: 16,
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
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    // color applied dynamically
    marginBottom: 8,
  },
  errorText: {
    marginBottom: 16,
    fontSize: 16,
    // color applied dynamically
    textAlign: 'center',
  },
  troubleshootingContainer: {
    // backgroundColor applied dynamically
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  troubleshootingTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    // color applied dynamically
  },
  troubleshootingText: {
    marginBottom: 4,
    // color applied dynamically
  },
  retryButton: {
    marginTop: 16,
    // backgroundColor applied dynamically
  },
  headerContainer: {
    padding: 16,
    // backgroundColor applied dynamically
    elevation: 4, // Keep elevation for shadow effect
    shadowColor: '#000', // Add shadow for light mode
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  examTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    // color applied dynamically
  },
  timerText: {
    fontSize: 16,
    marginBottom: 12,
    // color applied dynamically
  },
  timerWarning: {
    // color applied dynamically (handled inline)
  },
  timerCritical: {
    // color applied dynamically (handled inline)
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
    // backgroundColor applied dynamically
  },
  progressText: {
    textAlign: 'center',
    marginBottom: 8,
    // color applied dynamically
  },
  questionContainer: {
    flex: 1, // Takes up the available space for scrolling
    paddingHorizontal: 16, // Keep horizontal padding
    paddingTop: 16, // Keep top padding
    // Add significant bottom padding to ensure content scrolls above the fixed bottom bars
    // Adjust this value based on the actual combined height of your bottom bars
    paddingBottom: 180,
  },
  questionCard: {
    marginBottom: 16, // Keep margin between cards if multiple are shown (though likely only one)
    // backgroundColor applied dynamically
    borderRadius: 12, // Add rounding
    elevation: 2, // Add subtle elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  questionText: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 22, // Improve readability
    // color applied dynamically
  },
  answerOptionContainer: { // New style for the TouchableOpacity wrapper
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8, // Add vertical padding
    paddingHorizontal: 12, // Add horizontal padding
    borderRadius: 8, // Add rounding
    borderWidth: 1,
    // borderColor applied dynamically
  },
  selectedAnswerOptionContainer: { // Style for selected container
    // backgroundColor applied dynamically
    // borderColor applied dynamically
  },
  answerOption: { // Kept for reference, but might not be needed if using container
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  answerText: {
    fontSize: 15,
    marginLeft: 8,
    flex: 1,
    // color applied dynamically
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    // backgroundColor applied dynamically
    borderTopWidth: 1,
    // borderTopColor applied dynamically
  },
  navButton: {
    flex: 1,
    marginHorizontal: 8,
    // borderColor applied dynamically
  },
  questionNavigator: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    // backgroundColor applied dynamically
    borderTopWidth: 1,
    // borderTopColor applied dynamically
    flexGrow: 0, // Prevent this ScrollView from taking extra vertical space
  },
  questionButton: {
    marginHorizontal: 4,
    minWidth: 40,
    // backgroundColor/borderColor applied dynamically based on state
  },
  questionButtonLabel: {
    fontSize: 12,
    // color applied dynamically based on state
  },
  submitContainer: {
    padding: 16,
    // backgroundColor applied dynamically
    elevation: 4,
    borderTopWidth: 1,
    // borderTopColor applied dynamically
  },
  submitButton: {
    paddingVertical: 8,
    // backgroundColor applied dynamically
  },
  resultCard: {
    margin: 16,
    // backgroundColor applied dynamically
    borderRadius: 12,
  },
  resultTitle: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 16,
    // color applied dynamically
  },
  resultSummary: {
    // backgroundColor applied dynamically
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultText: {
    fontSize: 16,
    marginBottom: 8,
    // color applied dynamically
  },
  divider: {
    marginVertical: 16,
    // backgroundColor applied dynamically
  },
  reviewTitle: {
    marginBottom: 16,
    // color applied dynamically
    fontSize: 20, // Slightly smaller review title
    fontWeight: 'bold',
  },
  reviewCard: {
    marginBottom: 16,
    // backgroundColor applied dynamically
    borderRadius: 8,
    borderLeftWidth: 5, // Add left border for status
  },
  correctCard: {
    // borderLeftColor applied dynamically
  },
  incorrectCard: {
    // borderLeftColor applied dynamically
  },
  questionNumber: {
    fontWeight: 'bold',
    marginBottom: 8,
    // color applied dynamically
  },
  answerReview: {
    marginVertical: 12,
    gap: 4, // Add gap between your/correct answer lines
  },
  miniDivider: {
    marginVertical: 12,
    // backgroundColor applied dynamically
  },
  explanationTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    // color applied dynamically
  },
  explanationText: {
    fontSize: 14,
    // color applied dynamically
    lineHeight: 20, // Improve readability
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    // backgroundColor/borderColor applied dynamically
  },
  // Start exam screen styles
  startScreenContainer: {
    flex: 1,
    padding: 16,
    // backgroundColor applied dynamically
    justifyContent: 'center',
  },
  startCard: {
    padding: 8,
    // backgroundColor applied dynamically
    borderRadius: 12,
  },
  startTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    // color applied dynamically
  },
  startDescription: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    // color applied dynamically
  },
  examInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    // backgroundColor applied dynamically
    padding: 16,
    borderRadius: 8,
  },
  examInfoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    // color applied dynamically
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    // color applied dynamically
  },
  examRules: {
    // backgroundColor applied dynamically
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    lineHeight: 20,
    // color applied dynamically
  },
  startActions: {
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    // borderColor applied dynamically
  },
  beginButton: {
    flex: 2,
    // backgroundColor applied dynamically
  },
});

export default ExamDetailsScreen;
