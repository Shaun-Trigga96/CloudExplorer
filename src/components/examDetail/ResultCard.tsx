// src/components/examDetail/ResultCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Divider, Avatar } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';
import { ExamResult } from '../../types/exam';

interface ResultCardProps {
  result: ExamResult;
  duration?: number; // Changed from totalDuration to duration
  timeSpent: number;
  formatTime: (seconds: number) => string;
  title: string;
  passingScore?: number;
}

const ResultCard: React.FC<ResultCardProps> = ({
  result,
  duration, // Updated prop name
  timeSpent,
  formatTime,
  title,
  passingScore,
}) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  // Calculate correct answers count
  const correctCount = result.answeredQuestions?.filter(q => q.isCorrect).length || 0;
  const totalCount = result.answeredQuestions?.length || 0;

  // Use result's passing score if available, otherwise use passed passingScore
  const effectivePassingScore = result.passingScore || passingScore || 70;

  return (
    <Card style={[styles.container, { backgroundColor: colors.surface }]}>
      <Card.Content>
        <Title style={[styles.title, { color: colors.text }]}>{title} - Results</Title>
        
        <View style={styles.scoreCircleContainer}>
          <View style={[styles.scoreCircle, { 
            backgroundColor: result.passed ? colors.success + '20' : colors.error + '20',
            borderColor: result.passed ? colors.success : colors.error 
          }]}>
            <Text style={[styles.scoreText, { color: result.passed ? colors.success : colors.error }]}>
              {result.percentage}%
            </Text>
            <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
              {result.passed ? 'PASSED' : 'FAILED'}
            </Text>
          </View>
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Correct Answers</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{correctCount}/{totalCount}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Time Spent</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{formatTime(timeSpent)}</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pass Threshold</Text>
            <Text style={[styles.statValue, { color: colors.text }]}>{effectivePassingScore}%</Text>
          </View>
        </View>

        <Divider style={[styles.divider, { backgroundColor: colors.border }]} />
        
        <Paragraph style={[styles.message, { color: colors.text }]}>
          {result.passed 
            ? "Congratulations! You've successfully passed the exam."
            : "You didn't pass this time, but don't worry. Review your answers and try again."}
        </Paragraph>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 12,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  scoreCircleContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  divider: {
    marginVertical: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default ResultCard;