import React, { FC, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
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
import QuizModule from '../components/dashboard/QuizModule';
import ErrorBanner from '../components/dashboard/ErrorBanner';
import WarningBanner from '../components/dashboard/WarningBanner';
import { LearningProgress, Module, Quiz, QuizResult, Exam, ExamResult, ErrorInfo, ProgressEntry } from '../types/dashboard';
import { formatDate } from '../utils/formatDate';
import { extractFirestoreIndexUrl } from '../utils/firestore';

const BASE_URL = REACT_APP_BASE_URL;

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
};

const examColors: Record<string, string> = {
  'cloud-digital-leader-exam': '#4285F4',
};

interface DashboardScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DashboardScreen'>;
}

const DashboardScreen: FC<DashboardScreenProps> = ({ navigation }) => {
  const { isDarkMode } = useCustomTheme();
  const { colors, cardStyle } = useCustomTheme().theme;
  const [loading, setLoading] = useState<boolean>(true);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const groupQuizzesByModule = (): Record<string, QuizResult[]> => {
    const grouped: Record<string, QuizResult[]> = {};
    quizResults.forEach(quiz => {
      if (!grouped[quiz.moduleId]) grouped[quiz.moduleId] = [];
      grouped[quiz.moduleId].push(quiz);
    });
    Object.keys(grouped).forEach(moduleId => {
      grouped[moduleId].sort((a, b) => {
        if (!a.timestamp && !b.timestamp) return 0;
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    });
    return grouped;
  };

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) return;
      const response = await axios.get(`${BASE_URL}/api/v1/users/${storedUserId}/progress`);
      setLearningProgress(response.data.learningProgress || null);
      setProgress(response.data.detailedProgress || []);
      setModules(response.data.availableModules || []);
      setExams(response.data.exams || []);
      setQuizzes(response.data.availableQuizzes || []);
      setQuizResults(response.data.quizResults || []);
      setExamResults(response.data.examResults || []);
      setErrorInfo(null);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err.response?.data || err.message);
      const errorMessage = err.response?.data?.error || '';
      if (errorMessage.includes('FAILED_PRECONDITION') && errorMessage.includes('index')) {
        setErrorInfo({
          message: 'The database query requires an index which needs to be created.',
          isIndexError: true,
          indexUrl: extractFirestoreIndexUrl(errorMessage),
        });
        if (err.response?.data?.modules) setModules(err.response.data.modules);
        if (err.response?.data?.exams) setExams(err.response.data.exams);
        if (err.response?.data?.quizzes) setQuizzes(err.response.data.quizzes);
      } else {
        setErrorInfo({
          message: errorMessage || 'Failed to load dashboard data. Please try again.',
          isIndexError: false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const getModuleDetails = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    const title = module?.title || moduleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const imageIcon = iconMap[moduleId] || iconMap['default'];
    const color = '#3b82f6';
    return { imageIcon, color, title };
  };

  const totalModules = modules.length;
  const completedModuleIds = [
    ...new Set([
      ...(Array.isArray(learningProgress?.completedModules) ? learningProgress.completedModules : []),
      ...progress.filter(p => p.status === 'completed').map(entry => entry.moduleId),
    ]),
  ];
  const progressPercentage = totalModules > 0 ? Math.round((completedModuleIds.length / totalModules) * 100) : 0;

  const quizzesByModule = groupQuizzesByModule();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (errorInfo && (!errorInfo.isIndexError || (modules.length === 0 && exams.length === 0 && quizzes.length === 0))) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.scrollContainer}>
          <ErrorBanner error={errorInfo} onRetry={fetchUserData} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const gridItems = [
    {
      icon: 'book-open',
      title: 'Learning Modules',
      description: 'Interactive GCP concepts with AI-powered content',
      color: '#3b82f6',
      screen: 'Modules',
    },
    {
      icon: 'activity',
      title: 'Progress Tracking',
      description: 'Real-time progress monitoring across modules',
      color: '#22c55e',
      screen: 'Dashboard',
    },
    {
      icon: 'award',
      title: 'Certifications',
      description: 'Comprehensive exam preparation paths',
      color: '#a855f7',
      screen: 'Exams',
    },
    {
      icon: 'bell',
      title: 'Smart Notifications',
      description: 'AI-driven learning reminders and updates',
      color: '#f97316',
      screen: 'Dashboard',
    },
    {
      icon: 'users',
      title: 'Community',
      description: 'Connect with other cloud learners',
      color: '#0ea5e9',
      screen: 'Community',
    },
    {
      icon: 'settings',
      title: 'Settings',
      description: 'Customize your learning experience and preferences',
      color: '#ef4444',
      screen: 'Settings',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollContainer}>
        {errorInfo?.isIndexError && <WarningBanner onRetry={fetchUserData} />}
        <View style={styles.gridWrapper}>
          <Text style={[styles.gridTitle, { color: colors.text }]}>Features</Text>
          <View style={styles.gridContainer}>
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
        <Animated.View entering={FadeIn.duration(1200)} style={[styles.card, cardStyle, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Learning Progress</Text>
          <View style={styles.progressSection}>
            <View style={styles.progressLabelContainer}>
              <Text style={[styles.progressLabel, { color: colors.text }]}>Overall Progress</Text>
              <Text style={[styles.progressPercentage, { color: colors.primary }]}>{progressPercentage}%</Text>
            </View>
            <View style={[styles.progressBarContainer, { backgroundColor: colors.progressBarBackground }]}>
              <View style={[styles.progressBar, { width: `${progressPercentage}%`, backgroundColor: colors.primary }]} />
            </View>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Modules</Text>
          {modules.length > 0 ? (
            modules.map(module => {
              const { imageIcon, color, title } = getModuleDetails(module.id);
              const isCompleted = completedModuleIds.includes(module.id);
              const isInProgress = progress.some(p => p.moduleId === module.id && p.status === 'in_progress');
              const status = isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Not Started';
              return (
                <ProgressItem
                  key={module.id}
                  title={title}
                  status={status}
                  color={color}
                  imageIcon={imageIcon}
                />
              );
            })
          ) : (
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>No modules available.</Text>
          )}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quizzes</Text>
          {Object.keys(quizzesByModule).length > 0 ? (
            Object.keys(quizzesByModule).map(moduleId => {
              const { title, color, imageIcon } = getModuleDetails(moduleId);
              return (
                <QuizModule
                  key={moduleId}
                  moduleId={moduleId}
                  title={title}
                  quizzes={quizzesByModule[moduleId]}
                  isExpanded={expandedModules[moduleId] || false}
                  color={color}
                  imageIcon={imageIcon}
                  onToggle={toggleModuleExpanded}
                />
              );
            })
          ) : quizzes.length > 0 ? (
            quizzes.map(quiz => {
              const { imageIcon, color } = getModuleDetails(quiz.moduleId);
              const status = learningProgress?.completedQuizzes?.includes(quiz.id) ? 'Completed' : 'Not Started';
              return (
                <ProgressItem
                  key={quiz.id}
                  title={quiz.title}
                  status={status}
                  color={color}
                  imageIcon={imageIcon}
                />
              );
            })
          ) : (
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>No quizzes available.</Text>
          )}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Exams</Text>
          {exams.length > 0 ? (
            exams.map(exam => {
              const examImage = examIcons[exam.id];
              const examColor = examColors[exam.id] || '#3b82f6';
              const examResult = examResults.find(er => er.examId === exam.id);
              const status = learningProgress?.completedExams?.includes(exam.id) ? 'Completed' : 'Not Started';
              return (
                <ProgressItem
                  key={exam.id}
                  title={exam.title}
                  status={status}
                  percentage={examResult?.percentage}
                  color={examColor}
                  imageIcon={examImage}
                />
              );
            })
          ) : (
            <Text style={[styles.noDataText, { color: colors.textSecondary }]}>No exams available.</Text>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridWrapper: {
    marginBottom: 20,
  },
  gridTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
});

export default DashboardScreen;