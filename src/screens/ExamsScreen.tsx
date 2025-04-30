// src/screens/ExamsScreen.tsx
import React, { useEffect } from 'react'; // Import useEffect
import { ScrollView, View, Text } from 'react-native'; // Removed Button from here
import { Title, Paragraph, Button, ActivityIndicator } from 'react-native-paper'; // Added Button, ActivityIndicator from paper
import { useNavigation } from '@react-navigation/native'; // Removed useRoute, RouteProp
import { StackNavigationProp } from '@react-navigation/stack';
import { useCustomTheme } from '../context/ThemeContext';
import { darkColors, lightColors } from '../styles/colors';
import { RootStackParamList } from '../navigation/RootNavigator';
import strings from '../localization/strings';
import { useExams } from '../components/hooks/useExams'; // This import seems correct based on component structure
import { ErrorView, LoadingView } from '../components/common';
import { examsStyles } from '../styles/examsStyles';
import { ExamCard } from '../components/exams';
import { Exam } from '../types/exam';
import { useActiveLearningPath } from '../context/ActiveLearningPathContext'; // <-- Import context hook

type ExamsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ExamDetail'>;
// Removed ExamsScreenRouteProp as route params are no longer used

const ExamsScreen = () => {
  const navigation = useNavigation<ExamsScreenNavigationProp>();
  // const route = useRoute<ExamsScreenRouteProp>(); // <-- Remove useRoute
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  // --- Get providerId and pathId from CONTEXT ---
  const { activeProviderId, activePathId } = useActiveLearningPath(); // <-- Use context

  // --- Use the hook with context IDs ---
  // Pass context IDs directly to the hook
  // Assuming useExams provides refetchExams
  const { exams, examAttempts, examScores, loading, error, userIdError, refetchExams } = useExams(activeProviderId, activePathId); // <-- Pass context IDs

  // --- handleStartExam (No change needed here, it uses exam object) ---
  const handleStartExam = (exam: Exam) => {
    console.log(
      `[ExamsScreen] Navigating to Exam Detail for exam ${exam.examId}, provider ${exam.providerId}, path ${exam.pathId}`
    );
    navigation.navigate('ExamDetail', {
      examId: exam.examId,
      title: exam.title,
      providerId: exam.providerId, // Pass from exam data
      pathId: exam.pathId,       // Pass from exam data
    });
  };

  // --- Retry Function ---
  const handleRetry = () => {
    // Use the refetch function from the hook if available
    if (refetchExams) {
        console.log("[ExamsScreen] Retrying fetch...");
        refetchExams();
    } else {
        console.warn("[ExamsScreen] refetchExams function not available from useExams hook.");
        // Optionally implement a basic state reset and re-trigger if refetch isn't available
    }
  };

  // --- Add check for missing context ---
  useEffect(() => {
    // Optional: Log context values for debugging
    console.log('[ExamsScreen] Context values:', { activeProviderId, activePathId });
  }, [activeProviderId, activePathId]);

  // --- RENDER LOGIC ---

  // 1. Check for missing context FIRST
  if (!activeProviderId || !activePathId) {
    return (
      <View style={[examsStyles.container, examsStyles.noExamsContainer, { backgroundColor: colors.background }]}>
        <Text style={[examsStyles.noExamsText, { color: colors.textSecondary, textAlign: 'center', marginBottom: 16 }]}>
          Please select a learning path first to see available exams.
        </Text>
        <Button
            mode="contained"
            onPress={() => navigation.navigate('Home')} // Navigate to Home for path selection
            style={{ backgroundColor: colors.primary }}
            labelStyle={{ color: colors.buttonText }}
        >
          Select Learning Path
        </Button>
      </View>
    );
  }

  // 2. Handle userIdError (if applicable)
  if (userIdError) {
    return (
      <ErrorView
        message={userIdError}
        // No retry needed for userIdError, usually requires re-login
      />
    );
  }

  // 3. Loading State
  if (loading) {
    return <LoadingView message={'Loading Exams...'} />;
  }

  // 4. General Error State
  if (error) {
    return (
      <ErrorView
        message={error}
        onRetry={handleRetry} // Use the retry handler
      />
    );
  }

  // 5. Main Content (Exams List or No Exams Message)
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
            key={exam.examId} // Use exam.examId as key
            exam={exam}
            attempts={examAttempts[exam.examId] || 0}
            score={examScores[exam.examId]}
            onStart={() => handleStartExam(exam)}
          />
        ))
      ) : (
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