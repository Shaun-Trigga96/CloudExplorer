/* eslint-disable no-trailing-spaces */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Linking, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import ComputeEngineIcon from '../assets/icons/compute_engine.svg';
import CloudStorageIcon from '../assets/icons/cloud_storage.svg';
import CloudFunctionsIcon from '../assets/icons/cloud_functions.svg';
import KubernetesEngineIcon from '../assets/icons/google_kubernetes_engine.svg';

const BASE_URL = 'http://10.0.2.2:5000';

interface LearningProgress {
  completedModules: string[];
  completedQuizzes: string[];
  completedExams: string[];
  modulesInProgress: string[];
  score: number | null;
}

interface ProgressEntry {
  moduleId: string;
  quizId: string;
  examId: string;
  score: number;
  totalQuestions: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface Module {
  id: string;
  title: string;
}


interface QuizResult {
  id: string;
  moduleId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timestamp: string | null;
}

interface ExamResult {
  id: string;
  examId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timestamp: string | null;
}

interface Exam {
  id: string;
  title: string;
}

interface ProgressItemProps {
  title: string;
  status: string;
  percentage?: number;
  color: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

interface ErrorInfo {
  message: string;
  isIndexError: boolean;
  indexUrl?: string;
}

// GridLayout component moved to the top
const GridLayout: FC = () => {
  const gridItems = [
    { icon: 'book-open', title: 'Learning Modules', description: 'Interactive GCP concepts with AI-powered content', color: '#3b82f6' },
    { icon: 'activity', title: 'Progress Tracking', description: 'Real-time progress monitoring across modules', color: '#22c55e' },
    { icon: 'award', title: 'Certifications', description: 'Comprehensive exam preparation paths', color: '#a855f7' },
    { icon: 'bell', title: 'Smart Notifications', description: 'AI-driven learning reminders and updates', color: '#f97316' },
    { icon: 'settings', title: 'Settings', description: 'Customize your learning experience and preferences', color: '#ef4444' },
    { icon: 'users', title: 'Community', description: 'Connect with other cloud learners', color: '#0ea5e9' },
  ];

  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - 48) / 2;

  return (
    <View style={styles.gridWrapper}>
      <Text style={styles.gridTitle}>Features</Text>
      <View style={styles.gridContainer}>
        {gridItems.map((item) => (
          <Animated.View
            key={item.title}
            entering={FadeIn.duration(800).delay(gridItems.indexOf(item) * 100)}
            style={[styles.gridItem, { width: itemWidth }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
              <Icon name={item.icon} size={24} color="#ffffff" />
            </View>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

// Implement the ProgressItem component
const ProgressItem: FC<ProgressItemProps> = ({ title, status, percentage, color, icon: IconComponent }) => (
  <View style={styles.progressItem}>
    <View style={styles.progressItemHeader}>
      <View style={[styles.progressIconCircle, { backgroundColor: color }]}>
        <IconComponent width={20} height={20} />
      </View>
      <View style={styles.progressTextContainer}>
        <Text style={styles.progressTitle}>{title}</Text>
        <Text style={styles.progressStatus}>{status}</Text>
      </View>
      {percentage !== undefined && (
        <Text style={styles.progressPercentage}>{percentage}%</Text>
      )}
    </View>
    {percentage !== undefined && (
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
    )}
  </View>
);

const DashboardScreen: FC<{ navigation: any }> = ({ }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [examResults] = useState<ExamResult[]>([]);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  // Helper function to extract Firestore index URL from error message
  const extractFirestoreIndexUrl = (errorMessage: string): string | undefined => {
    if (!errorMessage) {return undefined;}

    const urlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com\/[^\s"]+)/);
    return urlMatch ? urlMatch[1] : undefined;
  };

  // Handle opening URL for creating index
  const handleOpenIndexUrl = () => {
    if (errorInfo?.indexUrl) {
      Linking.openURL(errorInfo.indexUrl).catch(err => {
        console.error('Failed to open URL:', err);
      });
    }
  };

    const fetchUserData = async () => {
      try {
        let storedUserId = await AsyncStorage.getItem('userId');
        console.log('Stored User ID (original):', storedUserId);
        if (!storedUserId) {
          return;
        }

        const response = await axios.get(`${BASE_URL}/user/${storedUserId}/progress`);
        console.log('Full Progress Response:', JSON.stringify(response.data, null, 2));

        setLearningProgress(response.data.learningProgress || null);
        setProgress(response.data.progress || []);
        setModules(response.data.modules || []);
        setExams(response.data.exams || []);
        setQuizResults(response.data.quizResults || []);
        //setExamResults(response.data.examResults || []);
        setErrorInfo(null);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err.response?.data || err.message);

        const errorMessage = err.response?.data?.error || '';
        if (errorMessage.includes('FAILED_PRECONDITION') && errorMessage.includes('index')) {
          // This is a Firestore index error
          const indexUrl = extractFirestoreIndexUrl(errorMessage);
          setErrorInfo({
            message: 'The database query requires an index which needs to be created.',
            isIndexError: true,
            indexUrl,
          });

          // Try to load partial data that doesn't rely on the indexed queries
          if (err.response?.data?.modules) {
            setModules(err.response.data.modules);
          }
          if (err.response?.data?.exams) {
            setExams(err.response.data.exams);
          }
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
  });

  const retryFetch = () => {
    setLoading(true);
    setErrorInfo(null);
   fetchUserData();
  };

  // Calculate overall progress
  const totalModules = modules.length;
  const completedModuleIds = [
    ...new Set([
      ...(Array.isArray(learningProgress?.completedModules) ? learningProgress.completedModules : []),
      ...progress.map((entry) => entry.moduleId),
    ]),
  ];

  const progressPercentage = totalModules > 0 ? Math.round((completedModuleIds.length / totalModules) * 100) : 0;

  // Map module IDs to icons, colors, and titles
  const getModuleDetails = (moduleId: string) => {
    const moduleMap: { [key: string]: { icon: React.FC<React.SVGProps<SVGSVGElement>>; color: string; title: string } } = {
      'compute-engine': { icon: ComputeEngineIcon as React.FC<React.SVGProps<SVGSVGElement>>, color: '#0000', title: 'Compute Engine' },
      'cloud-storage': { icon: CloudStorageIcon as React.FC<React.SVGProps<SVGSVGElement>>, color: '#0000', title: 'Cloud Storage' },
      'cloud-functions': { icon: CloudFunctionsIcon as React.FC<React.SVGProps<SVGSVGElement>>, color: '#0000', title: 'Cloud Functions' },
      'kubernetes-engine': { icon: KubernetesEngineIcon as React.FC<React.SVGProps<SVGSVGElement>>, color: '#0000', title: 'Kubernetes Engine' },
    };

    const module = modules.find((m) => m.id === moduleId);
    const mapped = moduleMap[moduleId] || {
      icon: ComputeEngineIcon as React.FC<React.SVGProps<SVGSVGElement>>,
      color: '#3b82f6',
      title: module?.title || moduleId,
    };
    return { ...mapped, title: module?.title || mapped.title };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }


  // Render error state for non-index errors or critical errors
  if (errorInfo && (!errorInfo.isIndexError || (modules.length === 0 && exams.length === 0))) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>
          <Animated.View entering={FadeIn.duration(800)} style={styles.errorCard}>
            <Icon name="alert-circle" size={40} color="#ef4444" style={styles.errorIcon} />
            <Text style={styles.error}>{errorInfo.message}</Text>

            {errorInfo.isIndexError && errorInfo.indexUrl && (
              <>
                <Text style={styles.errorHelp}>
                  This is a database configuration issue. An administrator needs to create an index.
                </Text>
                <TouchableOpacity
                  style={styles.indexButton}
                  onPress={handleOpenIndexUrl}
                >
                  <Text style={styles.indexButtonText}>Open Firebase Console</Text>
                </TouchableOpacity>
              </>
            )}

            <Button
              mode="contained"
              onPress={retryFetch}
              style={styles.retryButton}
              icon="refresh"
            >
              Retry
            </Button>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Show warning banner for index errors when we have partial data */}
        {errorInfo?.isIndexError && (
          <Animated.View entering={FadeIn.duration(800)} style={styles.warningBanner}>
            <Icon name="alert-triangle" size={18} color="#fff" style={{marginRight: 8}} />
            <Text style={styles.warningText}>
              Some data couldn't be loaded.
            </Text>
            <TouchableOpacity
              onPress={retryFetch}
              style={styles.refreshButton}
            >
              <Text style={styles.refreshButtonText}>Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* GridLayout placed at the top */}
        <GridLayout />

        <Animated.View entering={FadeIn.duration(1200)} style={styles.card}>
          <Text style={styles.cardTitle}>Learning Progress</Text>

          {/* Overall Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelContainer}>
              <Text style={styles.progressLabel}>Overall Progress</Text>
              <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${progressPercentage}%`, backgroundColor: '#3b82f6' },
                ]}
              />
            </View>
          </View>

          {/* Modules Section */}

          <Text style={styles.sectionTitle}>Modules</Text>
          {modules.length > 0 ? (
            modules.map((module) => {
              const { icon, color } = getModuleDetails(module.id);
              const status = Array.isArray(learningProgress?.completedModules) &&
              learningProgress.completedModules.includes(module.id)              ? 'Completed'
              : progress.some((p) => p.moduleId === module.id && p.status === 'in_progress')
                ? 'In Progress'
                : 'Not Started';
              return (
                <ProgressItem
                  key={module.id}
                  title={module.title}
                  status={status}
                  color={color}
                  icon={icon}
                />
              );
            })
          ) : (
            <Text style={styles.noDataText}>No modules available.</Text>
          )}

          {/* Quizzes Section - Only show if we have quizResults */}
          {quizResults.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Quizzes</Text>
              {quizResults.map((quiz) => {
                const module = modules.find((m) => m.id === quiz.moduleId);
                const { icon, color } = getModuleDetails(quiz.moduleId);
                return (
                  <ProgressItem
                    key={quiz.id}
                    title={`Quiz for ${module?.title || 'Unknown Module'}`}
                    status="Completed"
                    percentage={quiz.percentage}
                    color={color}
                    icon={icon}
                  />
                );
              })}
            </>
          )}

          {/* Exams Section */}
          <Text style={styles.sectionTitle}>Exams</Text>
          {exams.length > 0 ? (
            exams.map((exam) => {
              const { icon, color } = getModuleDetails(exam.id);
              const examResult = examResults.find((er) => er.examId === exam.id);
              const status = learningProgress?.completedExams?.includes(exam.id)
                ? 'Completed'
                : 'Not Started';
              return (
                <ProgressItem
                  key={exam.id}
                  title={exam.title}
                  status={status}
                  percentage={examResult?.percentage}
                  color={color}
                  icon={icon}
                />
              );
            })
          ) : (
            <Text style={styles.noDataText}>No exams available.</Text>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#202124' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  errorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 24,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
  },
  errorIcon: {
    marginBottom: 16,
  },
  warningBanner: {
    backgroundColor: '#f97316',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  warningText: {
    color: '#ffffff',
    flex: 1,
    fontSize: 14,
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  errorHelp: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  indexButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  indexButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 16,
  },
  // Enhanced grid styles
  gridWrapper: {
    marginBottom: 20,
  },
  gridTitle: {
    fontSize: 24, 
    fontWeight: '700', 
    marginBottom: 16, 
    color: '#202124'
  },
  gridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
  },
  gridItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  iconCircle: { 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    textAlign: 'center', 
    color: '#202124',
    marginBottom: 4,
  },
  itemDescription: { 
    fontSize: 12, 
    color: '#5f6368', 
    textAlign: 'center', 
    marginTop: 4,
    lineHeight: 16,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20, color: '#202124' },
  progressSection: { marginBottom: 20 },
  progressLabelContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 16, fontWeight: '600', color: '#202124' },
  progressPercentage: { fontSize: 16, fontWeight: '700', color: '#3b82f6' },
  progressBarContainer: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 5 },
  moduleProgressContainer: { marginTop: 10 },
  moduleItem: { marginBottom: 14 },
  moduleItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  moduleIconCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  moduleTitle: { fontSize: 14, fontWeight: '500', color: '#202124', flex: 1 },
  modulePercentage: { fontSize: 14, fontWeight: '600', color: '#5f6368' },
  moduleProgressBarContainer: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden' },
  moduleProgressBar: { height: '100%', borderRadius: 3 },
  progressItem: {
    marginBottom: 14,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    padding: 12,
  },
  progressItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  progressTextContainer: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
  },
  progressStatus: {
    fontSize: 13,
    color: '#5f6368',
    marginTop: 2,
  },
  noDataText: { fontSize: 14, color: '#5f6368', textAlign: 'center', marginVertical: 10 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginTop: 20,
    marginBottom: 12,
  },
});

export default DashboardScreen;