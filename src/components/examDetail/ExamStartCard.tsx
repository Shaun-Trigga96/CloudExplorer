// src/components/examsDetail/ExamStartCard.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Card, Title, Button } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';

interface ExamStartCardProps {
  title: string;
  questionCount: number;
  onStart: () => void;
  onCancel: () => void;
}

const ExamStartCard: React.FC<ExamStartCardProps> = ({ title, questionCount, onStart, onCancel }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Card style={{ padding: 8, backgroundColor: colors.surface, borderRadius: 12 }}>
      <Card.Content>
        <Title style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 16 }}>
          {title}
        </Title>
        <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
          You are about to start the {title} certification practice exam.
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.examInfoBackground, padding: 16, borderRadius: 8, marginBottom: 24 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>Total Questions</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>{questionCount}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>Time Limit</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>2 Hours</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 4 }}>Passing Score</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>70%</Text>
          </View>
        </View>
        <Text style={{ backgroundColor: colors.examRulesBackground, padding: 16, borderRadius: 8, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 }}>
          • You can navigate between questions using the Previous and Next buttons.
          {'\n'}• You can jump to any question using the question navigator.
          {'\n'}• The timer will start as soon as you begin.
          {'\n'}• Your progress will be saved if you exit the app.
          {'\n'}• Submit your exam when finished or when time runs out.
        </Text>
      </Card.Content>
      <Card.Actions style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <Button
          mode="outlined"
          onPress={onCancel}
          style={{ flex: 1, marginRight: 8, borderColor: colors.textSecondary }}
          labelStyle={{ color: colors.textSecondary }}
        >
          Cancel
        </Button>
        <Button
          mode="contained"
          onPress={onStart}
          style={{ flex: 2, backgroundColor: colors.primary }}
          labelStyle={{ color: colors.buttonText }}
        >
          Begin Exam
        </Button>
      </Card.Actions>
    </Card>
  );
};

export default ExamStartCard;