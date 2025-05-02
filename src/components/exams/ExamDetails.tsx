// src/components/exams/ExamDetails.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';
import strings from '../../localization/strings';

interface ExamDetailsProps {
  duration: number | null;
  passingRate: number;
  questionCount: number; // Add questionCount prop
}

const ExamDetails: React.FC<ExamDetailsProps> = ({ duration, passingRate, questionCount }) => { // Destructure questionCount
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <View style={[styles.examDetails, { backgroundColor: colors.examDetailBackground }]}>
      <View style={styles.examDetailItem}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{strings.durationLabel}</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {duration ? `${duration} ${strings.minutesSuffix}` : 'N/A'}
        </Text>
      </View>
      <View style={styles.examDetailItem}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{strings.passRateLabel}</Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {passingRate ? `${passingRate}${strings.percentSuffix}` : 'N/A'}
        </Text>
      </View>
      <View style={styles.examDetailItem}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{strings.questionsLabel || 'Questions'}</Text> {/* Add 'Questions' to strings.ts if needed */}
        <Text style={[styles.detailValue, { color: colors.text }]}>
          {questionCount ? `${questionCount}${strings.questionsSuffix}` : 'N/A'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  examDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
  },
  examDetailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ExamDetails;