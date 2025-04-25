// c:\Users\thabi\Desktop\CloudExplorer\src\screens\QuizzesScreen.tsx
import React, { useState, useEffect, useCallback } from 'react'; // Added useState, useEffect, useCallback
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios'; // Import axios
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { REACT_APP_BASE_URL } from '@env'; // Import BASE_URL
import { RootStackParamList } from '../navigation/RootNavigator';
import strings from '../localization/strings';
import QuizCard from '../components/quizzes/QuizCard';
import { Quiz } from '../types/quiz'; // Keep Quiz type
// Remove hook import: import { useQuizList } from '../components/hooks/useQuiz';
import { useCustomTheme } from '../context/ThemeContext';
import { useActiveLearningPath } from '../context/ActiveLearningPathContext';
import {imageMap} from '../utils/imageMap';
import { handleError } from '../utils/handleError'; // Import error handler
// Import progress response type and helper types
import {
    UserProgressResponse as ApiUserProgressResponse,
    UserLearningPath // Assuming UserLearningPath is defined in modules.ts
} from '../types/modules'; // Adjust path if needed

const BASE_URL = REACT_APP_BASE_URL; // Define BASE_URL

type NavigationProp = StackNavigationProp<RootStackParamList, 'QuizzesScreen'>;

// Define response type inline like DashboardScreen
interface ListQuizzesResponse {
  status: string; // Use string for simplicity or 'success' | 'fail' | 'error'
  data?: {
    quizzes: Quiz[];
    hasMore?: boolean;
    lastId?: string | null;
  };
  message?: string; // Add optional message
}


const QuizzesScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { colors } = useCustomTheme().theme;

  // --- Use Context for providerId and pathId ---
  const { activeProviderId, activePathId } = useActiveLearningPath();

  // --- Add State Variables ---
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizProgress, setQuizProgress] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true); // Start loading true
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // --- Load userId ---
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        setUserId(storedUserId);
        if (!storedUserId) {
          console.warn('[QuizzesScreen] userId not found in storage.');
          setError('User session not found. Please log in.');
          setLoading(false); // Stop loading if no user
        } else {
            console.log('[QuizzesScreen] Loaded userId:', storedUserId);
        }
      } catch (e) {
          console.error('[QuizzesScreen] Failed to load userId:', e);
          setError('Failed to load user session.');
          setLoading(false);
      }
    };
    loadUserId();
  }, []);

  // --- Fetch Data Function (Directly in component) ---
  const fetchData = useCallback(async (currentProviderId: string, currentPathId: string, currentUserId: string) => {
    console.log(`[QuizzesScreen] Fetching data for path: ${currentProviderId}/${currentPathId}, user: ${currentUserId}`);
    setLoading(true);
    setError(null);
    // Reset state before fetching
    setQuizzes([]);
    setQuizProgress({});

    try {
      // --- Fetch Quizzes ---
      const quizzesUrl = `${BASE_URL}/api/v1/quizzes/list-quizzes`;
      console.log(`[QuizzesScreen] Fetching quizzes from: ${quizzesUrl} with params:`, { providerId: currentProviderId, pathId: currentPathId });
      const quizzesResponse = await axios.get<ListQuizzesResponse>(quizzesUrl, {
        params: { providerId: currentProviderId, pathId: currentPathId, limit: 50 }, // Fetch up to 50 quizzes
        timeout: 10000,
      });
      console.log('[QuizzesScreen] Raw quizzesResponse.data:', JSON.stringify(quizzesResponse.data, null, 2));

      if (quizzesResponse.data.status !== 'success') {
        throw new Error(quizzesResponse.data.message || 'Failed to fetch quizzes');
      }

      // --- Use EXACT extraction logic from DashboardScreen ---
      const fetchedQuizzes = quizzesResponse.data.data?.quizzes || [];
      console.log(`[QuizzesScreen] Extracted ${fetchedQuizzes.length} quizzes.`);
      setQuizzes(fetchedQuizzes); // Set state

      // --- Fetch User Progress ---
      console.log(`[QuizzesScreen] Fetching progress for user: ${currentUserId}`);
      const progressUrl = `${BASE_URL}/api/v1/users/${currentUserId}/progress`;
      const progressResponse = await axios.get<ApiUserProgressResponse>(progressUrl, {
        timeout: 10000,
      });
      console.log('[QuizzesScreen] Raw progressResponse.data:', JSON.stringify(progressResponse.data, null, 2));

      const progressDataPayload = progressResponse.data;

      if (!progressDataPayload?.userExists) {
        console.warn('[QuizzesScreen] User progress data not found or user does not exist.');
        setQuizProgress({}); // Reset progress
      } else {
        // --- Determine Quiz Completion Status ---
        const completedQuizIds = new Set<string>();
        // Iterate over learningPaths within the payload
        progressDataPayload.learningPaths?.forEach((path: UserLearningPath) => {
          if (path.providerId === currentProviderId && path.pathId === currentPathId) {
            // Access nested progress object
            path.progress?.completedQuizzes?.forEach((quizId: string) => {
              if (quizId) completedQuizIds.add(quizId);
            });
          }
        });

        const progressMap: Record<string, boolean> = {};
        // Use the fetchedQuizzes array directly
        if (Array.isArray(fetchedQuizzes)) {
          fetchedQuizzes.forEach((quiz: Quiz) => {
            progressMap[quiz.id] = completedQuizIds.has(quiz.id);
          });
        } else {
           // This should not happen if extraction is correct
           console.error('[QuizzesScreen] fetchedQuizzes is not an array before progress mapping!', fetchedQuizzes);
        }
        console.log('[QuizzesScreen] Calculated quiz progress:', progressMap);
        setQuizProgress(progressMap);
      }

    } catch (err: any) {
      console.error('[QuizzesScreen] Error fetching data:', err.response?.data || err.message);
      handleError(err, (msg: string | null) => setError(msg || 'Failed to load quizzes or progress.'));
      setQuizzes([]); // Clear data on error
      setQuizProgress({});
    } finally {
      setLoading(false);
      console.log('[QuizzesScreen] Fetching complete.');
    }
  }, []); // Empty dependency array for useCallback, relies on arguments passed in useEffect

  // --- useEffect to Trigger Fetch ---
  useEffect(() => {
    // Fetch only when all required IDs are available
    if (activeProviderId && activePathId && userId) {
      console.log('[QuizzesScreen] useEffect triggered: Fetching data.');
      fetchData(activeProviderId, activePathId, userId);
    } else {
      console.log('[QuizzesScreen] useEffect triggered: Waiting for required IDs.', { activeProviderId, activePathId, userId });
      // If context is missing, the initial path error check will handle it
      // If only userId is missing, wait for it or show login error
      if (!userId && !loading && !error) { // Only set error if not already loading userId and no other error exists
         // setError("User session not found."); // Handled by userId effect setting error
      } else if ((!activeProviderId || !activePathId) && !loading) {
         // This case is handled by the initial path error check render
         setLoading(false); // Ensure loading stops if context is missing
      }
    }
  }, [activeProviderId, activePathId, userId, fetchData]); // Depend on context IDs, userId, and fetchData function reference


  // --- Refetch Function ---
  const refetch = () => {
    // Refetch only if IDs are available
    if (activeProviderId && activePathId && userId) {
      fetchData(activeProviderId, activePathId, userId);
    } else {
      setError("Cannot retry: Missing required information (path or user).");
    }
  };

  // --- Navigation Handlers (remain the same) ---
  const handleStartQuiz = (quiz: Quiz) => {
    if (!activeProviderId || !activePathId) {
        console.error("[QuizzesScreen] Cannot navigate to quiz detail, active path not set.");
        return;
    }
    console.log('[QuizzesScreen] Navigating to QuizzesDetail with:', {
        moduleId: quiz.moduleId,
        providerId: activeProviderId,
        pathId: activePathId,
        quizId: quiz.id,
     });
    navigation.navigate('QuizzesDetail', {
      moduleId: quiz.moduleId,
      providerId: activeProviderId,
      pathId: activePathId,
      quizId: quiz.id,
    });
  };

  const handleSelectPath = () => {
    navigation.navigate('Home');
  };

  // --- RENDER LOGIC (Uses local state now) ---

  // --- Path Error State ---
  if (!activeProviderId || !activePathId) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Please select a learning path first.
        </Text>
        <Button
            mode="contained"
            onPress={handleSelectPath}
            style={{ backgroundColor: colors.primary }}
            labelStyle={{ color: colors.buttonText }}
        >
          Select Learning Path
        </Button>
      </View>
    );
  }

  // --- Loading State ---
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {strings.loadingQuizzes || 'Loading Quizzes...'}
        </Text>
      </View>
    );
  }

  // --- API Error State ---
  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{String(error)}</Text>
        <Button
            mode="contained"
            onPress={refetch} // Use the local refetch function
            style={{ backgroundColor: colors.primary }}
            labelStyle={{ color: colors.buttonText }}
        >
          Retry
        </Button>
      </View>
    );
  }

  // --- Main Content ---
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {quizzes.length > 0 ? (
        quizzes.map((quiz) => {
          const imageSource = imageMap[quiz.moduleId] || imageMap['default']; // Use imageMap here
          return (
            <QuizCard
              key={quiz.id}
              quiz={{ ...quiz, icon: imageSource }} // Pass the correct source
              isCompleted={quizProgress[quiz.id] || false} // Use local state
              onPress={() => handleStartQuiz(quiz)}
            />
          );
        })
      ) : (
        // --- No Quizzes Found State ---
        <View style={styles.noQuizzesContainer}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            No quizzes found for the selected learning path.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// --- Styles (remain the same) ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
  },
  noQuizzesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    marginTop: 50,
  },
});

export default QuizzesScreen;
