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
  ImageSourcePropType,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Animated, {FadeIn} from 'react-native-reanimated';
import {Button} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {REACT_APP_BASE_URL} from '@env';
import {RootStackParamList} from '../navigation/RootNavigator';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useTheme as useCustomTheme} from '../context/ThemeContext'; // Import your custom hook
import {useTheme as usePaperTheme} from 'react-native-paper'; // Import Paper theme hook

// --- Define Theme Colors (or import from App.tsx/central file) ---
// Add these color definitions near the top, before the component definition
const lightColors = {
  background: '#F0F2F5',
  surface: '#FFFFFF',
  primary: '#007AFF',
  text: '#1C1C1E',
  textSecondary: '#6E6E73',
  border: '#D1D1D6',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FFC107',
  progressBarBackground: '#e0e0e0',
  gridItemBackground: '#FFFFFF',
  progressItemBackground: '#f8f9fa', // Light grey for progress items
  quizModuleBackground: '#f8f9fa',
  quizItemBackground: '#FFFFFF',
  // ... other specific colors if needed
};

const darkColors = {
  background: '#000000',
  surface: '#1C1C1E', // Main card background
  primary: '#0A84FF',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#3A3A3C',
  error: '#FF453A',
  success: '#32D74B',
  warning: '#FFD60A',
  progressBarBackground: '#3A3A3C',
  gridItemBackground: '#1C1C1E', // Match surface
  progressItemBackground: '#2C2C2E', // Slightly lighter dark grey
  quizModuleBackground: '#1C1C1E', // Match surface
  quizItemBackground: '#2C2C2E', // Slightly lighter dark grey
  // ... other specific colors if needed
};
// --- End Theme Colors ---

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
  imageIcon: ImageSourcePropType;
  isImage?: boolean;
  colors: any;
}

interface ErrorInfo {
  message: string;
  isIndexError: boolean;
  indexUrl?: string;
}

// Update the GridLayout component to accept navigation prop
interface GridLayoutProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DashboardScreen'>;
  colors: typeof lightColors | typeof darkColors; // Add colors prop
  isDarkMode: boolean; // Add isDarkMode prop
}

// GridLayout component moved to the top
const GridLayout: FC<GridLayoutProps> = ({navigation, colors, isDarkMode}) => {
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
      <Text style={[styles.gridTitle, {color: colors.text}]}>Features</Text>
      <View style={styles.gridContainer}>
        {gridItems.map(item => (
          <Animated.View
            key={item.title}
            entering={FadeIn.duration(800).delay(gridItems.indexOf(item) * 100)}
            style={[
              styles.gridItem,
              {
                width: itemWidth,
                backgroundColor: colors.gridItemBackground, // Use specific grid item background
                borderColor: colors.border, // Add border color
                borderWidth: isDarkMode ? 1 : 0, // Add border in dark mode
              },
            ]}>
            <TouchableOpacity
              onPress={() => handleGridItemPress(item.screen)}
              style={{width: '100%', alignItems: 'center'}}>
              <View style={[styles.iconCircle, {backgroundColor: item.color}]}>
                <Icon name={item.icon} size={24} color="#ffffff" />
              </View>
              <Text style={[styles.itemTitle, {color: colors.text}]}>
                {item.title}
              </Text>
              <Text
                style={[styles.itemDescription, {color: colors.textSecondary}]}>
                {item.description}
              </Text>
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
  imageIcon,
  isImage = false,
  colors,
}) => (
  <View
    style={[
      styles.progressItem,
      {backgroundColor: colors.progressItemBackground},
    ]}>
    <View style={styles.progressItemHeader}>
      <View
        style={[
          styles.progressIconCircle,
          {backgroundColor: isImage ? 'transparent' : color},
        ]}>
          <Image
            source={imageIcon}
            style={styles.progressImageIcon}
            resizeMode="contain"
          />
      </View>
      <View style={styles.progressTextContainer}>
        <Text style={[styles.progressTitle, {color: colors.text}]}>
          {title}
        </Text>
        <Text style={[styles.progressStatus, {color: colors.textSecondary}]}>
          {status}
        </Text>
      </View>
      {percentage !== undefined && (
        <Text style={[styles.progressPercentage, {color: colors.primary}]}>
          {percentage}%
        </Text>
      )}
    </View>
    {percentage !== undefined && (
      <View
        style={[
          styles.progressBarContainer,
          {backgroundColor: colors.progressBarBackground},
        ]}>
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
  const {isDarkMode} = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;
  const paperTheme = usePaperTheme(); // Get Paper theme if needed for Paper components
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
    // 'cloud-data-engineer': require('../assets/images/data-engineer.png'),
    // 'cloud-architect-exam': require('../assets/images/cloud-architect.png'),
    // 'cloud-security-exam': require('../assets/images/security-engineer.png'),
  };

  // Exam colors to match the icons
  const examColors: Record<string, string> = {
    'cloud-digital-leader-exam': '#4285F4', // Google Blue
    // 'cloud-data-engineer-exam': '#0F9D58', // Google Green
    // 'cloud-architect-exam': '#DB4437', // Google Red
    // 'cloud-security-engineer-exam': '#F4B400', // Google Yellow
  };

// Define the icon map for the modules
const iconMap: { [key: string]: ImageSourcePropType } = {
  'digital-transformation':  require('../assets/images/digital_transformation.jpeg'),
  'artificial-intelligence':  require('../assets/images/artificial_intelligence.jpeg'),
  'infrastructure-application':  require('../assets/images/infrastructure_application.jpeg'),
  'scailing-operations':  require('../assets/images/scailing_operations.jpeg'),
  'trust-security':  require('../assets/images/trust_security.jpeg'),
  'data-transformation':  require('../assets/images/data_transformation.jpeg'),
  'default': require('../assets/images/cloud_generic.png'), // Add a default
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
        setQuizzes(response.data.availableQuizzes || []);
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
    fetchUserData();
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

  // --- Update getModuleDetails to return imageIcon ---
  const getModuleDetails = (moduleId: string) => {
    const module = modules.find(m => m.id === moduleId);
    const title = module?.title || moduleId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Default title formatting
    const imageIcon = iconMap[moduleId] || iconMap['default']; // Get image source
    const color = '#3b82f6'; // Keep a default color or map colors if needed

    return { imageIcon, color, title };
  };
  // --- End Update getModuleDetails ---

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
      <View
        style={[styles.loadingContainer, {backgroundColor: colors.background}]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Render error state for non-index errors or critical errors
  if (
    errorInfo &&
    (!errorInfo.isIndexError ||
      (modules.length === 0 && exams.length === 0 && quizzes.length === 0))
  ) {
    return (
      <SafeAreaView
        style={[styles.safeArea, {backgroundColor: colors.background}]}>
        <ScrollView style={styles.container}>
          <Animated.View
            entering={FadeIn.duration(800)}
            style={[styles.errorCard, {backgroundColor: colors.surface}]}>
            <Icon
              name="alert-circle"
              size={40}
              color={colors.error}
              style={styles.errorIcon}
            />
            <Text style={[styles.error, {color: colors.text}]}>
              {errorInfo.message}
            </Text>
            {errorInfo.isIndexError && errorInfo.indexUrl && (
              <>
                <Text style={[styles.errorHelp, {color: colors.textSecondary}]}>
                  This is a database configuration issue. An administrator needs
                  to create an index.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.indexButton,
                    {backgroundColor: colors.primary},
                  ]}
                  onPress={handleOpenIndexUrl}>
                  <Text style={[styles.indexButtonText, {color: '#FFFFFF'}]}>
                    Open Firebase Console
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <Button
              mode="contained"
              style={[styles.retryButton, {backgroundColor: colors.primary}]}
              labelStyle={{color: '#FFFFFF'}}
              icon="refresh">
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
    <SafeAreaView
      style={[styles.safeArea, {backgroundColor: colors.background}]}>
      <ScrollView style={styles.container}>
        {/* Show warning banner for index errors when we have partial data */}
        {errorInfo?.isIndexError && (
          <Animated.View
            entering={FadeIn.duration(800)}
            style={[styles.warningBanner, {backgroundColor: colors.warning}]}>
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
              <Text style={[styles.refreshButtonText, {color: '#fff'}]}>
                Retry
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* GridLayout placed at the top */}
        <GridLayout
          navigation={navigation}
          colors={colors}
          isDarkMode={isDarkMode}
        />

        <Animated.View
          entering={FadeIn.duration(1200)}
          style={[styles.card, {backgroundColor: colors.surface}]}>
          <Text style={[styles.cardTitle, {color: colors.text}]}>
            Learning Progress
          </Text>

          {/* Overall Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelContainer}>
              <Text style={[styles.progressLabel, {color: colors.text}]}>
                Overall Progress
              </Text>
              <Text
                style={[styles.progressPercentage, {color: colors.primary}]}>
                {progressPercentage}%
              </Text>
            </View>
            <View
              style={[
                styles.progressBarContainer,
                {backgroundColor: colors.progressBarBackground},
              ]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Modules Section */}
          <Text style={[styles.sectionTitle, {color: colors.text}]}>
            Modules
          </Text>
          {modules.length > 0 ? (
            modules.map(module => {
              const {imageIcon, color, title} = getModuleDetails(module.id);
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
                  imageIcon={imageIcon}
                  colors={colors}
                />
              );
            })
          ) : (
            <Text style={[styles.noDataText, {color: colors.textSecondary}]}>
              No modules available.
            </Text>
          )}

          <Text style={[styles.sectionTitle, {color: colors.text}]}>
            Quizzes
          </Text>
          {Object.keys(quizzesByModule).length > 0 ? (
            Object.keys(quizzesByModule).map(moduleId => {
              const {title, color, imageIcon} = getModuleDetails(moduleId);
              const moduleQuizzes = quizzesByModule[moduleId] || []; // Add fallback empty array
              const isExpanded = expandedModules[moduleId] || false;
              return (
                <View
                  key={moduleId}
                  style={[
                    styles.quizModuleContainer,
                    {backgroundColor: colors.quizModuleBackground},
                  ]}>
                  {/* Module Header */}
                  <TouchableOpacity
                    style={[
                      styles.quizModuleHeader,
                      {
                        borderColor: color, // Keep brand border color
                        backgroundColor: colors.surface, // Use surface for header background
                      },
                    ]}
                    onPress={() => toggleModuleExpanded(moduleId)}>
                    <View style={styles.quizModuleTitleContainer}>
                    <Image
                            source={imageIcon}
                            style={styles.progressImageIcon} // Reuse style
                            resizeMode="contain"
                        />
                      <Text
                        style={[styles.quizModuleTitle, {color: colors.text}]}>
                        {title}
                      </Text>
                    </View>
                    <View style={styles.quizModuleRightSection}>
                      <Text
                        style={[
                          styles.quizCountText,
                          {color: colors.textSecondary},
                        ]}>
                        {moduleQuizzes.length} Quizzes
                      </Text>
                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Dropdown Content */}
                  {isExpanded && (
                    <View
                      style={[
                        styles.quizListContainer,
                        {backgroundColor: colors.quizModuleBackground},
                      ]}>
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
                                {backgroundColor: colors.quizItemBackground}, // Use specific quiz item background
                                index < moduleQuizzes.length - 1 && [
                                  styles.quizItemBorder,
                                  {borderBottomColor: colors.border},
                                ], // Apply border color
                              ]}>
                              <View style={styles.quizItemDetails}>
                                <Text
                                  style={[
                                    styles.quizItemTitle,
                                    {
                                      color: isCompleted
                                        ? colors.text
                                        : colors.textSecondary,
                                    }, // Adjust color based on completion
                                  ]}>
                                  Quiz {index + 1}
                                  {quiz.timestamp &&
                                    ` - ${formatDate(quiz.timestamp)}`}
                                  {!isCompleted && ' (Not Started)'}
                                </Text>
                                {isCompleted ? (
                                  <Text
                                    style={[
                                      styles.quizItemScore,
                                      {color: colors.textSecondary},
                                    ]}>
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
                                <View
                                  style={[
                                    styles.quizItemProgressContainer,
                                    {
                                      backgroundColor:
                                        colors.progressBarBackground,
                                    },
                                  ]}>
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
                        <Text
                          style={[
                            styles.noDataText,
                            {color: colors.textSecondary},
                          ]}>
                          No quizzes available for this module.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          ) : quizzes && quizzes.length > 0 ? (
            // If we have quizzes but they're not properly grouped, show them as a flat list
            <View>
              {quizzes.map(quiz => {
                const { imageIcon, color } = getModuleDetails(quiz.moduleId);
                const status = learningProgress?.completedQuizzes?.includes(
                  quiz.id,
                )
                  ? 'Completed'
                  : 'Not Started';
                return (
                  <ProgressItem
                    key={quiz.id}
                    title={quiz.title}
                    status={status}
                    color={color}
                    imageIcon={imageIcon}
                    colors={colors}
                  />
                );
              })}
            </View>
          ) : (
            <Text style={[styles.noDataText, {color: colors.textSecondary}]}>
              No quizzes available.
            </Text>
          )}
          {/* Exams Section - Using image icons correctly */}
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Exams</Text>
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
                  colors={colors}
                />
              );
            })
          ) : (
            <Text style={[styles.noDataText, {color: colors.textSecondary}]}>
              No exams available.
            </Text>
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
  safeArea: {flex: 1 /* backgroundColor applied dynamically */},
  container: {flex: 1, padding: 16 /* backgroundColor applied dynamically */},
  // title: { fontSize: 24, fontWeight: '700', marginBottom: 16 /* color applied dynamically */ }, // Removed if not used directly
  card: {
    // Apply background in JSX
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    // shadowOpacity: isDarkMode ? 0.3 : 0.1, // Apply conditional shadow in JSX if needed
    shadowRadius: 4,
    elevation: 5,
  },
  errorCard: {
    // Apply background in JSX
    borderRadius: 15,
    padding: 24,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    // shadowOpacity: isDarkMode ? 0.3 : 0.1, // Apply conditional shadow in JSX if needed
    shadowRadius: 4,
    elevation: 5,
    alignItems: 'center',
  },
  errorIcon: {
    marginBottom: 16,
  },
  warningBanner: {
    // Apply background in JSX
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
    color: '#fff', // Keep warning text white
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
    // Apply color in JSX
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center' /* backgroundColor applied dynamically */,
  },
  error: {
    // Apply color in JSX
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  errorHelp: {
    // Apply color in JSX
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  indexButton: {
    // Apply background in JSX
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  indexButtonText: {
    // Apply color in JSX
    fontWeight: '600',
    fontSize: 14,
  },
  retryButton: {
    // Apply background in JSX
    marginTop: 10,
    paddingHorizontal: 16,
  },
  // Enhanced grid styles
  gridWrapper: {
    marginBottom: 20,
  },
  gridTitle: {
    // Apply color in JSX
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    // Apply background, border in JSX
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    // shadowOpacity: isDarkMode ? 0.2 : 0.1, // Apply conditional shadow in JSX if needed
    shadowRadius: 3,
    elevation: 3,
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
    // Apply color in JSX
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  itemDescription: {
    // Apply color in JSX
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  cardTitle: {
    // Apply color in JSX
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
  },
  progressSection: {marginBottom: 20},
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600' /* color applied dynamically */,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700' /* color applied dynamically */,
  },
  progressBarContainer: {
    // Apply background in JSX
    height: 10,
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
  moduleTitle: {fontSize: 14, fontWeight: '500', color: '#202124', flex: 1}, // Note: Color might need dynamic application if module title color changes
  modulePercentage: {fontSize: 14, fontWeight: '600', color: '#5f6368'}, // Note: Color might need dynamic application
  moduleProgressBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0', // Note: Color might need dynamic application
    borderRadius: 3,
    overflow: 'hidden',
  },
  moduleProgressBar: {height: '100%', borderRadius: 3},
  progressItem: {
    // Apply background in JSX
    marginBottom: 14,
    borderRadius: 8,
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
    // Apply color in JSX
    fontSize: 15,
    fontWeight: '600',
  },
  progressStatus: {
    // Apply color in JSX
    fontSize: 13,
    marginTop: 2,
  },
  noDataText: {
    // Apply color in JSX
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
  sectionTitle: {
    // Apply color in JSX
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
  },
  // Quiz module styles
  quizModuleContainer: {
    // Apply background in JSX
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  quizModuleHeader: {
    // Apply background, border in JSX
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderLeftWidth: 4,
    borderRadius: 8,
  },
  quizModuleTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quizModuleTitle: {
    // Apply color in JSX
    fontSize: 15,
    fontWeight: '600',
  },
  quizModuleRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quizCountText: {
    // Apply color in JSX
    fontSize: 13,
    marginRight: 8,
  },
  quizListContainer: {
    // Apply background in JSX
    padding: 8,
  },
  quizItem: {
    // Apply background in JSX
    padding: 12,
    borderRadius: 6,
    marginVertical: 4,
  },
  quizItemBorder: {
    // Apply border color in JSX
    borderBottomWidth: 1,
  },
  quizItemDetails: {
    marginBottom: 8,
  },
  quizItemTitle: {
    // Apply color in JSX
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  quizItemScore: {
    // Apply color in JSX
    fontSize: 13,
  },
  quizItemProgressContainer: {
    // Apply background in JSX
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  quizItemProgress: {
    height: '100%',
    borderRadius: 3,
  },
  imageIcon: { // Style for the Image component itself
    width: 30, // Control image dimensions
    height: 30,
  },
});

export default DashboardScreen;
