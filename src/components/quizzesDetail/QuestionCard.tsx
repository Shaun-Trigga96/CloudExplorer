// src/components/quizzesDetail/QuestionCard.tsx
import React from 'react';
import { View, Animated } from 'react-native';
import { Card, Paragraph } from 'react-native-paper';
import AnswerButton from './AnswerButton';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';
import { QuestionType } from '../../types/quiz';

interface QuestionCardProps {
  question: QuestionType;
  userAnswer: string | undefined;
  handleAnswer: (questionId: number, answerLetter: string) => void;
  fadeAnim: Animated.Value;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  userAnswer,
  handleAnswer,
  fadeAnim,
}) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Animated.View style={[{ opacity: fadeAnim, backgroundColor: colors.surface }]}>
      <Card style={{ borderRadius: 15, marginBottom: 15, padding: 15, elevation: 3 }}>
        <Card.Content>
          <Paragraph style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 15 }}>
            {question.question}
          </Paragraph>
          <View style={{ gap: 10 }}>
            {question.answers.length > 0 ? (
              question.answers.map(answer => (
                <AnswerButton
                  key={answer.uniqueKey}
                  answer={answer.answer}
                  letter={answer.letter}
                  isSelected={userAnswer === answer.letter}
                  onPress={() => handleAnswer(question.id, answer.letter)}
                />
              ))
            ) : (
              ['True', 'False'].map(option => (
                <AnswerButton
                  key={`${question.id}-${option}`}
                  answer={option}
                  letter={option}
                  isSelected={userAnswer === option}
                  onPress={() => handleAnswer(question.id, option)}
                />
              ))
            )}
          </View>
        </Card.Content>
      </Card>
    </Animated.View>
  );
};

export default QuestionCard;