// src/screens/ExamDetailsScreen.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import { Button } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import { darkColors, lightColors } from '../styles/colors';
import { useExamDetail } from '../components/hooks/useExamDetail'; // FIX: Correct import path
import { useTimer } from '../components/hooks/useTimer'; // Assuming useTimer is correctly implemented
import {
  ExamStartCard,
  ExamHeader,
  QuestionCard,
  QuestionNavigator,
  ResultCard,
} from '../components/examDetail'; // Corrected import path if needed
import { examDetailsStyles } from '../styles/examDetailsStyles';
import { ErrorView, LoadingView } from '../components/common';

type ExamDetailsScreenRouteProp = RouteProp<RootStackParamList, 'ExamDetail'>;
type ExamDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExamDetail'>;

interface ExamDetailsScreenProps {
  route: ExamDetailsScreenRouteProp;
  navigation: ExamDetailsScreenNavigationProp;
}

const ExamDetailsScreen: React.FC<ExamDetailsScreenProps> = ({ route, navigation }) => {
  // --- FIX 1: Get ALL required params from route ---
  const { examId, title: routeTitle, providerId, pathId } = route.params;
  // Renamed 'title' to 'routeTitle' to avoid conflict with examMeta.title

  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  // --- FIX 2: Correct hook usage with all params ---
  const {
    examMeta,
    questions,
    loading,
    error,
    userIdError, // Destructure userIdError
    userAnswers,
    currentQuestionIndex,
    examCompleted,
    examResult,
    examStarted,
    examTiming,
    submitExam,
    startExam,
    handleAnswerSelection, // Use the correct handler from hook
    navigateToNextQuestion,
    navigateToPreviousQuestion,
    navigateToQuestion,
    refetchExamData, // Use the correct refetch function
  } = useExamDetail(examId, providerId, pathId, navigation); // Pass all params correctly

  // --- FIX 3: Timer Hook (Pass duration from meta) ---
  const { timeLeft, formatTime, timerColor  } = useTimer( // setTimeLeft likely not needed here
    examStarted,
    examCompleted,
    examTiming,
    submitExam, // Pass submitExam from useExamDetail hook
    colors,
  );

  // --- Loading State ---
  if (loading) {
    return <LoadingView message="Loading exam..." />;
  }

  // --- FIX 4: Handle userIdError ---
  if (userIdError) {
    return (
      <ErrorView
        message={userIdError}
        // No retry needed for userIdError, usually requires re-login/app restart
      />
    );
  }

  // --- FIX 5: Error State (Use refetchExamData, remove retryCount) ---
  if (error) {
    return (
      <ErrorView
        message={error}
        onRetry={refetchExamData} // Use the correct retry function
        // Removed troubleshooting/retryCount logic
      />
    );
  }

  // --- FIX 6: Use examMeta.title when available ---
  const displayTitle = examMeta?.title || routeTitle || 'Exam'; // Fallback title

  // --- Results View ---
  if (examCompleted && examResult) {
    // Calculate time spent based on duration and timeLeft
    const totalDurationSeconds = examMeta?.duration ? examMeta.duration * 60 : null;
    const timeSpentSeconds = totalDurationSeconds !== null ? totalDurationSeconds - timeLeft : null;

    return (
      <ScrollView style={[examDetailsStyles.container, { backgroundColor: colors.background }]}>
        {/* --- FIX 7: Update ResultCard props --- */}
        <ResultCard
          result={examResult}
          timeSpent={timeSpentSeconds ?? 0} // Pass calculated time spent in seconds or use 0 as a default value
          formatTime={formatTime} // Pass the formatter
          title={displayTitle} // Use consistent title
          passingScore={examMeta?.passingRate} // Pass passing score from meta
        />
        <View style={examDetailsStyles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()} // Go back instead of Home? Or navigate('ExamsScreen')?
            style={{ flex: 1, marginHorizontal: 8, backgroundColor: colors.primary }}
            labelStyle={{ color: colors.buttonText }}
          >
            Back to Exams
          </Button>
          {/* --- FIX 8: Simplify Retake logic --- */}
          <Button
            mode="outlined"
            onPress={refetchExamData} // Call refetch which handles state reset and data fetching
            style={{ flex: 1, marginHorizontal: 8, borderColor: colors.primary }}
            labelStyle={{ color: colors.primary }}
          >
            Retake Exam
          </Button>
        </View>
      </ScrollView>
    );
  }

  // --- Start Screen View ---
  if (!examStarted) {
    return (
      <View style={[examDetailsStyles.startScreenContainer, { backgroundColor: colors.background }]}>
        {/* --- FIX 9: Update ExamStartCard props --- */}
        <ExamStartCard
          title={displayTitle} // Use consistent title
          questionCount={examMeta?.numberOfQuestions ?? questions.length}
          passingScore={examMeta?.passingRate} // Pass passing score if available
          onStart={startExam}
          onCancel={() => navigation.goBack()}
        />
      </View>
    );
  }

  // --- Exam Taking View ---
  const currentQuestion = questions[currentQuestionIndex];

  // Handle case where questions might still be empty briefly after loading=false
  if (!currentQuestion) {
     return <LoadingView message="Preparing questions..." />;
  }

  return (
    <View style={[examDetailsStyles.container, { backgroundColor: colors.background }]}>
      <ExamHeader
        title={displayTitle} // Use consistent title
        timeLeft={timeLeft}
        timerColor={timerColor}
        formatTime={formatTime}
        currentQuestionIndex={currentQuestionIndex}
        totalQuestions={questions.length}
      />
      <ScrollView style={examDetailsStyles.questionContainer}>
        {/* --- FIX 10: Update QuestionCard props --- */}
        <QuestionCard
          question={currentQuestion}
          userAnswer={userAnswers[currentQuestion.id]} // Use string ID
          onAnswerSelect={handleAnswerSelection} // Use correct handler from hook
        />
      </ScrollView>
      {/* Navigation Buttons remain largely the same */}
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
      {/* --- FIX 11: Update QuestionNavigator props --- */}
      <QuestionNavigator
        questions={questions}
        currentQuestionIndex={currentQuestionIndex}
        userAnswers={userAnswers} // Pass userAnswers with string keys
        onNavigate={navigateToQuestion}
      />
      <View style={[examDetailsStyles.submitContainer, { backgroundColor: colors.bottomBarBackground, borderTopColor: colors.border }]}>
        <Button
          mode="contained"
          onPress={submitExam}
          style={{ paddingVertical: 8, backgroundColor: colors.primary }}
          labelStyle={{ color: colors.buttonText }}
          // Use submittingResults state from hook if available, otherwise fallback to examCompleted
          // loading={submittingResults || examCompleted} // Assuming hook provides submittingResults
          // disabled={submittingResults || examCompleted}
          loading={examCompleted} // Fallback if submittingResults not exposed
          disabled={examCompleted}
        >
          Submit Exam
        </Button>
      </View>
    </View>
  );
};

export default ExamDetailsScreen;