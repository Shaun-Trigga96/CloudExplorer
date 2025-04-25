import React from 'react';
import { View, StyleSheet, ImageSourcePropType, Image } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCustomTheme } from '../../context/ThemeContext';
import { Quiz } from '../../types/quiz';
import { darkColors, lightColors } from '../../styles/colors';

interface QuizCardProps {
  quiz: Quiz & { icon: ImageSourcePropType };
  isCompleted: boolean;
  onPress: (quiz: Quiz) => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, isCompleted, onPress }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Card 
      style={[styles.card, { backgroundColor: colors.surface }]} 
      onPress={() => onPress(quiz)}
    >
      <Card.Content style={styles.content}>
        <Image source={quiz.icon} style={styles.icon} resizeMode="cover" />
        <View style={styles.textContainer}>
          <Title style={[styles.title, { color: colors.text }]}>{quiz.title}</Title>
          {quiz.description && (
            <Paragraph style={[styles.description, { color: colors.textSecondary }]}>
              {quiz.description}
            </Paragraph>
          )}
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Icon name="check-circle" size={16} color={colors.success} />
              <Paragraph style={[styles.completedText, { color: colors.success }]}>
                Completed
              </Paragraph>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  completedText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default QuizCard;