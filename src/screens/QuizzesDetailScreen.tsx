// src/screens/QuizzesDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { ScrollView, Animated, Alert } from 'react-native';
import { Button, Title } from 'react-native-paper';
import { useCustomTheme } from '../context/ThemeContext';
import { darkColors, lightColors } from '../styles/colors';
import { quizzesStyles } from '../styles/quizzesStyles';
import { useQuizDetail } from '../components/hooks/useQuizDetail'; // Updated hook import
import {
  QuizHeader,
  QuestionCard,
  ResultCard,
  ReviewCard,
} from '../components/quizzesDetail';
import { LoadingView, ErrorView } from '../components/common';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native'; // Import hooks
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator'; // Adjust path

// Define Prop Types
type QuizzesDetailScreenRouteProp = RouteProp<RootStackParamList, 'QuizzesDetail'>;
type QuizzesDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'QuizzesDetail'>;

const QuizzesDetailScreen: React.FC = () => { // Remove props if using hooks
  const route = useRoute<QuizzesDetailScreenRouteProp>();
  const navigation = useNavigation<QuizzesDetailScreenNavigationProp>();

  // --- Get all params from route ---
  const { moduleId, providerId, pathId, quizId } = route.params;

  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;
  const fadeAnim = useState(new Animated.Value(0))[0]; // Keep using useState for animation value

  // --- Pass all params to the hook ---
  const {
    quiz,           // Questions array
    quizMeta,       // Quiz metadata
    loading,
    error,
    moduleTitle,    // Module title (fetched by hook)
    userAnswers,
    showResults,
    submittingResults,
    handleAnswer,
    calculateScore,
    isAnswerCorrect,
    submitQuizResults,
    handleRetry,
  } = useQuizDetail(moduleId, providerId, pathId, quizId, navigation); // Pass params

  // --- Animation Effect ---
  useEffect(() => {
    if (!loading && !error && (quiz || showResults)) { // Animate when data is ready or results show
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, error, quiz, showResults, fadeAnim]); // Add quiz and showResults dependency

  const handleSubmit = () => {
    // Check if all questions are answered
    if (quiz && Object.keys(userAnswers).length < quiz.length) {
      Alert.alert(
        'Incomplete Quiz',
        "You haven't answered all questions. Are you sure you want to submit?",
        [
          { text: 'Continue Answering', style: 'cancel' },
          { text: 'Submit Anyway', onPress: submitQuizResults }, // Call hook's submit function
        ],
      );
    } else {
      submitQuizResults(); // Call hook's submit function
    }
  };

  // --- Loading State ---
  if (loading) {
    return <LoadingView message="Loading Quiz..." />;
  }

  // --- Error State ---
  if (error) {
    return (
      <ErrorView
        message={error}
        onRetry={handleRetry} // Use hook's retry function
      />
    );
  }

  // --- No Quiz Data State ---
  if (!quiz || !quizMeta) {
    // This might happen briefly or if fetch failed without setting error
    return <LoadingView message="Preparing quiz..." />;
  }

  // --- Results View ---
  if (showResults) {
    const score = calculateScore();
    return (
      <ScrollView
        style={[quizzesStyles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={quizzesStyles.contentContainer}
      >
        <ResultCard
          score={score}
          totalQuestions={quiz.length}
          onRetry={handleRetry} // Use hook's retry
          onBack={() => navigation.goBack()} // Navigate back
          fadeAnim={fadeAnim}
        />
        <Title style={[quizzesStyles.reviewTitle, { color: colors.text }]}>Review Answers</Title>
        {quiz.map(question => (
          <ReviewCard
            key={question.id}
            question={question}
            userAnswer={userAnswers[question.id]}
            isCorrect={isAnswerCorrect(question.id)} // Use hook's checker
          />
        ))}
      </ScrollView>
    );
  }

  // --- Quiz Taking View ---
  return (
    <ScrollView
      style={[quizzesStyles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={quizzesStyles.contentContainer}
    >
      <QuizHeader
        // Use moduleTitle from hook, fallback to quizMeta title
        moduleTitle={moduleTitle || quizMeta.title}
        progress={Object.keys(userAnswers).length}
        totalQuestions={quiz.length}
      />
      {quiz.map(question => (
        <QuestionCard
          key={question.id}
          question={question}
          userAnswer={userAnswers[question.id]}
          handleAnswer={handleAnswer} // Use hook's handler
          fadeAnim={fadeAnim}
        />
      ))}
      <Button
        mode="contained"
        onPress={handleSubmit}
        style={[quizzesStyles.submitButton, { backgroundColor: colors.primary }]}
        labelStyle={{ color: colors.buttonText }}
        loading={submittingResults} // Use hook's loading state
        disabled={submittingResults} // Use hook's loading state
      >
        Submit Quiz
      </Button>
    </ScrollView>
  );
};

export default QuizzesDetailScreen;
