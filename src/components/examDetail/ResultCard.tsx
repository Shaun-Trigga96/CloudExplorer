// src/components/examsDetail/ResultCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Card, Title, Divider } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';
import { ExamResult } from '../../types/exam';
import ReviewCard from './ReviewCard';

interface ResultCardProps {
  result: ExamResult;
  startTime: Date | null;
  timeSpent: number;
  formatTime: (seconds: number) => string;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, startTime, timeSpent, formatTime }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Card style={{ margin: 16, backgroundColor: colors.surface, borderRadius: 12 }}>
      <Card.Content>
        <Title style={{ fontSize: 24, textAlign: 'center', color: colors.text, marginBottom: 16 }}>
          Exam Results: {result.isPassed ? 'PASSED' : 'FAILED'}
        </Title>
        <View style={{ backgroundColor: colors.neutralBackground, padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, color: colors.text, marginBottom: 8 }}>
            Score: {result.score.toFixed(1)}%
          </Text>
          <Text style={{ fontSize: 16, color: colors.text, marginBottom: 8 }}>
            Correct Answers: {result.correctAnswers} / {result.totalQuestions}
          </Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 8 }}>
            Passing Score: 70%
          </Text>
          {startTime && (
            <Text style={{ fontSize: 16, color: colors.textSecondary, marginBottom: 8 }}>
              Exam Started: {startTime.toLocaleString()}
            </Text>
          )}
          <Text style={{ fontSize: 16, color: colors.textSecondary }}>
            Time Spent: {formatTime(timeSpent)}
          </Text>
        </View>
        <Divider style={{ marginVertical: 16, backgroundColor: colors.border }} />
        <Title style={{ fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16 }}>
          Question Review
        </Title>
        {result.answeredQuestions.map((item, index) => (
          <ReviewCard key={index} item={item} index={index} />
        ))}
      </Card.Content>
    </Card>
  );
};

export default ResultCard;