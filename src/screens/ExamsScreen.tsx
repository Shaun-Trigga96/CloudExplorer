// src/screens/ExamsScreen.tsx
import React from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import { Title, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useCustomTheme } from '../context/ThemeContext';
import { darkColors, lightColors } from '../styles/colors';
import { RootStackParamList } from '../navigation/RootNavigator';
import strings from '../localization/strings';
import { useExams } from '../components/hooks/useExams';
import {  ErrorView } from '../components/common';
import { examsStyles } from '../styles/examsStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExamCard } from '../components/exams';

type ExamsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExamDetail'>;

const ExamsScreen = () => {
  const navigation = useNavigation<ExamsScreenNavigationProp>();
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;
  const { exams, examAttempts, examScores, loading, error, userIdError, fetchExamAttempts } = useExams();

  const handleStartExam = (examId: string, examTitle: string) => {
    navigation.navigate('ExamDetail', { examId, title: examTitle });
  };

  const handleRetry = async () => {
    const userId = await AsyncStorage.getItem('userId');
    if (userId) {
      await fetchExamAttempts(userId);
    } else {
      navigation.navigate('Auth');
    }
  };

  if (userIdError) {
    return (
      <ErrorView
        message={userIdError}
        onRetry={() => navigation.navigate('Auth')}
      />
    );
  }

  if (error) {
    return (
      <ErrorView
      message={error}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <ScrollView
      style={[examsStyles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 20 }}
    >
      <Title style={[examsStyles.screenTitle, { color: colors.text }]}>
        {strings.certificationPracticeExamsTitle}
      </Title>
      <Paragraph style={[examsStyles.screenDescription, { color: colors.textSecondary }]}>
        {strings.certificationPracticeExamsDescription}
      </Paragraph>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
      ) : (
        exams.map(exam => (
          <ExamCard
            key={exam.examId}
            exam={exam}
            attempts={examAttempts[exam.examId] || 0}
            score={examScores[exam.examId]}
            onStart={() => handleStartExam(exam.examId, exam.title)}
          />
        ))
      )}
    </ScrollView>
  );
};

export default ExamsScreen;