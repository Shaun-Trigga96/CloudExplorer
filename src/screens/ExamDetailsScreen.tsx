// src/screens/ExamDetailsScreen.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import { darkColors, lightColors } from '../styles/colors';
import { useExam } from '../components/hooks/useExamDetail';
import { useTimer } from '../components/hooks/useTimer';
import {
  ExamStartCard,
  ExamHeader,
  QuestionCard,
  QuestionNavigator,
  ResultCard,
} from '../components/examDetail';
import { examDetailsStyles } from '../styles/examDetailsStyles';
import { ErrorView, LoadingView } from '../components/common';

type ExamDetailsScreenRouteProp = RouteProp<RootStackParamList, 'ExamDetail'>;
type ExamDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExamDetail'>;

interface ExamDetailsScreenProps {
  route: ExamDetailsScreenRouteProp;
  navigation: ExamDetailsScreenNavigationProp;
}

const ExamDetailsScreen: React.FC<ExamDetailsScreenProps> = ({ route, navigation }) => {
  const { examId, title } = route.params;
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  const {
    questions,
    loading,
    error,
    retryCount,
    userAnswers,
    currentQuestionIndex,
    examCompleted,
    examResult,
    examStarted,
    examTiming,
    setUserAnswers,
    setCurrentQuestionIndex,
    setExamCompleted,
    setExamStarted,
    fetchExamQuestions,
    submitExam,
    startExam,
    handleAnswerSelection,
    navigateToNextQuestion,
    navigateToPreviousQuestion,
    navigateToQuestion,
  } = useExam(examId, navigation);

  const { timeLeft, formatTime, timerColor, setTimeLeft } = useTimer(
    examStarted,
    examCompleted,
    examTiming,
    submitExam,
    colors,
  );

  if (loading) {
    return <LoadingView message="Loading exam questions..." />;
  }

  if (error) {
    return (
      <ErrorView
        message={error}
        onRetry={fetchExamQuestions}
        troubleshooting={retryCount > 2 ? [
          'Check your internet connection',
          'Make sure your backend server is running',
          'Check if your server is accessible from your device',
        ] : undefined}
      />
    );
  }

  if (examCompleted && examResult) {
    return (
      <ScrollView style={[examDetailsStyles.container, { backgroundColor: colors.background }]}>
        <ResultCard
          result={examResult}
          startTime={examTiming ? new Date(examTiming.startTime) : null}
          timeSpent={7200 - timeLeft}
          formatTime={formatTime}
        />
        <View style={examDetailsStyles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Home')}
            style={{ flex: 1, marginHorizontal: 8, backgroundColor: colors.primary }}
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
              fetchExamQuestions();
            }}
            style={{ flex: 1, marginHorizontal: 8, borderColor: colors.primary }}
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
      <View style={[examDetailsStyles.startScreenContainer, { backgroundColor: colors.background }]}>
        <ExamStartCard
          title={title}
          questionCount={questions.length}
          onStart={startExam}
          onCancel={() => navigation.goBack()}
        />
      </View>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <View style={[examDetailsStyles.container, { backgroundColor: colors.background }]}>
      <ExamHeader
        title={title}
        timeLeft={timeLeft}
        timerColor={timerColor}
        formatTime={formatTime}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
      />
      <ScrollView style={examDetailsStyles.questionContainer}>
        <QuestionCard
          question={currentQuestion}
          userAnswer={userAnswers[currentQuestion.id]}
          onAnswerSelect={handleAnswerSelection}
        />
      </ScrollView>
      <View style={[examDetailsStyles.navigationContainer, { backgroundColor: colors.bottomBarBackground, borderTopColor: colors.border }]}>
        <Button
          mode="outlined"
          onPress={navigateToPreviousQuestion}
          disabled={currentQuestionIndex === 0}
          style={{ flex: 1, marginHorizontal: 8, borderColor: colors.primary }}
          labelStyle={{ color: colors.primary }}
        >
          Previous
        </Button>
        <Button
          mode="outlined"
          onPress={navigateToNextQuestion}
          disabled={currentQuestionIndex === questions.length - 1}
          style={{ flex: 1, marginHorizontal: 8, borderColor: colors.primary }}
          labelStyle={{ color: colors.primary }}
        >
          Next
        </Button>
      </View>
      <QuestionNavigator
        questions={questions}
        currentQuestionIndex={currentQuestionIndex}
        userAnswers={userAnswers}
        onNavigate={navigateToQuestion}
      />
      <View style={[examDetailsStyles.submitContainer, { backgroundColor: colors.bottomBarBackground, borderTopColor: colors.border }]}>
        <Button
          mode="contained"
          onPress={submitExam}
          style={{ paddingVertical: 8, backgroundColor: colors.primary }}
          labelStyle={{ color: colors.buttonText }}
          loading={examCompleted}
          disabled={examCompleted}
        >
          Submit Exam
        </Button>
      </View>
    </View>
  );
};

export default ExamDetailsScreen;