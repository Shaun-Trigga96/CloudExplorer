// src/screens/ExamsScreen.tsx
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Title, Paragraph, Text } from 'react-native-paper'; // Added Text
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'; // Added useRoute, RouteProp
import { StackNavigationProp } from '@react-navigation/stack';
import { useCustomTheme } from '../context/ThemeContext';
import { darkColors, lightColors } from '../styles/colors';
import { RootStackParamList } from '../navigation/RootNavigator';
import strings from '../localization/strings';
import { useExams } from '../components/hooks/useExams'; // Updated hook import
import { ErrorView, LoadingView } from '../components/common'; // Use LoadingView
import { examsStyles } from '../styles/examsStyles';
import { ExamCard } from '../components/exams';
import { Exam } from '../types/exam'; // Import Exam type

type ExamsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExamDetail'>;
type ExamsScreenRouteProp = RouteProp<RootStackParamList, 'ExamsScreen'>; // Define route prop type

const ExamsScreen = () => {
  const navigation = useNavigation<ExamsScreenNavigationProp>();
  const route = useRoute<ExamsScreenRouteProp>(); // Use useRoute hook
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  // --- Get providerId and pathId from route params ---
  const { providerId, pathId } = route.params;

  // --- Use the updated hook ---
  const { exams, examAttempts, examScores, loading, error, userIdError } = useExams(providerId, pathId);

  // --- Update handleStartExam to include providerId and pathId ---
  const handleStartExam = (exam: Exam) => { // Pass the full exam object
    console.log(
      `[ExamsScreen] Navigating to Exam Detail for exam ${exam.examId}, provider ${exam.providerId}, path ${exam.pathId}`
    );
    navigation.navigate('ExamDetail', {
      examId: exam.examId, // Use exam.examId
      title: exam.title,
      providerId: exam.providerId, // Pass from exam data
      pathId: exam.pathId,       // Pass from exam data
    });
  };

  const handleRetry = async () => {
    // Use the refetch function from the hook

  };

  // --- Handle userIdError specifically ---
  if (userIdError) {
    return (
      <ErrorView
        message={userIdError}
      />
    );
  }

  // --- Loading State ---
  if (loading) {
    // Use LoadingView for consistency
    return <LoadingView message={ 'Loading Exams...'} />;
  }

  // --- General Error State ---
  if (error) {
    return (
      <ErrorView
        message={error}
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

      {exams.length > 0 ? (
        exams.map(exam => (
          <ExamCard
            key={exam.examId} // Use exam.id
            exam={exam}
            attempts={examAttempts[exam.examId] || 0} // Use exam.id
            score={examScores[exam.examId]} // Use exam.id
            onStart={() => handleStartExam(exam)} // Pass the full exam object
          />
        ))
      ) : (
        // --- Display message when no exams are found ---
        <View style={examsStyles.noExamsContainer}>
          <Text style={[examsStyles.noExamsText, { color: colors.textSecondary }]}>
            No practice exams available for this learning path yet.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default ExamsScreen;
