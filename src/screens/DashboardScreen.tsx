/* eslint-disable react-native/no-inline-styles */
import React, {FC, useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Animated, {FadeIn} from 'react-native-reanimated';
import {Button, Card, Title} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import ComputeEngineIcon from '../assets/icons/compute_engine.svg';
import CloudStorageIcon from '../assets/icons/cloud_storage.svg';
import CloudFunctionsIcon from '../assets/icons/cloud_functions.svg';
import KubernetesEngineIcon from '../assets/icons/google_kubernetes_engine.svg';
import StreamingAnalyticsIcon from '../assets/icons/streaming_analytics.svg';
import CloudGenericIcon from '../assets/icons/cloud_generic.svg';
import {REACT_APP_BASE_URL} from '@env';
import {RootStackParamList} from '../navigation/RootNavigator';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import iconMap from './../utils/iconMap';

const BASE_URL = REACT_APP_BASE_URL;

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

interface Quiz {
  id: string;
  title: string;
  moduleId: string; // Add moduleId to the Quiz interface
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
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  imageIcon?: any; // For Image source
  isImage?: boolean;
}

interface ErrorInfo {
  message: string;
  isIndexError: boolean;
  indexUrl?: string;
}

// Update the GridLayout component to accept navigation prop
interface GridLayoutProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DashboardScreen'>;
}

// GridLayout component moved to the top
const GridLayout: FC<GridLayoutProps> = ({navigation}) => {
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
    }, // You can navigate to the same screen or a different one
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
    }, // You can navigate to the same screen or a different one
    {
      icon: 'settings',
      title: 'Settings',
      description: 'Customize your learning experience and preferences',
      color: '#ef4444',
      screen: 'Settings',
    },
    {
      icon: 'users',
      title: 'Community',
      description: 'Connect with other cloud learners',
      color: '#0ea5e9',
      screen: 'Dashboard',
    }, // You can navigate to the same screen or a different one
  ];

  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - 48) / 2;

  const handleGridItemPress = (screen: string) => {
    if (screen) {
      navigation.navigate(screen as never);
    }
  };

  return (
    <View style={styles.gridWrapper}>
      <Text style={styles.gridTitle}>Features</Text>
      <View style={styles.gridContainer}>
        {gridItems.map(item => (
          <Animated.View
            key={item.title}
            entering={FadeIn.duration(800).delay(gridItems.indexOf(item) * 100)}
            style={[styles.gridItem, {width: itemWidth}]}>
            <TouchableOpacity
              onPress={() => handleGridItemPress(item.screen)}
              style={{width: '100%', alignItems: 'center'}}>
              <View style={[styles.iconCircle, {backgroundColor: item.color}]}>
                <Icon name={item.icon} size={24} color="#ffffff" />
              </View>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
};

// Implement the ProgressItem component with support for both SVG and Image icons
const ProgressItem: FC<ProgressItemProps> = ({
  title,
  status,
  percentage,
  color,
  icon: IconComponent,
  imageIcon,
  isImage = false,
}) => (
  <View style={styles.progressItem}>
    <View style={styles.progressItemHeader}>
      <View
        style={[
          styles.progressIconCircle,
          {backgroundColor: isImage ? 'transparent' : color},
        ]}>
        {isImage ? (
          <Image
            source={imageIcon}
            style={styles.progressImageIcon}
            resizeMode="contain"
          />
        ) : (
          IconComponent && <IconComponent width={20} height={20} />
        )}
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
            {width: `${percentage}%`, backgroundColor: color},
          ]}
        />
      </View>
    )}
  </View>
);

const DashboardScreen: FC<{navigation: any}> = ({navigation}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [learningProgress, setLearningProgress] =
    useState<LearningProgress | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]); // New state
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);
  const [expandedModules, setExpandedModules] = useState<
    Record<string, boolean>
  >({});

  // Exam icon mapping - matching the ExamsScreen structure
  const examIcons: Record<string, any> = {
    'cloud-digital-leader-exam': require('../assets/images/cloud-digital-leader.png'),
    'cloud-data-engineer': require('../assets/images/data-engineer.png'),
    'cloud-architect-exam': require('../assets/images/cloud-architect.png'),
    'cloud-security-exam': require('../assets/images/security-engineer.png'),
  };

  // Exam colors to match the icons
  const examColors: Record<string, string> = {
    'cloud-digital-leader-exam': '#4285F4', // Google Blue
    'cloud-data-engineer-exam': '#0F9D58', // Google Green
    'cloud-architect-exam': '#DB4437', // Google Red
    'cloud-security-engineer-exam': '#F4B400', // Google Yellow
  };

   // Define the icon map for the quizzes
   const iconMap: { [key: string]: React.FC } = {
    'cloud-storage': CloudStorageIcon,
    'compute-engine': ComputeEngineIcon,
    'cloud-functions': CloudFunctionsIcon,
    'kubernetes-engine': KubernetesEngineIcon,
    'cloud-fundamentals': CloudGenericIcon,
    'data-transformation': StreamingAnalyticsIcon,
  };

  // Function to toggle the expanded state of a module
  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  // Group quiz results by module
  const groupQuizzesByModule = () => {
    const grouped: Record<string, QuizResult[]> = {};

    quizResults.forEach(quiz => {
      if (!grouped[quiz.moduleId]) {
        grouped[quiz.moduleId] = [];
      }
      grouped[quiz.moduleId].push(quiz);
    });

    // Sort quizzes by timestamp if available
    Object.keys(grouped).forEach(moduleId => {
      grouped[moduleId].sort((a, b) => {
        if (!a.timestamp && !b.timestamp) {
          return 0;
        }
        if (!a.timestamp) {
          return 1;
        }
        if (!b.timestamp) {
          return -1;
        }
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
    });

    return grouped;
  };

  // Helper function to extract Firestore index URL from error message
  const extractFirestoreIndexUrl = (
    errorMessage: string,
  ): string | undefined => {
    if (!errorMessage) {
      return undefined;
    }

    const urlMatch = errorMessage.match(
      /(https:\/\/console\.firebase\.google\.com\/[^\s"]+)/,
    );
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

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        let storedUserId = await AsyncStorage.getItem('userId');
        console.log('Stored User ID (original):', storedUserId);
        if (!storedUserId) {
          return;
        }
        const response = await axios.get(
          `${BASE_URL}/api/v1/users/${storedUserId}/progress`,
        );
        console.log('API Response:', response.data);
        setLearningProgress(response.data.learningProgress || null);
        setProgress(response.data.detailedProgress || []);
        setModules(response.data.availableModules || []);
        setExams(response.data.exams || []);
        setQuizzes(response.data.availableQuizzes);
        setQuizResults(response.data.quizResults || []);
        setExamResults(response.data.examResults || []);
        setErrorInfo(null);
      } catch (err: any) {
        console.error(
          'Error fetching dashboard data:',
          err.response?.data || err.message,
        );

        const errorMessage = err.response?.data?.error || '';
        if (
          errorMessage.includes('FAILED_PRECONDITION') &&
          errorMessage.includes('index')
        ) {
          // This is a Firestore index error
          const indexUrl = extractFirestoreIndexUrl(errorMessage);
          setErrorInfo({
            message:
              'The database query requires an index which needs to be created.',
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
          if (err.response?.data?.quizzes) {
            setQuizzes(err.response.data.quizzes);
          }
        } else {
          setErrorInfo({
            message:
              errorMessage ||
              'Failed to load dashboard data. Please try again.',
            isIndexError: false,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    const fetchAvailableQuizzes = async () => {
      try {
        const response = await axios.get(
          `${BASE_URL}/api/v1/quizzes/list-quizzes`,
        );
        console.log('Available Quizzes API Response:', response.data);
        setQuizzes(response.data.availableQuizzes);
      } catch (error) {
        console.error('Error fetching available quizzes:', error);
      }
    };

    fetchUserData();
    fetchAvailableQuizzes(); // Fetch available quizzes
  }, [navigation]);

  // Calculate overall progress
  const totalModules = modules.length;
  const completedModuleIds = [
    ...new Set([
      // Get completed module IDs from the summary user data
      ...(Array.isArray(learningProgress?.completedModules)
        ? learningProgress.completedModules
        : []),
      // Get completed module IDs from the detailed progress data
      ...progress // Use the 'progress' state (which should contain detailedProgress data)
        .filter(p => p.moduleId === 'module' && p.status === 'completed') // Filter ONLY completed MODULES
        .map(entry => entry), // Map to get JUST the resourceId STRING
    ]),
  ];

  const progressPercentage =
    totalModules > 0
      ? Math.round((completedModuleIds.length / totalModules) * 100)
      : 0;

  // Map module IDs to icons, colors, and titles
  const getModuleDetails = (moduleId: string) => {
    const moduleMap: {
      [key: string]: {
        icon: React.FC<React.SVGProps<SVGSVGElement>>;
        color: string;
        title: string;
      };
    } = {
      'cloud-fundamentals': {
        icon: CloudGenericIcon as React.FC<React.SVGProps<SVGSVGElement>>,
        color: '#0000',
        title: 'GCP Cloud Fundamentals',
      },
      'compute-engine': {
        icon: ComputeEngineIcon as React.FC<React.SVGProps<SVGSVGElement>>,
        color: '#0000',
        title: 'Compute Engine',
      },
      'cloud-storage': {
        icon: CloudStorageIcon as React.FC<React.SVGProps<SVGSVGElement>>,
        color: '#0000',
        title: 'Cloud Storage',
      },
      'cloud-functions': {
        icon: CloudFunctionsIcon as React.FC<React.SVGProps<SVGSVGElement>>,
        color: '#0000',
        title: 'Cloud Functions',
      },
      'kubernetes-engine': {
        icon: KubernetesEngineIcon as React.FC<React.SVGProps<SVGSVGElement>>,
        color: '#0000',
        title: 'Kubernetes Engine',
      },
      'data-transformation': {
        icon: StreamingAnalyticsIcon as React.FC<React.SVGProps<SVGSVGElement>>,
        color: '#0000',
        title: 'Data Transformation',
      },
    };

    const module = modules.find(m => m.id === moduleId);
    const mapped = moduleMap[moduleId] || {
      icon: ComputeEngineIcon as React.FC<React.SVGProps<SVGSVGElement>>,
      color: '#3b82f6',
      title: module?.title || moduleId,
    };
    return {...mapped, title: module?.title || mapped.title};
  };


  // Helper function to format date
  const formatDate = (dateString: string | number | Date) => {
    if (!dateString) {
      return 'N/A';
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Render error state for non-index errors or critical errors
  if (
    errorInfo &&
    (!errorInfo.isIndexError || (modules.length === 0 && exams.length === 0))
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>
          <Animated.View
            entering={FadeIn.duration(800)}
            style={styles.errorCard}>
            <Icon
              name="alert-circle"
              size={40}
              color="#ef4444"
              style={styles.errorIcon}
            />
            <Text style={styles.error}>{errorInfo.message}</Text>

            {errorInfo.isIndexError && errorInfo.indexUrl && (
              <>
                <Text style={styles.errorHelp}>
                  This is a database configuration issue. An administrator needs
                  to create an index.
                </Text>
                <TouchableOpacity
                  style={styles.indexButton}
                  onPress={handleOpenIndexUrl}>
                  <Text style={styles.indexButtonText}>
                    Open Firebase Console
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <Button mode="contained" style={styles.retryButton} icon="refresh">
              Retry
            </Button>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Group quizzes by module
  const quizzesByModule = groupQuizzesByModule();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Show warning banner for index errors when we have partial data */}
        {errorInfo?.isIndexError && (
          <Animated.View
            entering={FadeIn.duration(800)}
            style={styles.warningBanner}>
            <Icon
              name="alert-triangle"
              size={18}
              color="#fff"
              style={{marginRight: 8}}
            />
            <Text style={styles.warningText}>
              Some data couldn't be loaded.
            </Text>
            <TouchableOpacity style={styles.refreshButton}>
              <Text style={styles.refreshButtonText}>Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* GridLayout placed at the top */}
        <GridLayout navigation={navigation} />

        <Animated.View entering={FadeIn.duration(1200)} style={styles.card}>
          <Text style={styles.cardTitle}>Learning Progress</Text>

          {/* Overall Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelContainer}>
              <Text style={styles.progressLabel}>Overall Progress</Text>
              <Text style={styles.progressPercentage}>
                {progressPercentage}%
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {width: `${progressPercentage}%`, backgroundColor: '#3b82f6'},
                ]}
              />
            </View>
          </View>

          {/* Modules Section */}
          <Text style={styles.sectionTitle}>Modules</Text>
          {modules.length > 0 ? (
            modules.map(module => {
              const {icon, color, title} = getModuleDetails(module.id);
              const isCompleted = completedModuleIds.includes(module.id);
              const isInProgress = progress.some(
                p => p.moduleId === module.id && p.status === 'in_progress',
              );
              const status = isCompleted
                ? 'Completed'
                : isInProgress
                ? 'In Progress'
                : 'Not Started';
              return (
                <ProgressItem
                  key={module.id}
                  title={title}
                  status={status}
                  color={color}
                  icon={icon}
                />
              );
            })
          ) : (
            <Text style={styles.noDataText}>No modules available.</Text>
          )}

          <Text style={styles.sectionTitle}>Quizzes</Text>
        {/* Display Available Quizzes */}
        {/* {quizzes.length > 0 ? (
            <View>
              {quizzes.map(quiz => {
                const IconComponent = iconMap[quiz.moduleId] || CloudGenericIcon;
                const status = learningProgress?.completedQuizzes?.includes(quiz.id)
                ? 'Completed'
                : 'Not Started';
                  return (
                    <ProgressItem
                    key={quiz.id}
                    title={quiz.title}
                    status={status}
                    color={''}
                    icon={IconComponent}
                  />
                );
              })}
            </View>
          ) : (
            <Text style={styles.noDataText}>No quizzes available.</Text>
          )} */}
          {Object.keys(quizzesByModule).length > 0 ? (
            Object.keys(quizzesByModule).map(moduleId => {
              const {title, color, icon} = getModuleDetails(moduleId);
              const moduleQuizzes = quizzesByModule[moduleId];
              const isExpanded = expandedModules[moduleId] || false; // Removed completedQuizzes filter
              return (
                <View key={moduleId} style={styles.quizModuleContainer}>
                  {/* Module Header */}
                  <TouchableOpacity
                    style={[styles.quizModuleHeader, {borderColor: color}]}
                    onPress={() => toggleModuleExpanded(moduleId)}>
                    <View style={styles.quizModuleTitleContainer}>
                      <View
                        style={[
                          styles.progressIconCircle,
                          {backgroundColor: color},
                        ]}>
                        {icon &&
                          React.createElement(icon, {width: 20, height: 20})}
                      </View>
                      <Text style={styles.quizModuleTitle}>{title}</Text>
                    </View>
                    <View style={styles.quizModuleRightSection}>
                      <Text style={styles.quizCountText}>
                        {moduleQuizzes.length} Quizzes
                      </Text>
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#5f6368"
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Dropdown Content */}
                  {isExpanded && (
                    <View style={styles.quizListContainer}>
                      {moduleQuizzes.length > 0 ? (
                        moduleQuizzes.map((quiz, index) => {
                          const isCompleted =
                            quiz.score !== undefined &&
                            quiz.totalQuestions !== undefined;
                          return (
                            <View
                              key={quiz.id}
                              style={[
                                styles.quizItem,
                                index < moduleQuizzes.length - 1 &&
                                  styles.quizItemBorder,
                              ]}>
                              <View style={styles.quizItemDetails}>
                                <Text
                                  style={[
                                    styles.quizItemTitle,
                                    {color: isCompleted ? '#202124' : '#666'},
                                  ]}>
                                  Quiz {index + 1}
                                  {quiz.timestamp &&
                                    ` - ${formatDate(quiz.timestamp)}`}
                                  {!isCompleted && ' (Not Started)'}
                                </Text>
                                {isCompleted ? (
                                  <Text style={styles.quizItemScore}>
                                    Score: {quiz.score}/{quiz.totalQuestions}{' '}
                                    {quiz.percentage !== undefined &&
                                      `(${quiz.percentage}%)`}
                                  </Text>
                                ) : (
                                  <Text style={styles.quizItemScore}>
                                    Not yet completed
                                  </Text>
                                )}
                              </View>
                              {isCompleted && quiz.percentage !== undefined && (
                                <View style={styles.quizItemProgressContainer}>
                                  <View
                                    style={[
                                      styles.quizItemProgress,
                                      {
                                        width: `${quiz.percentage}%`,
                                        backgroundColor: color,
                                      },
                                    ]}
                                  />
                                </View>
                              )}
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.noDataText}>
                          No quizzes available for this module.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.noDataText}>No quizzes available.</Text>
          )}

          {/* Exams Section - Using image icons correctly */}
          <Text style={styles.sectionTitle}>Exams</Text>
          {exams.length > 0 ? (
            exams.map(exam => {
              const examImage = examIcons[exam.id];
              const examColor = examColors[exam.id] || '#3b82f6';
              const examResult = examResults.find(er => er.examId === exam.id);
              const status = learningProgress?.completedExams?.includes(exam.id)
                ? 'Completed'
                : 'Not Started';
              return (
                <ProgressItem
                  key={exam.id}
                  title={exam.title}
                  status={status}
                  percentage={examResult?.percentage}
                  color={examColor}
                  imageIcon={examImage}
                  isImage={true}
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
  quizCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quizIconContainer: {
    marginRight: 12,
  },
  quizTitle: {
    flex: 1,
  },
  safeArea: {flex: 1, backgroundColor: '#f8f9fa'},
  container: {flex: 1, padding: 16},
  title: {fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#202124'},
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
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
    shadowOffset: {width: 0, height: 2},
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
    shadowOffset: {width: 0, height: 1},
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
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
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
    color: '#202124',
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
    shadowOffset: {width: 0, height: 2},
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
    shadowOffset: {width: 0, height: 1},
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
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: '#202124',
  },
  progressSection: {marginBottom: 20},
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {fontSize: 16, fontWeight: '600', color: '#202124'},
  progressPercentage: {fontSize: 16, fontWeight: '700', color: '#3b82f6'},
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {height: '100%', borderRadius: 5},
  moduleProgressContainer: {marginTop: 10},
  moduleItem: {marginBottom: 14},
  moduleItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  moduleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  moduleTitle: {fontSize: 14, fontWeight: '500', color: '#202124', flex: 1},
  modulePercentage: {fontSize: 14, fontWeight: '600', color: '#5f6368'},
  moduleProgressBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  moduleProgressBar: {height: '100%', borderRadius: 3},
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
  progressImageIcon: {
    width: 32,
    height: 32,
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
  noDataText: {
    fontSize: 14,
    color: '#5f6368',
    textAlign: 'center',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginTop: 20,
    marginBottom: 12,
  },
  // Quiz module styles
  quizModuleContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  quizModuleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderLeftWidth: 4,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  quizModuleTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quizModuleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#202124',
  },
  quizModuleRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quizCountText: {
    fontSize: 13,
    color: '#5f6368',
    marginRight: 8,
  },
  quizListContainer: {
    padding: 8,
    backgroundColor: '#f8f9fa',
  },
  quizItem: {
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 6,
    marginVertical: 4,
  },
  quizItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  quizItemDetails: {
    marginBottom: 8,
  },
  quizItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202124',
    marginBottom: 2,
  },
  quizItemScore: {
    fontSize: 13,
    color: '#5f6368',
  },
  quizItemProgressContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  quizItemProgress: {
    height: '100%',
    borderRadius: 3,
  },
});

export default DashboardScreen;
