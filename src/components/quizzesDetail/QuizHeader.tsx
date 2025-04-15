// src/components/quizzesDetail/QuizHeader.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Title } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';

interface QuizHeaderProps {
  moduleTitle: string | null;
  progress: number;
  totalQuestions: number;
}

const QuizHeader: React.FC<QuizHeaderProps> = ({ moduleTitle, progress, totalQuestions }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <View style={[styles.header, { backgroundColor: colors.surface }]}>
      <Title style={[styles.moduleTitle, { color: colors.primary }]}>
        {moduleTitle ? `${moduleTitle} Quiz` : 'Quiz'}
      </Title>
      <Text style={[styles.progress, { color: colors.textSecondary }]}>
        Progress: {progress} / {totalQuestions}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  moduleTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 5,
  },
  progress: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default QuizHeader;