// c:\Users\thabi\Desktop\CloudExplorer\src\screens\DashboardScreen.tsx
import React, { FC, useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { REACT_APP_BASE_URL } from '@env';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import { useActiveLearningPath } from '../context/ActiveLearningPathContext'; // Import context hook
import GridItem from '../components/dashboard/GridItem';
import ProgressItem from '../components/dashboard/ProgressItem';
import ErrorBanner from '../components/dashboard/ErrorBanner';
import WarningBanner from '../components/dashboard/WarningBanner';
import {
  QuizResult,
  ExamResult,
  ErrorInfo,
  OverallProgress,
  LearningPath,
  ApiModule,
  ApiQuiz,
  ApiExam,
} from '../types/dashboard';
import { extractFirestoreIndexUrl } from '../utils/firestore';
import { dashboardStyles} from '../styles/dashboardStyles'
import { imageMapRecord } from '../utils/imageMap';


const BASE_URL = REACT_APP_BASE_URL;

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
  // Navigation prop might still be needed if navigating *from* Dashboard
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainApp'>; // Changed to MainApp as it's within TabNavigator
}

// --- Removed Route Prop Type ---
// type DashboardScreenRouteProp = RouteProp<RootStackParamList, 'DashboardScreen'>;

// --- Default State Values ---
const defaultOverallProgress: OverallProgress = {
  totalModulesCompleted: 0,
  totalQuizzesCompleted: 0,
  totalExamsCompleted: 0,
  totalScore: 0,
};

const DashboardScreen: FC<DashboardScreenProps> = ({ navigation }) => {
  const { colors, cardStyle } = useCustomTheme().theme;
  const [loading, setLoading] = useState<boolean>(true);
  const [overallProgress, setOverallProgress] = useState<OverallProgress>(defaultOverallProgress);
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [exams, setExams] = useState<ApiExam[]>([]);
  const [quizzes, setQuizzes] = useState<ApiQuiz[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  // --- Get active path from context ---
  const { activeProviderId, activePathId } = useActiveLearningPath();

  // --- Removed route and route.params access ---
  // const route = useRoute<DashboardScreenRouteProp>();
  // const providerId = route.params?.providerId;
  // const pathId = route.params?.pathId;

  // --- Fetch User Data (Updated) ---
  const fetchUserData = useCallback(async (currentProviderId: string, currentPathId: string) => {
    setLoading(true);
    setErrorInfo(null);
    setOverallProgress(defaultOverallProgress);
    setLearningPaths([]);
    setModules([]);
    setQuizzes([]);
    setExams([]);

    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        // Consider navigating to Auth via RootNavigator if needed
        // navigation.navigate('Auth'); // This might not work correctly from inside TabNavigator
        console.error("[DashboardScreen] User ID not found, cannot fetch data.");
        setErrorInfo({ message: 'User session not found. Please log in again.', isIndexError: false });
        setLoading(false);
        return;
      }

      console.log(`[DashboardScreen] Fetching data for user: ${storedUserId}, path: ${currentProviderId}/${currentPathId}`);

      // --- Call 1: Get User Progress Summary ---
      const progressResponse = await axios.get(
        `${BASE_URL}/api/v1/users/${storedUserId}/progress`
      );
      console.log("[DashboardScreen] Progress Data Received:", progressResponse.data);
      if (progressResponse.data.status !== 'success') throw new Error('Failed to fetch user progress');
      setOverallProgress(progressResponse.data.data.overallProgress || defaultOverallProgress);
      setLearningPaths(progressResponse.data.data.learningPaths || []);
      setQuizResults(progressResponse.data.data.quizResults || []);
      setExamResults(progressResponse.data.data.examResults || []);

      // --- Call 2: Get Available Modules for the Active Path ---
      try {
        interface ListModulesResponse { status: string; data: { modules: ApiModule[]; hasMore: boolean; lastId: string | null; } }
        const modulesResponse = await axios.get<ListModulesResponse>(`${BASE_URL}/api/v1/modules/list`, {
          params: { providerId: currentProviderId, pathId: currentPathId, limit: 20 }
        });
        console.log("[DashboardScreen] Modules Data Received:", modulesResponse.data);
        if (modulesResponse.data.status !== 'success') throw new Error('Failed to fetch modules');
        setModules(modulesResponse.data.data.modules || []);
      } catch (moduleError) {
         console.error("Error fetching modules for dashboard:", moduleError);
         setErrorInfo(prev => ({
             message: `${prev?.message || ''} Failed to load modules.`.trim(),
             isIndexError: false,
             indexUrl: prev?.indexUrl
         }));
      }

      // --- Call 3: Get Available Quizzes for the Active Path ---
      try {
        interface ListQuizzesResponse { status: string; data: { quizzes: ApiQuiz[]; hasMore: boolean; lastId: string | null; } }
        const quizzesResponse = await axios.get<ListQuizzesResponse>(`${BASE_URL}/api/v1/quizzes/list-quizzes`, {
          params: { providerId: currentProviderId, pathId: currentPathId, limit: 20 }
        });
        console.log("[DashboardScreen] Quizzes Data Received:", quizzesResponse.data);
         if (quizzesResponse.data.status !== 'success') throw new Error('Failed to fetch quizzes');
        setQuizzes(quizzesResponse.data.data.quizzes || []);
      } catch (quizError) {
         console.error("Error fetching quizzes for dashboard:", quizError);
         setErrorInfo(prev => ({
             message: `${prev?.message || ''} Failed to load quizzes.`.trim(),
             isIndexError: false,
             indexUrl: prev?.indexUrl
         }));
      }

      // --- Call 4: Get Available Exams for the Active Path ---
      try {
        interface ListExamsResponse { status: string; data: { exams: ApiExam[]; hasMore: boolean; lastId: string | null; } }
        const examsResponse = await axios.get<ListExamsResponse>(`${BASE_URL}/api/v1/exams/list-exams`, {
          params: { providerId: currentProviderId, pathId: currentPathId, limit: 20 }
        });
        console.log("[DashboardScreen] Exams Data Received:", examsResponse.data);
        if (examsResponse.data.status !== 'success') throw new Error('Failed to fetch exams');
        setExams(examsResponse.data.data.exams || []);
      } catch (examError) {
         console.error("Error fetching exams for dashboard:", examError);
         setErrorInfo(prev => ({
             message: `${prev?.message || ''} Failed to load exams.`.trim(),
             isIndexError: false,
             indexUrl: prev?.indexUrl
         }));
      }

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err.response?.data || err.message);
      const indexUrl = extractFirestoreIndexUrl(err.message);
      setErrorInfo({
        message: indexUrl ? 'Database setup required.' : `Failed to load dashboard data: ${err.message}. Please try again.`,
        isIndexError: !!indexUrl,
        indexUrl: indexUrl || undefined,
      });
    } finally {
      setLoading(false);
    }
  // Removed navigation dependency as it's not used directly for fetching
  }, []); // Removed navigation dependency

  useEffect(() => {
    // Log how DashboardScreen gets the IDs from context
    console.log('[DashboardScreen] Trying to determine active path from context.');
    console.log('[DashboardScreen] Context Values:', { activeProviderId, activePathId });

    if (activeProviderId && activePathId) {
      // --- Call fetchUserData with context values ---
      fetchUserData(activeProviderId, activePathId);
    } else {
      setErrorInfo({ message: 'Could not determine the active learning path from context.', isIndexError: false });
      setLoading(false);
    }
    // --- Update dependency array to use context values ---
  }, [activeProviderId, activePathId, fetchUserData]);


  // --- Helper to get details (No changes needed here, but ensure it uses fetched data correctly) ---
  const getResourceDetails = (resourceId: string, resourceType: 'module' | 'quiz' | 'exam') => {
    let item;
    let title = resourceId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    let imageIcon = imageMapRecord['default'];
    let color = '#3b82f6';
    // Provider/Path IDs for navigation will now come from context, not item data
    // let providerIdForNav: string | undefined;
    // let pathIdForNav: string | undefined;

    if (resourceType === 'module') {
      item = modules.find(m => m.id === resourceId);
      if (item) {
        title = item.title;
        imageIcon = imageMapRecord[resourceId] || imageMapRecord['default'];
        // providerIdForNav = item.providerId || undefined; // No longer needed from item
        // pathIdForNav = item.pathId || undefined;       // No longer needed from item
      }
    } else if (resourceType === 'quiz') {
      item = quizzes.find(q => q.id === resourceId);
       if (item) {
         title = item.title;
         // providerIdForNav = item.providerId || undefined; // No longer needed from item
         // pathIdForNav = item.pathId || undefined;       // No longer needed from item
         const moduleDetails = getResourceDetails(item.moduleId, 'module');
         imageIcon = moduleDetails.imageIcon;
         color = moduleDetails.color;
       }
    } else if (resourceType === 'exam') {
      item = exams.find(e => e.id === resourceId);
      if (item) {
        title = item.title;
        // providerIdForNav = item.providerId || undefined; // No longer needed from item
        // pathIdForNav = item.pathId || undefined;       // No longer needed from item
        imageIcon = examIcons[item.examId] || imageMapRecord['default'];
        color = examColors[item.examId] || '#3b82f6';
      }
    }

    // Return details without provider/path IDs for navigation
    return { imageIcon, color, title };
  };

  // --- Aggregate Completed Items (No changes needed) ---
  const allCompletedModuleIds = new Set<string>(
    learningPaths.flatMap(path => path.progress?.completedModules || [])
  );
  const allCompletedQuizIds = new Set<string>(
    learningPaths.flatMap(path => path.progress?.completedQuizzes || [])
  );
  const allCompletedExamIds = new Set<string>(
    learningPaths.flatMap(path => path.progress?.completedExams || [])
  );

  // --- Calculate Overall Progress Percentage (No changes needed) ---
  const totalAvailableModules = modules.length;
  const progressPercentage = totalAvailableModules > 0
    ? Math.round((overallProgress.totalModulesCompleted / totalAvailableModules) * 100)
    : 0;

  // --- Loading State (No changes needed) ---
  if (loading) {
    return (
      <View style={[dashboardStyles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Loading Dashboard...</Text>
      </View>
    );
  }

  // --- Error State ---
  if (errorInfo && (!errorInfo.isIndexError || (modules.length === 0 && exams.length === 0 && quizzes.length === 0))) {
    return (
      <SafeAreaView style={[dashboardStyles.container, { backgroundColor: colors.background }]}>
        <ScrollView style={dashboardStyles.scrollContainer}>
          <ErrorBanner error={errorInfo} onRetry={() => {
              // --- Refetch using context values ---
              if (activeProviderId && activePathId) {
                  fetchUserData(activeProviderId, activePathId);
              } else {
                  setErrorInfo({ message: 'Cannot retry: Learning path information is missing from context.', isIndexError: false });
              }
          }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Grid Items (Removed providerId/pathId props) ---
  const gridItems = [
    { icon: 'book-open', title: 'Learning Modules', description: 'Interactive concepts', color: '#3b82f6', screen: 'ModulesScreen' },
    { icon: 'award', title: 'Practice Exams', description: 'Prepare for certifications', color: '#a855f7', screen: 'ExamsScreen' },
    { icon: 'help-circle', title: 'Module Quizzes', description: 'Test your knowledge', color: '#f97316', screen: 'QuizzesScreen' },
    { icon: 'users', title: 'Community', description: 'Connect with learners', color: '#0ea5e9', screen: 'CommunityScreen' },
    { icon: 'bar-chart-2', title: 'Your Progress', description: 'Track your journey', color: '#22c55e', screen: 'DashboardScreen' }, // Stays on Dashboard
    { icon: 'settings', title: 'Settings', description: 'Customize your app', color: '#ef4444', screen: 'SettingsScreen' },
  ];
  // --- End Grid Items ---

  return (
    <SafeAreaView style={[dashboardStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={dashboardStyles.scrollContainer} contentContainerStyle={{ paddingBottom: 20 }}>
        {/* --- Banners (Updated retry logic) --- */}
        {errorInfo?.isIndexError && <WarningBanner onRetry={() => {
             if (activeProviderId && activePathId) {
                 fetchUserData(activeProviderId, activePathId);
             } else {
                 setErrorInfo({ message: 'Cannot retry: Learning path information is missing from context.', isIndexError: false });
             }
        }} />}

        {/* --- Grid --- */}
        <View style={dashboardStyles.gridWrapper}>
          <Text style={[dashboardStyles.gridTitle, { color: colors.text }]}>Explore</Text>
          <View style={dashboardStyles.gridContainer}>
            {gridItems.map((item, index) => (
              <GridItem
                providerId={''} 
                pathId={''} 
                key={item.title}
                {...item}
                index={index}
                navigation={navigation}                // Removed providerId and pathId props
              />
            ))}
          </View>
        </View>

        {/* --- Progress Card --- */}
        <Animated.View entering={FadeIn.duration(1200)} style={[dashboardStyles.card, cardStyle, { backgroundColor: colors.surface }]}>
          <Text style={[dashboardStyles.cardTitle, { color: colors.text }]}>Learning Progress</Text>

          {/* Overall Progress Bar (No changes needed) */}
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
              // Get details without provider/path for nav
              const { imageIcon, color, title } = getResourceDetails(module.id, 'module');
              const isCompleted = allCompletedModuleIds.has(module.id);
              const status = isCompleted ? 'Completed' : 'Not Started';
              return (
                <ProgressItem
                  key={module.id}
                  title={title}
                  status={status}
                  color={color}
                  imageIcon={imageIcon}
                  // --- Pass context provider/path IDs to ModuleDetail ---
                  onPress={() => navigation.navigate('ModuleDetail', {
                      moduleId: module.id,
                  })}
                />
              );
            })
          ) : (
            <Text style={[dashboardStyles.noDataText, { color: colors.textSecondary }]}>No modules available for this path.</Text>
          )}

          {/* Quizzes List */}
          <Text style={[dashboardStyles.sectionTitle, { color: colors.text }]}>Quizzes</Text>
          {quizzes.length > 0 ? (
            quizzes.map(quiz => {
              const moduleDetails = getResourceDetails(quiz.moduleId, 'module');
              // Get details without provider/path for nav
              // const { providerIdForNav, pathIdForNav } = getResourceDetails(quiz.id, 'quiz'); // No longer needed
              const isCompleted = allCompletedQuizIds.has(quiz.id);
              const status = isCompleted ? 'Completed' : 'Not Started';
              const latestResult = quizResults.find(qr => qr.quizId === quiz.id);

              return (
                <ProgressItem
                  key={quiz.id}
                  title={quiz.title}
                  subtitle={`Part of: ${moduleDetails.title}`}
                  status={status}
                  color={moduleDetails.color}
                  imageIcon={moduleDetails.imageIcon}
                  // --- Pass context provider/path IDs to QuizzesDetail ---
                  onPress={() => navigation.navigate('QuizzesDetail', {
                      moduleId: quiz.moduleId,
                      providerId: activeProviderId || '', // Use context value
                      pathId: activePathId || '',       // Use context value
                      quizId: quiz.id
                  })}
                />
              );
            })
          ) : (
            <Text style={[dashboardStyles.noDataText, { color: colors.textSecondary }]}>No quizzes available for this path.</Text>
          )}

          {/* Exams List */}
          <Text style={[dashboardStyles.sectionTitle, { color: colors.text }]}>Exams</Text>
          {exams.length > 0 ? (
            exams.map(exam => {
              // Get details without provider/path for nav
              const { imageIcon, color, title } = getResourceDetails(exam.id, 'exam');
              const isCompleted = allCompletedExamIds.has(exam.id);
              const status = isCompleted ? 'Completed' : 'Not Started';
              const latestResult = examResults.find(er => er.examId === exam.id);

              return (
                <ProgressItem
                  key={exam.id}
                  title={title}
                  status={status}
                  color={color}
                  imageIcon={imageIcon}
                  // --- Pass context provider/path IDs to ExamDetail ---
                  onPress={() => navigation.navigate('ExamDetail', {
                      examId: exam.examId,
                      title: exam.title,
                      providerId: activeProviderId || '', // Use context value
                      pathId: activePathId || '',       // Use context value
                  })}
                />
              );
            })
          ) : (
            <Text style={[dashboardStyles.noDataText, { color: colors.textSecondary }]}>No exams available for this path.</Text>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};


export default DashboardScreen;
