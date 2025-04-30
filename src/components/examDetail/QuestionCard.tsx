// src/components/examsDetail/QuestionCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Card, RadioButton } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';
import { Question } from '../../types/exam';

interface QuestionCardProps {
  question: Question;
  userAnswer: string | undefined;
  onAnswerSelect: (questionId: string, answerLetter: string) => void; // Changed from number to string
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, userAnswer, onAnswerSelect }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Card style={{ marginBottom: 16, backgroundColor: colors.surface, borderRadius: 12, elevation: 2 }}>
      <Card.Content>
        <Text style={{ fontSize: 16, color: colors.text, marginBottom: 20, lineHeight: 22 }}>
          {question.question}
        </Text>
        <RadioButton.Group
          onValueChange={value => onAnswerSelect(question.id.toString(), value)} // Convert id to string if needed
          value={userAnswer || ''}
        >
          {question.answers.map(answer => (
            <TouchableOpacity
              key={answer.uniqueKey}
              onPress={() => onAnswerSelect(question.id.toString(), answer.letter)} // Convert id to string if needed
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: userAnswer === answer.letter ? colors.selectedAnswerBackground : colors.surface,
              }}
              activeOpacity={0.7}
            >
              <RadioButton.Android
                value={answer.letter}
                color={userAnswer === answer.letter ? colors.selectedAnswerText : colors.primary}
                uncheckedColor={colors.textSecondary}
              />
              <Text style={{
                fontSize: 15,
                marginLeft: 8,
                flex: 1,
                color: userAnswer === answer.letter ? colors.selectedAnswerText : colors.text,
              }}>
                {answer.letter.toUpperCase()}. {answer.answer}
              </Text>
            </TouchableOpacity>
          ))}
        </RadioButton.Group>
      </Card.Content>
    </Card>
  );
};

export default QuestionCard;