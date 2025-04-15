// src/components/quizzesDetail/AnswerButton.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';

interface AnswerButtonProps {
  answer: string;
  letter: string;
  isSelected: boolean;
  onPress: () => void;
}

const AnswerButton: React.FC<AnswerButtonProps> = ({ answer, letter, isSelected, onPress }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.answerButton,
        { backgroundColor: colors.surface, borderColor: colors.border },
        isSelected && { backgroundColor: colors.selectedAnswerBackground, borderColor: colors.selectedAnswerBackground },
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.answerInner}>
        <Text style={[styles.answerLetter, { color: colors.textSecondary }, isSelected && { color: colors.selectedAnswerText }]}>
          {letter.toUpperCase()}
        </Text>
        <Text style={[styles.answerText, { color: colors.text }, isSelected && { color: colors.selectedAnswerText }]}>
          {answer}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  answerButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    elevation: 2,
  },
  answerInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  answerLetter: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  answerText: {
    fontSize: 16,
  },
});

export default AnswerButton;