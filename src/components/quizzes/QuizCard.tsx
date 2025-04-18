// src/components/quizzes/QuizCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCustomTheme } from '../../context/ThemeContext';
import { Quiz } from '../../types/quiz'; // Ensure this type includes providerId, pathId
import { darkColors, lightColors } from '../../styles/colors';

// Assuming you might want icons based on provider later
const providerIcons: Record<string, string> = {
  gcp: 'google-cloud',
  aws: 'aws',
  azure: 'microsoft-azure',
  default: 'brain',
};

interface QuizCardProps {
  quiz: Quiz;
  isCompleted: boolean;
  onPress: (quiz: Quiz) => void; // Pass the full quiz object
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, isCompleted, onPress }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  const iconName = providerIcons[quiz.providerId] || providerIcons.default;

  return (
    <Card style={[styles.card, { backgroundColor: colors.surface }]} onPress={() => onPress(quiz)}>
      <Card.Content style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon name={iconName} size={30} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Title style={[styles.title, { color: colors.text }]}>{quiz.title}</Title>
          {quiz.description && (
            <Paragraph style={[styles.description, { color: colors.textSecondary }]}>
              {quiz.description}
            </Paragraph>
          )}
        </View>
        {isCompleted && (
          <View style={styles.completedBadge}>
            <Icon name="check-circle" size={20} color={colors.success} />
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 16,
    padding: 8,
    borderRadius: 25,
    // backgroundColor: '#e0f2fe', // Example background
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
  },
  completedBadge: {
    marginLeft: 10,
  },
});

export default QuizCard;
