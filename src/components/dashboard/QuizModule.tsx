import React, { FC } from 'react';
import { View, Text, TouchableOpacity, Image, ImageSourcePropType, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { QuizResult } from '../../types/dashboard';
import { formatDate } from '../../utils/formatDate';
import { useCustomTheme } from '../../context/ThemeContext';

interface QuizModuleProps {
  moduleId: string;
  title: string;
  quizzes: QuizResult[];
  isExpanded: boolean;
  color: string;
  imageIcon: ImageSourcePropType;
  onToggle: (moduleId: string) => void;
}

const QuizModule: FC<QuizModuleProps> = ({ moduleId, title, quizzes, isExpanded, color, imageIcon, onToggle }) => {
  const { colors } = useCustomTheme().theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.quizModuleBackground }]}>
      <TouchableOpacity
        style={[styles.header, { borderColor: color, backgroundColor: colors.surface }]}
        onPress={() => onToggle(moduleId)}
      >
        <View style={styles.titleContainer}>
          <Image source={imageIcon} style={styles.imageIcon} resizeMode="contain" />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        <View style={styles.rightSection}>
          <Text style={[styles.countText, { color: colors.textSecondary }]}>{quizzes.length} Quizzes</Text>
          <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
      {isExpanded && (
        <View style={[styles.quizList, { backgroundColor: colors.quizModuleBackground }]}>
          {quizzes.length > 0 ? (
            quizzes.map((quiz, index) => {
              const isCompleted = quiz.score !== undefined && quiz.totalQuestions !== undefined;
              return (
                <View
                  key={quiz.id}
                  style={[
                    styles.quizItem,
                    { backgroundColor: colors.quizItemBackground },
                    index < quizzes.length - 1 && [styles.quizItemBorder, { borderBottomColor: colors.border }],
                  ]}
                >
                  <View style={styles.quizDetails}>
                    <Text
                      style={[styles.quizTitle, { color: isCompleted ? colors.text : colors.textSecondary }]}
                    >
                      Quiz {index + 1}
                      {quiz.timestamp && ` - ${formatDate(quiz.timestamp)}`}
                      {!isCompleted && ' (Not Started)'}
                    </Text>
                    <Text style={[styles.quizScore, { color: colors.textSecondary }]}>
                      {isCompleted
                        ? `Score: ${quiz.score}/${quiz.totalQuestions} (${quiz.percentage}%)`
                        : 'Not yet completed'}
                    </Text>
                  </View>
                  {isCompleted && quiz.percentage !== undefined && (
                    <View style={[styles.progressContainer, { backgroundColor: colors.progressBarBackground }]}>
                      <View style={[styles.progress, { width: `${quiz.percentage}%`, backgroundColor: color }]} />
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>No quizzes available for this module.</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderLeftWidth: 4,
    borderRadius: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countText: {
    fontSize: 13,
    marginRight: 8,
  },
  quizList: {
    padding: 8,
  },
  quizItem: {
    padding: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  quizItemBorder: {
    borderBottomWidth: 1,
  },
  quizDetails: {
    marginBottom: 8,
  },
  quizTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  quizScore: {
    fontSize: 13,
  },
  progressContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 3,
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
});

export default QuizModule;