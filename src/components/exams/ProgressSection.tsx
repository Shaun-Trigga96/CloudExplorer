// src/components/exams/ProgressSection.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';
import strings from '../../localization/strings';

interface ProgressSectionProps {
  attempts: number;
  score: number | undefined;
}

const ProgressSection: React.FC<ProgressSectionProps> = ({ attempts, score }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <View style={[styles.progressContainer, { backgroundColor: colors.progressBackground }]}>
      <Text style={[styles.progressText, { color: colors.textSecondary }]}>
        {`${strings.previousAttemptsPrefix}${attempts}`}
      </Text>
      {score !== undefined && (
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          {`${strings.bestScorePrefix}${score.toFixed(1)}${strings.percentSuffix}`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    marginBottom: 4,
  },
});

export default ProgressSection;