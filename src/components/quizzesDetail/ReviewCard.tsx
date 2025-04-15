// src/components/quizzesDetail/ReviewCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Paragraph, IconButton } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';
import { QuestionType } from '../../types/quiz';

interface ReviewCardProps {
  question: QuestionType;
  userAnswer: string | undefined;
  isCorrect: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ question, userAnswer, isCorrect }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Card
      style={[
        styles.reviewCard,
        { backgroundColor: colors.surface },
        isCorrect ? { borderLeftColor: colors.success } : { borderLeftColor: colors.error },
      ]}
    >
      <Card.Content>
        <View style={styles.questionHeader}>
          <IconButton
            icon={isCorrect ? 'check-circle' : 'close-circle'}
            iconColor={isCorrect ? colors.success : colors.error}
            size={24}
          />
          <Paragraph style={[styles.reviewQuestion, { color: colors.text }]}>
            {question.question}
          </Paragraph>
        </View>
        <View style={styles.reviewAnswersContainer}>
          {question.answers.length > 0 ? (
            question.answers.map(answer => (
              <View
                key={answer.uniqueKey}
                style={[
                  styles.reviewAnswer,
                  answer.letter.toLowerCase() === question.correctAnswer.toLowerCase()
                    ? { backgroundColor: colors.correctBackground }
                    : userAnswer === answer.letter && !isCorrect
                    ? { backgroundColor: colors.wrongBackground }
                    : { backgroundColor: colors.neutralBackground },
                ]}
              >
                <Text style={[styles.answerLetter, { color: colors.textSecondary }]}>
                  {answer.letter.toUpperCase()}
                </Text>
                <Text style={[styles.reviewAnswerText, { color: colors.text }]}>
                  {answer.answer}
                </Text>
              </View>
            ))
          ) : (
            ['True', 'False'].map(option => (
              <View
                key={`${question.id}-${option}`}
                style={[
                  styles.reviewAnswer,
                  question.correctAnswer === option
                    ? { backgroundColor: colors.correctBackground }
                    : userAnswer === option && !isCorrect
                    ? { backgroundColor: colors.wrongBackground }
                    : { backgroundColor: colors.neutralBackground },
                ]}
              >
                <Text style={[styles.reviewAnswerText, { color: colors.text }]}>
                  {option}
                </Text>
              </View>
            ))
          )}
        </View>
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
};

const styles = StyleSheet.create({
  reviewCard: {
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    borderLeftWidth: 8,
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 15,
    paddingBottom: 0,
  },
  reviewQuestion: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    lineHeight: 24,
  },
  reviewAnswersContainer: {
    marginTop: 10,
    paddingHorizontal: 15,
    paddingBottom: 15,
    gap: 10,
  },
  reviewAnswer: {
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  answerLetter: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 24,
    textAlign: 'center',
  },
  reviewAnswerText: {
    fontSize: 16,
    flex: 1,
    lineHeight: 22,
  },
  explanationContainer: {
    marginTop: 15,
    padding: 15,
    borderRadius: 12,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 15,
    lineHeight: 22,
  },
});

export default ReviewCard;