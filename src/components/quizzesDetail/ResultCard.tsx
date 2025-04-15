// src/components/quizzesDetail/ResultCard.tsx
import React from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Button, Title } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';

interface ResultCardProps {
  score: number;
  totalQuestions: number;
  onRetry: () => void;
  onBack: () => void;
  fadeAnim: Animated.Value;
}

const ResultCard: React.FC<ResultCardProps> = ({ score, totalQuestions, onRetry, onBack, fadeAnim }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Animated.View style={[styles.resultCard, { opacity: fadeAnim, backgroundColor: colors.surface }]}>
      <Title style={[styles.resultTitle, { color: colors.text }]}>Quiz Results</Title>
      <Text style={[styles.resultScore, { color: colors.primary }]}>
        {score} / {totalQuestions}
      </Text>
      <Text style={[styles.scorePercentage, { color: colors.textSecondary }]}>
        {Math.round((score / totalQuestions) * 100)}%
      </Text>
      <View style={styles.resultActions}>
        <Button
          mode="contained"
          onPress={onRetry}
          style={[styles.retryButton, { backgroundColor: colors.success }]}
          labelStyle={{ color: colors.buttonText }}
        >
          Try Again
        </Button>
        <Button
          mode="contained"
          onPress={onBack}
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          labelStyle={{ color: colors.buttonText }}
        >
          Back to Module
        </Button>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  resultCard: {
    padding: 20,
    borderRadius: 15,
    elevation: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 10,
  },
  resultScore: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 20,
  },
  scorePercentage: {
    fontSize: 24,
    marginBottom: 20,
  },
  resultActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  retryButton: {
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
  },
});

export default ResultCard;