// src/components/quizzes/QuizCard.tsx
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import strings from '../../localization/strings';
import { Quiz } from '../../types/quiz';
import { getQuizIcon } from '../../utils/iconHelper';

interface QuizCardProps {
  quiz: Quiz;
  isCompleted: boolean;
  onPress: () => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, isCompleted, onPress }) => {
  const { isDarkMode, theme } = useCustomTheme();
  const { colors } = theme;
  
  const imageSource = getQuizIcon(quiz.moduleId);
  const buttonLabel = isCompleted ? 'Review Quiz' : 'Start Quiz';
  const buttonBackgroundColor = isCompleted
    ? colors.buttonCompletedBackground
    : colors.buttonPrimaryBackground;

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: isDarkMode ? 1 : 0,
        }
      ]}
    >
      <Card.Content>
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <Image
              source={imageSource}
              style={styles.iconImage}
              resizeMode="contain"
            />
          </View>
          <Title style={[styles.title, { color: colors.text }]}>{quiz.title}</Title>
        </View>
        <Paragraph style={{ color: colors.textSecondary }}>{quiz.description}</Paragraph>
        <Paragraph style={[styles.questionCount, { color: colors.textSecondary }]}>
          {`${quiz.questionCount} ${strings.questionsSuffix || 'Questions'}`}
        </Paragraph>
        {isCompleted && (
          <Paragraph style={[styles.completedText, { color: colors.success }]}>
            Completed
          </Paragraph>
        )}
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained"
          onPress={onPress}
          style={{ backgroundColor: buttonBackgroundColor }}
          labelStyle={{ color: colors.buttonText }}
        >
          {buttonLabel}
        </Button>
      </Card.Actions>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    marginRight: 12,
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: {
    width: 30,
    height: 30,
  },
  title: {
    marginLeft: 8,
    flex: 1,
  },
  questionCount: {
    marginTop: 8,
  },
  completedText: {
    marginTop: 4,
    fontWeight: 'bold',
  },
});

export default QuizCard;