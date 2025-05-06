// c:\Users\thabi\Desktop\CloudExplorer\src\screens\DashboardScreen.tsx
import React, { FC, useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { REACT_APP_BASE_URL } from '@env';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import { useActiveLearningPath } from '../context/ActiveLearningPathContext';
import GridItem from '../components/dashboard/GridItem';
import QuizModule from '../components/dashboard/QuizModule'; // Import the new component
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

const examColors: Record<string, string> = {
  'cloud-digital-leader-exam': '#4285F4',
};

interface DashboardScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainApp'>;
}

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
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({}); // State for expanded modules

  // --- Get active path from context ---
  const { activeProviderId, activePathId } = useActiveLearningPath();

  // --- Fetch User Data (Updated) ---
  const fetchUserData = useCallback(async (currentProviderId: string, currentPathId: string) => {
    setLoading(true);
    // Reset states before fetching
    setErrorInfo(null);
    setOverallProgress(defaultOverallProgress);
    setLearningPaths([]);
    setModules([]);
    setQuizzes([]);
    setExams([]);
    setQuizResults([]); // Also reset results
    setExamResults([]); // Also reset results

    // Variables to hold fetched data before setting state
    let fetchedProgress: OverallProgress = defaultOverallProgress;
    let fetchedLearningPaths: LearningPath[] = [];
    let fetchedQuizResults: QuizResult[] = []; // For dedicated fetch
    let fetchedExamResults: ExamResult[] = []; // Keep from progress for now
    let fetchedModules: ApiModule[] = [];
    let fetchedQuizzes: ApiQuiz[] = [];
    let fetchedExams: ApiExam[] = [];
    let fetchError: ErrorInfo | null = null;

    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        console.error("[DashboardScreen] User ID not found, cannot fetch data.");
        setErrorInfo({ message: 'User session not found. Please log in again.', isIndexError: false });
        setLoading(false);
        return;
      }

      console.log(`[DashboardScreen] Fetching data for user: ${storedUserId}, path: ${currentProviderId}/${currentPathId}`);

      // Define response types inline for clarity
      interface ListModulesResponse { status: string; data: { modules: ApiModule[]; hasMore: boolean; lastId: string | null; } }
      interface ListQuizzesResponse { status: string; data: { quizzes: ApiQuiz[]; hasMore: boolean; lastId: string | null; } }
      interface ListExamsResponse { status: string; data: { exams: ApiExam[]; hasMore: boolean; lastId: string | null; } }
      // --- Corrected QuizHistoryResponse to match actual API structure ---
      interface QuizHistoryResponse {
        status: string;
        data: { quizHistory: QuizResult[] }; // Data contains a quizHistory array
      }

     // --- Add ExamHistoryResponse type ---
      interface ExamHistoryResponse {
      status: string;
       data: { examHistory: ExamResult[] }; // Data contains an examHistory array
     }

      // Use Promise.allSettled to fetch concurrently and handle partial failures
      const results = await Promise.allSettled([
        // Call 1: Progress (still useful for overall stats and learning paths)
        axios.get(`${BASE_URL}/api/v1/users/${storedUserId}/progress`),
        // Call 2: Modules
        axios.get<ListModulesResponse>(`${BASE_URL}/api/v1/modules/list`, {
          params: { providerId: currentProviderId, pathId: currentPathId, limit: 50 } // Increased limit?
        }),
        // Call 3: Quizzes (definitions)
        axios.get<ListQuizzesResponse>(`${BASE_URL}/api/v1/quizzes/list-quizzes`, {
          params: { providerId: currentProviderId, pathId: currentPathId, limit: 50 } // Increased limit?
        }),
        // Call 4: Exams (definitions)
        axios.get<ListExamsResponse>(`${BASE_URL}/api/v1/exams/list-exams`, {
          params: { providerId: currentProviderId, pathId: currentPathId, limit: 50 } // Increased limit?
        }),
        // Call 5: Quiz Results History (dedicated endpoint)
        axios.get<QuizHistoryResponse>(`${BASE_URL}/api/v1/quizzes/history/${storedUserId}`),
      // --- Call 6: Exam Results History ---
      axios.get<ExamHistoryResponse>(`${BASE_URL}/api/v1/exams/user/${storedUserId}/exam-history`),
      ]);

      // Process Progress results (Call 1)
      if (results[0].status === 'fulfilled') {
        const progressResponse = results[0].value;
        console.log("[DashboardScreen] Progress Data Received:", progressResponse.data);
        if (progressResponse.data.status === 'success') {
          fetchedProgress = progressResponse.data.data.overallProgress || defaultOverallProgress;
          fetchedLearningPaths = progressResponse.data.data.learningPaths || [];
          // Exam results are now fetched separately
          fetchedExamResults = progressResponse.data.data.examResults || [];          // We still fetch exam results from here for now, unless you add a dedicated exam history endpoint
        } else {
          console.error("Error in progress response status:", progressResponse.data);
          fetchError = { message: 'Failed to load progress data.', isIndexError: false };
        }
      } else {
        console.error("Error fetching progress:", results[0].reason);
        fetchError = { message: 'Failed to load progress.', isIndexError: false };
      }

      // Process Modules results (Call 2)
      if (results[1].status === 'fulfilled') {
        const modulesResponse = results[1].value;
        console.log("[DashboardScreen] Modules Data Received:", modulesResponse.data);
        if (modulesResponse.data.status === 'success') {
          fetchedModules = modulesResponse.data.data.modules || [];
        } else {
          console.error("Error in modules response status:", modulesResponse.data);
          fetchError = { ...fetchError, message: `${fetchError?.message || ''} Failed to load quizzes.`.trim(), isIndexError: fetchError?.isIndexError || false }; // Ensure isIndexError is boolean
        }
      } else {
        console.error("Error fetching modules:", results[1].reason);
        fetchError = { ...fetchError, message: `${fetchError?.message || ''} Failed to load quizzes.`.trim(), isIndexError: fetchError?.isIndexError || false }; // Ensure isIndexError is boolean
      }

      // Process Quizzes results (Call 3 - Definitions)
      if (results[2].status === 'fulfilled') {
        const quizzesResponse = results[2].value;
        console.log("[DashboardScreen] Quizzes Data Received:", quizzesResponse.data);
        if (quizzesResponse.data.status === 'success') {
          fetchedQuizzes = quizzesResponse.data.data.quizzes || [];
        } else {
          console.error("Error in quizzes response status:", quizzesResponse.data);
          fetchError = { ...fetchError, message: `${fetchError?.message || ''} Failed to load exams.`.trim(), isIndexError: fetchError?.isIndexError || false }; // Ensure isIndexError is boolean
        }
      } else {
        console.error("Error fetching quizzes:", results[2].reason);
        fetchError = { ...fetchError, message: `${fetchError?.message || ''} Failed to load exams.`.trim(), isIndexError: fetchError?.isIndexError || false }; // Ensure isIndexError is boolean
      }

      // Process Exams results (Call 4 - Definitions)
      if (results[3].status === 'fulfilled') {
        const examsResponse = results[3].value;
        console.log("[DashboardScreen] Exams Data Received:", examsResponse.data);
        if (examsResponse.data.status === 'success') {
          fetchedExams = examsResponse.data.data.exams || [];
        } else {
          console.error("Error in exams response status:", examsResponse.data);
          fetchError = { ...fetchError, message: `${fetchError?.message || ''} Failed to load exams.`.trim(), isIndexError: fetchError?.isIndexError || false }; // Ensure isIndexError is boolean
        }
      } else {
        console.error("Error fetching exams:", results[3].reason);
        fetchError = { ...fetchError, message: `${fetchError?.message || ''} Failed to load quiz results.`.trim(), isIndexError: fetchError?.isIndexError || false }; // Ensure isIndexError is boolean
      }

      // Process Quiz Results History (Call 5)
      if (results[4].status === 'fulfilled') {
        const quizHistoryResponse = results[4].value;
        console.log("[DashboardScreen] Quiz History Data Received:", quizHistoryResponse.data);
        if (quizHistoryResponse.data.status === 'success') {
          // Correctly access the nested quizHistory array
          fetchedQuizResults = quizHistoryResponse.data.data.quizHistory || []; // Access data.quizHistory
          // --- ADD LOG: Show the actual fetched quiz results ---
          console.log("[DashboardScreen] Fetched Quiz Results Array:", JSON.stringify(fetchedQuizResults, null, 2));
        } else {
          console.error("Error in quiz history response status:", quizHistoryResponse.data);
          fetchError = { ...fetchError, message: `${fetchError?.message || ''} Failed to load quiz results.`.trim(), isIndexError: fetchError?.isIndexError || false }; // Ensure isIndexError is boolean
        }
      } else {
        console.error("Error fetching quiz history:", results[4].reason);
        fetchError = { ...fetchError, message: `${fetchError?.message || ''} Failed to load quiz results.`.trim(), isIndexError: fetchError?.isIndexError || false }; // Ensure isIndexError is boolean
      }

      // Process Exam Results History (Call 6)
      if (results[5].status === 'fulfilled') {
        const examHistoryResponse = results[5].value;
        console.log("[DashboardScreen] Exam History Data Received:", examHistoryResponse.data);
        if (examHistoryResponse.data.status === 'success') {
          fetchedExamResults = examHistoryResponse.data.data?.examHistory || []; // Get results from dedicated endpoint
          console.log("[DashboardScreen] Fetched Exam Results Array:", JSON.stringify(fetchedExamResults, null, 2));
        } else {
          console.error("Error in exam history response status:", examHistoryResponse.data);
          fetchError = { ...fetchError, message: `${fetchError?.message || ''} Failed to load exam results.`.trim(), isIndexError: fetchError?.isIndexError || false };
        }
      } else {
        console.error("Error fetching exam history:", results[5].reason);
        fetchError = { ...fetchError, message: `${fetchError?.message || ''} Failed to load exam results.`.trim(), isIndexError: fetchError?.isIndexError || false };
      }


      // Check if any fetch failed and set a general error message if needed
      if (fetchError && !fetchError.message) {
         fetchError.message = 'An unknown error occurred while fetching data.';
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
      // --- Batch state updates ---
      setOverallProgress(fetchedProgress);
      setLearningPaths(fetchedLearningPaths);
      setQuizResults(fetchedQuizResults); // Set results from dedicated fetch
      setExamResults(fetchedExamResults);
      setModules(fetchedModules);
      setQuizzes(fetchedQuizzes);
      setExams(fetchedExams);
      setErrorInfo(fetchError); // Set error state based on accumulated errors
      setLoading(false);
      console.log('[DashboardScreen] Fetching complete. Final state updates applied.');
    }
  }, []);
  // Removed navigation dependency as it's not used directly for fetching

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

    if (resourceType === 'module') {
      item = modules.find(m => m.id === resourceId);
      if (item) {
        title = item.title;
        imageIcon = imageMapRecord[resourceId] || imageMapRecord['default'];
      }
    } else if (resourceType === 'quiz') {
      item = quizzes.find(q => q.id === resourceId);
       if (item) {
         title = item.title;
         const moduleDetails = getResourceDetails(item.moduleId, 'module');
         imageIcon = moduleDetails.imageIcon;
         color = moduleDetails.color;
       }
    } else if (resourceType === 'exam') {
      item = exams.find(e => e.id === resourceId);
      if (item) {
        // Corrected log to show the actual key being used for lookup
        console.log(`[getResourceDetails] Processing exam: ID=${item.id}, Title=${item.title}. Attempting image lookup with key: '${item.id}'`);
        title = item.title;
        imageIcon = imageMapRecord[item.id] || imageMapRecord['default']; // Try using item.id as the key
        color = examColors[item.id] || '#3b82f6'; // Also update color lookup if it uses the same key
        console.log(`[getResourceDetails] Specific image found for key '${item.id}':`, imageIcon !== imageMapRecord['default']); // Log if specific image (not default) was found using item.id
      } else {
        console.log(`[getResourceDetails] Exam item not found for resourceId: ${resourceId}`);
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

  // --- Group Quiz Results by Module ID ---
  const quizzesByModule = useMemo(() => {
    return quizResults.reduce((acc, quiz) => {
      const moduleId = quiz.moduleId;
      if (!acc[moduleId]) {
        acc[moduleId] = [];
      }
      acc[moduleId].push(quiz);
      // Optional: Sort quizzes within each module by timestamp descending
      acc[moduleId].sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        return 0;
      });
      return acc;
    }, {} as Record<string, QuizResult[]>);
  }, [quizResults]);

    // --- Group Exam Results by Exam ID ---
    const examsById = useMemo(() => {
      console.log("[DashboardScreen] useMemo calculating examsById. Input examResults:", JSON.stringify(examResults, null, 2));
      return examResults.reduce((acc, exam) => {
        const examId = exam.examId; // Group by the exam definition ID
        if (!acc[examId]) acc[examId] = [];
        acc[examId].push(exam);
        acc[examId].sort((a, b) => {
          if (a.timestamp && b.timestamp) {
            return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          }
          return 0;
        }); // Sort attempts by date desc
        return acc;
      }, {} as Record<string, ExamResult[]>);
    }, [examResults]);
  // --- ADD LOG: Show the result of grouping ---
  console.log("[DashboardScreen] Quizzes grouped by module:", JSON.stringify(quizzesByModule, null, 2));

  const toggleModuleExpansion = useCallback((moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  }, []);
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
              const { imageIcon, color, title } = getResourceDetails(module.id, 'module');
              const moduleQuizzes = quizzesByModule[module.id] || [];
              const isExpanded = expandedModules[module.id] || false;
              // --- ADD LOG: Show what's being passed to QuizModule ---
              console.log(`[DashboardScreen] For Module "${title}" (ID: ${module.id}), passing ${moduleQuizzes.length} quizzes to QuizModule.`);

              return (
                /*
                <ProgressItem
                  key={module.id}
                  title={title}
                  status={status}
                  color={color}
                  imageIcon={imageIcon}
                  onPress={() => navigation.navigate('ModuleDetail', {
                      moduleId: module.id,
                  })}
                />
                */
                // --- Use the new QuizModule component ---
                <QuizModule
                  key={module.id}
                  moduleId={module.id}
                  title={title}
                  quizzes={moduleQuizzes}
                  isExpanded={isExpanded}
                  color={color}
                  imageIcon={imageIcon}
                  onToggle={toggleModuleExpansion}
                />
              );
            })
          ) : (
            <Text style={[dashboardStyles.noDataText, { color: colors.textSecondary }]}>No modules available for this path.</Text>
          )}
          <Text style={[dashboardStyles.sectionTitle, { color: colors.text }]}>Quizzes</Text>
          {quizzes.length > 0 ? (
            quizzes.map(quiz => {
              const moduleDetails = getResourceDetails(quiz.moduleId, 'module');
              const isCompleted = allCompletedQuizIds.has(quiz.id);
              const status = isCompleted ? 'Completed' : 'Not Started';
              const latestResult = quizResults.find(qr => qr.quizId === quiz.id);
              // Hide quizzes list if they are shown inside modules
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
            // --- Add this log ---
            console.log('[DashboardScreen] Rendering Exams List. Exams state:', exams),
            exams.map(exam => {
              // Get details without provider/path for nav
              const { imageIcon, color, title } = getResourceDetails(exam.id, 'exam');
              const examAttempts = examsById[exam.id] || []; // Get attempts for this exam
              const latestResult = examAttempts[0]; // Latest attempt is the first after sorting
              const isCompleted = allCompletedExamIds.has(exam.id);
              const status = isCompleted ? 'Completed' : 'Not Started';

              return (
                <ProgressItem
                  key={exam.id}
                  title={title}
                  status={latestResult ? `Latest: ${latestResult.percentage}% (${latestResult.percentage ? 'Passed' : 'Failed'})` : status} // Show latest result status
                  color={color}
                  imageIcon={imageIcon}
                  percentage={latestResult ? Math.round((latestResult.score / exam.totalScore) * 100) : undefined}
                  onPress={() => navigation.navigate('ExamDetail', {
                      examId: exam.id,
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