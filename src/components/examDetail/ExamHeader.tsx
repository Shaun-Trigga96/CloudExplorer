// src/components/examsDetail/ExamHeader.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';

interface ExamHeaderProps {
  title: string;
  timeLeft: number;
  timerColor: string;
  formatTime: (seconds: number) => string;
  currentQuestionIndex: number;
  totalQuestions: number;
}

const ExamHeader: React.FC<ExamHeaderProps> = ({
  title,
  timeLeft,
  timerColor,
  formatTime,
  currentQuestionIndex,
  totalQuestions,
}) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <View style={{ padding: 16, backgroundColor: colors.surface, elevation: 4 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>{title}</Text>
      <Text style={{ fontSize: 16, color: timerColor, marginBottom: 12, fontWeight: timeLeft < 60 ? 'bold' : 'normal' }}>
        Time Remaining: {formatTime(timeLeft)}
      </Text>
      <ProgressBar
        progress={currentQuestionIndex / totalQuestions}
        color={colors.primary}
        style={{ height: 8, borderRadius: 4, backgroundColor: colors.progressBarBackground, marginBottom: 8 }}
      />
      <Text style={{ textAlign: 'center', color: colors.textSecondary, marginBottom: 8 }}>
        Question {currentQuestionIndex + 1} of {totalQuestions}
      </Text>
    </View>
  );
};

export default ExamHeader;