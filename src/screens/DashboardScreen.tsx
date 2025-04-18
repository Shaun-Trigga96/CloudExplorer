// src/screens/DashboardScreen.tsx
import React, { FC, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { REACT_APP_BASE_URL } from '@env';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import GridItem from '../components/dashboard/GridItem';
import ProgressItem from '../components/dashboard/ProgressItem';
import ErrorBanner from '../components/dashboard/ErrorBanner';
import WarningBanner from '../components/dashboard/WarningBanner';
import {
  Module,
  Quiz,
  QuizResult,
  Exam,
  ExamResult,
  ErrorInfo,
  OverallProgress, // New type
  LearningPath, // New type
} from '../types/dashboard'; // Make sure these types are updated or defined
import { extractFirestoreIndexUrl } from '../utils/firestore';
import { dashboardStyles} from '../styles/dashboardStyles'
const BASE_URL = REACT_APP_BASE_URL;

// --- Icon Maps (Keep as is) ---
const iconMap: Record<string, any> = {
  'digital-transformation': require('../assets/images/digital_transformation.jpeg'),
  'artificial-intelligence': require('../assets/images/artificial_intelligence.jpeg'),
  'infrastructure-application': require('../assets/images/infrastructure_application.jpeg'),
  'scailing-operations': require('../assets/images/scailing_operations.jpeg'),
  'trust-security': require('../assets/images/trust_security.jpeg'),
  'data-transformation': require('../assets/images/data_transformation.jpeg'),
  'default': require('../assets/images/cloud_generic.png'),
};

const examIcons: Record<string, any> = {
  'cloud-digital-leader-exam': require('../assets/images/cloud-digital-leader.png'),
  // Add other exam icons if needed
};

const examColors: Record<string, string> = {
  'cloud-digital-leader-exam': '#4285F4',
  // Add other exam colors if needed
};
// --- End Icon Maps ---

interface DashboardScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DashboardScreen'>;
}

// --- Default State Values ---
const defaultOverallProgress: OverallProgress = {
  totalModulesCompleted: 0,
  totalQuizzesCompleted: 0,
  totalScore: 0,
};

const DashboardScreen: FC<DashboardScreenProps> = ({ navigation }) => {
  const { colors, cardStyle } = useCustomTheme().theme;
  const [loading, setLoading] = useState<boolean>(true);
  // --- Updated State ---
  const [overallProgress, setOverallProgress] = useState<OverallProgress>(defaultOverallProgress);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  // --- Existing State ---
  const [modules, setModules] = useState<Module[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]); // Keep for potential future use (e.g., showing attempts)
  const [examResults, setExamResults] = useState<ExamResult[]>([]); // Keep for potential future use
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({}); // Removed as QuizModule is removed

   const toggleModuleExpanded = (moduleId: string) => {
     setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
   };

  // --- Fetch User Data (Updated) ---
  const fetchUserData = async () => {
    setLoading(true);
    setErrorInfo(null); // Reset error on fetch
    setOverallProgress(defaultOverallProgress); // Reset progress
    setLearningPaths([]); // Reset paths

    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        // Handle case where user is not logged in (e.g., navigate to Auth)
        navigation.replace('Auth'); // Example: redirect to login
        return;
      }

      // Fetch data from the updated endpoint
      const response = await axios.get(
        `${BASE_URL}/api/v1/users/${storedUserId}/progress`
        // No specific params needed now as the endpoint returns everything by default
      );

      console.log("Dashboard Data Received:", response.data); // Log the received data

      // Set state based on the new structure, providing defaults
      setOverallProgress(response.data.overallProgress || defaultOverallProgress);
      setLearningPaths(response.data.learningPaths || []);
      setModules(response.data.availableModules || []);
      setExams(response.data.availableExams || []); // Use availableExams
      setQuizzes(response.data.availableQuizzes || []);
      setQuizResults(response.data.quizResults || []);
      setExamResults(response.data.examResults || []);

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'An unknown error occurred';

      // Keep Firestore index error handling
      if (typeof errorMessage === 'string' && errorMessage.includes('FAILED_PRECONDITION') && errorMessage.includes('index')) {
        setErrorInfo({
          message: 'The database query requires an index which needs to be created.',
          isIndexError: true,
          indexUrl: extractFirestoreIndexUrl(errorMessage),
        });
        // Still try to set available content if provided in error response
        if (err.response?.data?.availableModules) setModules(err.response.data.availableModules);
        if (err.response?.data?.availableExams) setExams(err.response.data.availableExams);
        if (err.response?.data?.availableQuizzes) setQuizzes(err.response.data.availableQuizzes);
      } else {
        setErrorInfo({
          message: `Failed to load dashboard data: ${errorMessage}. Please try again.`,
          isIndexError: false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch data when the screen focuses (e.g., after completing a module/quiz)
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserData();
    });

    return unsubscribe; // Cleanup listener on unmount
  }, [navigation]);


  // --- Helper to get details (unchanged, but used for quizzes now too) ---
  const getResourceDetails = (resourceId: string, resourceType: 'module' | 'quiz' | 'exam') => {
    let item;
    let title = resourceId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    let imageIcon = iconMap['default']; // Default icon
    let color = '#3b82f6'; // Default color

    if (resourceType === 'module') {
      item = modules.find(m => m.id === resourceId);
      if (item) {
        title = item.title;
        imageIcon = iconMap[resourceId] || iconMap['default'];
        // Add specific module colors if needed
      }
    } else if (resourceType === 'quiz') {
      item = quizzes.find(q => q.id === resourceId);
       if (item) {
         title = item.title;
         // Use module's icon/color for associated quiz
         const moduleDetails = getResourceDetails(item.moduleId, 'module');
         imageIcon = moduleDetails.imageIcon;
         color = moduleDetails.color;
       }
    } else if (resourceType === 'exam') {
      item = exams.find(e => e.id === resourceId);
      if (item) {
        title = item.title;
        imageIcon = examIcons[resourceId] || iconMap['default'];
        color = examColors[resourceId] || '#3b82f6';
      }
    }

    return { imageIcon, color, title };
  };

  // --- Aggregate Completed Items ---
  const allCompletedModuleIds = new Set<string>(
    learningPaths.flatMap(path => path.learningProgress?.completedModules || [])
  );
  const allCompletedQuizIds = new Set<string>(
    learningPaths.flatMap(path => path.learningProgress?.completedQuizzes || [])
  );
  const allCompletedExamIds = new Set<string>(
    learningPaths.flatMap(path => path.learningProgress?.completedExams || [])
  );

  // --- Calculate Overall Progress Percentage ---
  const totalAvailableModules = modules.length; // Use total available modules as the denominator
  const progressPercentage = totalAvailableModules > 0
    ? Math.round((overallProgress.totalModulesCompleted / totalAvailableModules) * 100)
    : 0;

  // --- Loading State ---
  if (loading) {
    return (
      <View style={[dashboardStyles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Loading Dashboard...</Text>
      </View>
    );
  }

  // --- Error State (Handles index error separately) ---
  if (errorInfo && (!errorInfo.isIndexError || (modules.length === 0 && exams.length === 0 && quizzes.length === 0))) {
    return (
      <SafeAreaView style={[dashboardStyles.container, { backgroundColor: colors.background }]}>
        <ScrollView style={dashboardStyles.scrollContainer}>
          <ErrorBanner error={errorInfo} onRetry={fetchUserData} />
          {/* Optionally show GridItems even on error */}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Grid Items (Keep as is) ---
  const gridItems = [
    { icon: 'book-open', title: 'Learning Modules', description: 'Interactive GCP concepts', color: '#3b82f6', screen: 'Modules' },
    { icon: 'award', title: 'Practice Exams', description: 'Prepare for certifications', color: '#a855f7', screen: 'Exams' },
    { icon: 'help-circle', title: 'Module Quizzes', description: 'Test your knowledge', color: '#f97316', screen: 'Quizzes' },
    { icon: 'users', title: 'Community', description: 'Connect with learners', color: '#0ea5e9', screen: 'Community' },
    { icon: 'bar-chart-2', title: 'Your Progress', description: 'Track your journey', color: '#22c55e', screen: 'Dashboard' }, // Link to self or specific progress screen
    { icon: 'settings', title: 'Settings', description: 'Customize your app', color: '#ef4444', screen: 'Settings' },
  ];
  // --- End Grid Items ---

  return (
    <SafeAreaView style={[dashboardStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={dashboardStyles.scrollContainer} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* --- Banners --- */}
        {errorInfo?.isIndexError && <WarningBanner onRetry={fetchUserData} />}

        {/* --- Grid --- */}
        <View style={dashboardStyles.gridWrapper}>
          <Text style={[dashboardStyles.gridTitle, { color: colors.text }]}>Explore</Text>
          <View style={dashboardStyles.gridContainer}>
            {gridItems.map((item, index) => (
              <GridItem
                key={item.title}
                {...item}
                index={index}
                navigation={navigation}
              />
            ))}
          </View>
        </View>

        {/* --- Progress Card --- */}
        <Animated.View entering={FadeIn.duration(1200)} style={[dashboardStyles.card, cardStyle, { backgroundColor: colors.surface }]}>
          <Text style={[dashboardStyles.cardTitle, { color: colors.text }]}>Learning Progress</Text>

          {/* Overall Progress Bar */}
          <View style={dashboardStyles.progressSection}>
            <View style={dashboardStyles.progressLabelContainer}>
              <Text style={[dashboardStyles.progressLabel, { color: colors.text }]}>Overall Module Completion</Text>
              <Text style={[dashboardStyles.progressPercentage, { color: colors.primary }]}>{progressPercentage}%</Text>
            </View>
            <View style={[dashboardStyles.progressBarContainer, { backgroundColor: colors.progressBarBackground }]}>
              <View style={[dashboardStyles.progressBar, { width: `${progressPercentage}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={[dashboardStyles.progressSubText, { color: colors.textSecondary }]}>
              {overallProgress.totalModulesCompleted} of {totalAvailableModules} modules completed.
            </Text>
          </View>

          {/* Modules List */}
          <Text style={[dashboardStyles.sectionTitle, { color: colors.text }]}>Modules</Text>
          {modules.length > 0 ? (
            modules.map(module => {
              const { imageIcon, color, title } = getResourceDetails(module.id, 'module');
              const isCompleted = allCompletedModuleIds.has(module.id);
              // Simple status: Completed or Not Started. "In Progress" is harder to track reliably here.
              const status = isCompleted ? 'Completed' : 'Not Started';
              return (
                <ProgressItem
                  key={module.id}
                  title={title}
                  status={status}
                  color={color}
                  imageIcon={imageIcon}
                  onPress={() => navigation.navigate('ModuleDetail', { moduleId: module.id })} // Navigate to module detail
                />
              );
            })
          ) : (
            <Text style={[dashboardStyles.noDataText, { color: colors.textSecondary }]}>No modules available.</Text>
          )}

          {/* Quizzes List (Flat) */}
          <Text style={[dashboardStyles.sectionTitle, { color: colors.text }]}>Quizzes</Text>
          {quizzes.length > 0 ? (
            quizzes.map(quiz => {
              // Find the module this quiz belongs to for details
              const moduleDetails = getResourceDetails(quiz.moduleId, 'module');
              const isCompleted = allCompletedQuizIds.has(quiz.id);
              const status = isCompleted ? 'Completed' : 'Not Started';
              // Get latest result percentage if available
              const latestResult = quizResults
                .filter(qr => qr.quizId === quiz.id)
                .sort((a, b) => {
                  const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                  const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                  return bTime - aTime;
                })[0];

              return (
                <ProgressItem
                  key={quiz.id}
                  title={quiz.title}
                  subtitle={`Part of: ${moduleDetails.title}`} // Add subtitle for context
                  status={status}
                  percentage={latestResult?.percentage} // Show latest percentage
                  color={moduleDetails.color} // Use module color
                  imageIcon={moduleDetails.imageIcon} // Use module icon
                  onPress={() => navigation.navigate('QuizzesDetail', { moduleId: quiz.moduleId, providerId: '', pathId: '', quizId: quiz.id } as { moduleId: string; providerId: string; pathId: string; quizId: string })} // Navigate to quiz detail
                />
              );
            })
          ) : (
            <Text style={[dashboardStyles.noDataText, { color: colors.textSecondary }]}>No quizzes available.</Text>
          )}

          {/* Exams List */}
          <Text style={[dashboardStyles.sectionTitle, { color: colors.text }]}>Exams</Text>
          {exams.length > 0 ? (
            exams.map(exam => {
              const { imageIcon, color, title } = getResourceDetails(exam.id, 'exam');
              const isCompleted = allCompletedExamIds.has(exam.id);
              const status = isCompleted ? 'Completed' : 'Not Started'; // Or 'Attempted' based on examResults?
              // Get latest result percentage if available
              const latestResult = examResults
                .filter(er => er.examId === exam.id)
                .sort((a, b) => {
                  const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                  const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                  return bTime - aTime;
                })[0];
              return (
                <ProgressItem
                  key={exam.id}
                  title={title}
                  status={status}
                  percentage={latestResult?.percentage} // Show latest percentage
                  color={color}
                  imageIcon={imageIcon}
                  onPress={() => navigation.navigate('ExamDetail', { examId: exam.id, title: exam.title, providerId: '', pathId: '' })} // Navigate to exam detail
                />
              );
            })
          ) : (
            <Text style={[dashboardStyles.noDataText, { color: colors.textSecondary }]}>No exams available.</Text>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};


export default DashboardScreen;
