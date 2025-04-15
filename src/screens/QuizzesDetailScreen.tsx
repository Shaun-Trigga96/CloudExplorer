// src/screens/QuizzesDetailScreen.tsx
import React, { useState } from 'react';
import { ScrollView, Animated, Alert } from 'react-native';
import { Button, Title } from 'react-native-paper';
import { useCustomTheme } from '../context/ThemeContext';
import { darkColors, lightColors } from '../styles/colors';
import { quizzesStyles } from '../styles/quizzesStyles';
import { useQuiz } from '../components/hooks/useQuiz';
import {
  QuizHeader,
  QuestionCard,
  ResultCard,
  ReviewCard,
} from '../components/quizzesDetail';
import { LoadingView, ErrorView } from '../components/common';

interface QuizzesDetailScreenProps {
  route: any;
  navigation: any;
}

const QuizzesDetailScreen: React.FC<QuizzesDetailScreenProps> = ({ route, navigation }) => {
  const { moduleId } = route.params;
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;
  const fadeAnim = useState(new Animated.Value(0))[0];

  const {
    quiz,
    loading,
    error,
    moduleTitle,
    userAnswers,
    showResults,
    submittingResults,
    handleAnswer,
    calculateScore,
    isAnswerCorrect,
    submitQuizResults,
    handleRetry,
  } = useQuiz(moduleId, navigation);

  React.useEffect(() => {
    if (!loading && !error) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, error, fadeAnim]);

  const handleSubmit = () => {
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

  if (loading) {
    return <LoadingView message="Loading Quiz..." />;
  }

  if (error) {
    return (
      <ErrorView
        message={error}
        onRetry={() => {
          // Trigger re-fetch (handled in useQuiz)
          navigation.replace('QuizzesDetail', { moduleId });
        }}
      />
    );
  }

  if (!quiz || !moduleTitle) {
    return <LoadingView message="Preparing quiz..." />;
  }

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
          onRetry={handleRetry}
          onBack={() => navigation.goBack()}
          fadeAnim={fadeAnim}
        />
        <Title style={[quizzesStyles.reviewTitle, { color: colors.text }]}>Review Answers</Title>
        {quiz.map(question => (
          <ReviewCard
            key={question.id}
            question={question}
            userAnswer={userAnswers[question.id]}
            isCorrect={isAnswerCorrect(question.id)}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[quizzesStyles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={quizzesStyles.contentContainer}
    >
      <QuizHeader
        moduleTitle={moduleTitle}
        progress={Object.keys(userAnswers).length}
        totalQuestions={quiz.length}
      />
      {quiz.map(question => (
        <QuestionCard
          key={question.id}
          question={question}
          userAnswer={userAnswers[question.id]}
          handleAnswer={handleAnswer}
          fadeAnim={fadeAnim}
        />
      ))}
      <Button
        mode="contained"
        onPress={handleSubmit}
        style={[quizzesStyles.submitButton, { backgroundColor: colors.primary }]}
        labelStyle={{ color: colors.buttonText }}
        loading={submittingResults}
        disabled={submittingResults}
      >
        Submit Quiz
      </Button>
    </ScrollView>
  );
};

export default QuizzesDetailScreen;