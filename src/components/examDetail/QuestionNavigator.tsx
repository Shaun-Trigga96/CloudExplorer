// src/components/examsDetail/QuestionNavigator.tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { Button } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';

interface QuestionNavigatorProps {
  questions: any[];
  currentQuestionIndex: number;
  userAnswers: Record<number, string>;
  onNavigate: (index: number) => void;
}

const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  currentQuestionIndex,
  userAnswers,
  onNavigate,
}) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ paddingVertical: 8, paddingHorizontal: 4, backgroundColor: colors.bottomBarBackground, borderTopWidth: 1, borderTopColor: colors.border }}
    >
      {questions.map((_, index) => {
        const isCurrent = index === currentQuestionIndex;
        const isAnswered = !!userAnswers[questions[index].id];
        let buttonMode: "contained" | "outlined" | "text" = "text";
        let buttonStyle = {};
        let labelStyle = { color: colors.textSecondary };

        if (isCurrent) {
          buttonMode = "contained";
          buttonStyle = { backgroundColor: colors.primary };
          labelStyle = { color: colors.buttonText };
        } else if (isAnswered) {
          buttonMode = "outlined";
          buttonStyle = { borderColor: colors.primary };
          labelStyle = { color: colors.primary };
        }

        return (
          <Button
            key={index}
            mode={buttonMode}
            compact
            onPress={() => onNavigate(index)}
            style={{ marginHorizontal: 4, minWidth: 40, ...buttonStyle }}
            labelStyle={{ fontSize: 12, ...labelStyle }}
          >
            {index + 1}
          </Button>
        );
      })}
    </ScrollView>
  );
};

export default QuestionNavigator;