import React from 'react';
import { View, Image, Text } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';
import strings from '../../localization/strings';
import ExamDetails from './ExamDetails';
import ProgressSection from './ProgressSection';
import { Exam } from '../../types/exam';

interface ExamCardProps {
  exam: Exam;
  attempts: number;
  score: number | undefined;
  onStart: () => void;
}

const ExamCard: React.FC<ExamCardProps> = ({ exam, attempts, score, onStart }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Card
      style={{
        marginBottom: 16,
        borderRadius: 18,
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: isDarkMode ? 1 : 0,
        elevation: 8,
      }}
    >
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ marginRight: 12, width: 52, height: 52, justifyContent: 'center', alignItems: 'center' }}>
            <Image source={exam.icon} style={{ width: 52, height: 52 }} resizeMode="contain" />
          </View>
          <Title style={{ color: colors.text, flex: 1 }}>{exam.title}</Title>
        </View>
        <Paragraph style={{ color: colors.textSecondary }}>{exam.description}</Paragraph>
        <ExamDetails
          duration={exam.duration}
          passingRate={exam.passingRate || null}
          questionCount={exam.numberOfQuestions || null}
        />
        {attempts > 0 && <ProgressSection attempts={attempts} score={score} />}
      </Card.Content>
      <Card.Actions>
        <Button
          mode="contained"
          onPress={onStart}
          style={{ flex: 1, backgroundColor: colors.primary }}
          labelStyle={{ color: colors.buttonText }}
        >
          <Text style={{ color: colors.buttonText }}>{strings.startPracticeExam}</Text>
        </Button>
      </Card.Actions>
    </Card>
  );
};

export default ExamCard;