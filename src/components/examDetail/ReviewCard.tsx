// src/components/examsDetail/ReviewCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Card, Divider } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';

interface ReviewCardProps {
  item: {
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string;
  };
  index: number;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ item, index }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Card
      style={{
        marginBottom: 16,
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderLeftWidth: 5,
        borderLeftColor: item.isCorrect ? colors.success : colors.error,
      }}
    >
      <Card.Content>
        <Text style={{ fontWeight: 'bold', color: colors.textSecondary, marginBottom: 8 }}>
          Question {index + 1}
        </Text>
        <Text style={{ fontSize: 16, color: colors.text, marginBottom: 12 }}>{item.question}</Text>
        <View style={{ marginVertical: 12, gap: 4 }}>
          <Text style={{ color: colors.textSecondary }}>
            Your Answer: {item.userAnswer.toUpperCase() || 'Not Answered'}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Correct Answer: {item.correctAnswer.toUpperCase()}
          </Text>
        </View>
        <Divider style={{ marginVertical: 12, backgroundColor: colors.border }} />
        <Text style={{ fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>Explanation:</Text>
        <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>{item.explanation}</Text>
      </Card.Content>
    </Card>
  );
};

export default ReviewCard;