// src/hooks/useExamDetail.ts
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { REACT_APP_BASE_URL } from '@env';
import { Question, ExamResult, ExamTimingData, ExamDetail } from '../../types/exam'; // Import ExamDetail
import { handleError } from '../../utils/handleError'; // Import error handler

const BASE_URL = REACT_APP_BASE_URL;

// Define expected API response structure for exam details
interface ExamDetailResponse {
  status: 'success' | 'error';
  data: {
    exam: ExamDetail; // Assuming ExamDetail includes metadata AND questions
  };
  message?: string;
}
// Response from saving the exam result
interface SaveExamResultResponse {
  status: 'success' | 'error';
  message?: string;
  resultId?: string; // ID of the saved result document
  passed: boolean;   // Whether the user passed
}
interface SubmitProgressResponse {
    status: 'success' | 'error';
    message?: string;
    // Include any other relevant data returned on submission
}


interface UseExamDetailReturn {
  examMeta: Omit<ExamDetail, 'questions'> | null; // Metadata (title, duration, passingScore etc.)
  questions: Question[];
  loading: boolean;
  error: string | null;
  userIdError: string | null; // Added
  userAnswers: Record<string, string>; // Use question ID (string) as key
  currentQuestionIndex: number;
  examCompleted: boolean;
  examResult: ExamResult | null;
  examStarted: boolean;
  examTiming: ExamTimingData | null;
  setUserAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setCurrentQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
  setExamCompleted: React.Dispatch<React.SetStateAction<boolean>>;
  setExamStarted: React.Dispatch<React.SetStateAction<boolean>>;
  fetchExamData: () => Promise<void>; // Renamed
  submitExam: () => void;
  startExam: () => void;
  handleAnswerSelection: (questionId: string, answerLetter: string) => void; // Use string ID
  navigateToNextQuestion: () => void;
  navigateToPreviousQuestion: () => void;
  navigateToQuestion: (index: number) => void;
  refetchExamData: () => void; // Added
}

// Rename hook function and add providerId/pathId
export const useExamDetail = (
    examId: string,
    providerId: string | null, // Added
    pathId: string | null,     // Added
    navigation: any // Use specific navigation type if available
): UseExamDetailReturn => {
  const [examMeta, setExamMeta] = useState<Omit<ExamDetail, 'questions'> | null>(null); // State for metadata
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userIdError, setUserIdError] = useState<string | null>(null); // Added
  const [userId, setUserId] = useState<string | null>(null); // Added
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({}); // Use string ID
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [examCompleted, setExamCompleted] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [examStarted, setExamStarted] = useState(false);
  const [examTiming, setExamTiming] = useState<ExamTimingData | null>(null);
  const [submittingResults, setSubmittingResults] = useState<boolean>(false); // Added

  // --- Fetch User ID ---
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          setUserId(storedUserId);
          setUserIdError(null);
          console.log('[useExamDetail] Loaded userId:', storedUserId);
        } else {
          console.warn('[useExamDetail] userId not found in storage.');
          setUserIdError('User ID not found. Please log in.');
          setUserId(null);
        }
      } catch (e) {
        console.error('[useExamDetail] Failed to load userId from storage:', e);
        setUserIdError('Failed to load user session.');
        setUserId(null);
      }
    };
    loadUserId();
  }, []);

  // --- Fetch Exam Data (Metadata + Questions) --- Renamed from fetchExamQuestions
  const fetchExamData = useCallback(async () => {
    // Guard clauses
    if (!examId) {
        setError("Exam ID is missing.");
        setLoading(false);
        return;
    }


    console.log(`[useExamDetail] Fetching exam data for examId: ${examId}`);
    setLoading(true);
    setError(null);
    setUserIdError(null); // Clear errors on fetch attempt
    setExamCompleted(false); // Reset completion state
    setExamResult(null);     // Reset previous results
    setExamStarted(false);   // Reset started state (unless loaded from storage)
    // Don't reset userAnswers/index here, allow loading from storage first

    try {
      // Assuming endpoint returns both metadata and questions
      const response = await axios.get<ExamDetailResponse>(`${BASE_URL}/api/v1/exams/${examId}`, { timeout: 15000 });

      if (response.data.status !== 'success' || !response.data.data.exam) {
        throw new Error(response.data.message || 'Failed to load exam details (invalid response)');
      }

      // Cast the API response data temporarily to access 'id'
      const examDataFromApi = response.data.data.exam as any;
      const apiExamId = examDataFromApi.id; // Get the ID from the raw API data
      const { questions: fetchedQuestions, ...restOfMeta } = examDataFromApi; // Destructure the rest

      // Construct the meta object ensuring examId is populated from the API's id field
      // Use the type Omit<ExamDetail, 'questions'> which expects 'examId'
      const meta: Omit<ExamDetail, 'questions'> = {
          ...restOfMeta,   // Spread the rest of the properties
          examId: apiExamId, // Assign the fetched 'id' to the 'examId' field
      };

      console.log(`[useExamDetail] Fetched exam "${meta.title}" (ID: ${meta.examId}) with ${fetchedQuestions.length} questions. Passing score: ${meta.passingRate}`);
      setQuestions(fetchedQuestions || []); // Ensure questions is always an array
      setExamMeta(meta);

      // Load saved state *after* fetching questions/meta
      await loadSavedExamState();

    } catch (err: any) {
      console.error('[useExamDetail] Error fetching exam data:', err.response?.data || err.message);
      handleError(err, (msg) => setError(msg || 'Failed to load the exam.'));
      setQuestions([]);
      setExamMeta(null);
    } finally {
      setLoading(false);
    }
  }, [examId]); // Removed userId, providerId, pathId as direct deps for fetching generic details

  // --- Effect to trigger fetch ---
  useEffect(() => {
    fetchExamData();
  }, [fetchExamData]); // Fetch on mount and when fetchExamData changes (examId)

  // --- Process and Submit Exam Results --- Renamed from processExamSubmission
  const processAndSubmitResults = useCallback(async () => {
    // Guard clauses
    if (!examMeta || questions.length === 0) {
      Alert.alert('Error', 'Exam data is missing.');
      return;
    }
    if (!userId || !providerId || !pathId) {
        setError('Cannot submit results: User or Path context is missing.');
        Alert.alert('Error', 'Cannot submit results: User or Path context is missing.');
        return;
    }
    if (submittingResults) return; // Prevent double submission

    console.log(`[useExamDetail] Processing submission for exam: ${examMeta.examId}, user: ${userId}, path: ${providerId}/${pathId}`); // Use examMeta.examId
    setSubmittingResults(true);
    setError(null); // Clear previous errors

    try {
      let correctAnswers = 0;
      const answeredQuestionsData = questions.map(question => {
        const userAnswer = userAnswers[question.id] || ''; // Use string ID
        const isCorrect = userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
        if (isCorrect) correctAnswers++;
        return {
          questionId: question.id,
          questionText: question.question, // Include text for review
          userAnswer: userAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect: isCorrect,
          explanation: question.explanation?.join('\n') || '', // Join explanation array
        };
      });

      const totalQuestions = questions.length;
      const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      // Use fetched passing score, default to 70 if somehow missing
      const passingScoreThreshold = examMeta.passingRate ?? 70;
      const passed = score >= passingScoreThreshold;

      console.log(`[useExamDetail] Calculated Score: ${correctAnswers}/${totalQuestions} (${score}%), Passing Threshold: ${passingScoreThreshold}%, Passed: ${passed}`);

      // Construct the result object for display
      const displayResult: ExamResult = {
        examId: examMeta.examId, // Use examMeta.examId
        providerId: providerId, // Include context
        pathId: pathId, // Include context
        userId: userId,
        score: score, // Keep score as 0-100
        percentage: score, // Use score as percentage
        passed: passed,
        answeredQuestions: answeredQuestionsData.map(q => ({
          question: q.questionText,
          userAnswer: q.userAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect: q.isCorrect,
          explanation: q.explanation,
        })),
        timestamp: new Date().toISOString(), // Add timestamp now
        answers: userAnswers,
        totalQuestions: totalQuestions, // Add total questions
      };
       // --- Step 1: Save the detailed exam result ---
       const saveResultUrl = `${BASE_URL}/api/v1/exams/save-result`;
       // Create payload matching backend expectations (use validated fields)
       const savePayload = {
         userId: userId,
         examId: examMeta.examId, // Use examMeta.examId
         providerId: providerId,
         pathId: pathId,
         score: correctAnswers, // Raw score count
         totalQuestions: totalQuestions,
         percentage: score,     // Send percentage
         passed: passed,
         answers: userAnswers, // Send the user's answers map { questionId: answerLetter }
         timestamp: displayResult.timestamp, // Use the same timestamp
         // Optional: Send timing info if available
         startTime: examTiming?.startTime,
         endTime: displayResult.timestamp, // Use completion timestamp as end time
         timeSpent: examTiming ? Math.round((new Date(displayResult.timestamp).getTime() - new Date(examTiming.startTime).getTime()) / 1000) : null,
       };

       console.log('[useExamDetail] Saving exam result payload:', savePayload);

       const saveResponse = await axios.post<SaveExamResultResponse>(saveResultUrl, savePayload, { timeout: 15000 });
 
       if (saveResponse.data.status !== 'success') {
         throw new Error(saveResponse.data.message || 'Failed to save exam result details.');
       }
       console.log(`[useExamDetail] Exam result saved successfully (ID: ${saveResponse.data.resultId}). Passed: ${saveResponse.data.passed}`);
 
       // --- Step 2: If passed, update the overall user progress for the learning path ---
       if (saveResponse.data.passed) {
         console.log('[useExamDetail] Exam passed. Updating user progress...');
         const progressUrl = `${BASE_URL}/api/v1/users/${userId}/progress`;
         const progressPayload = {
           resourceType: 'exam',
           resourceId: examMeta.examId, // Use examMeta.examId
           action: 'complete',
           providerId: providerId,
           pathId: pathId,
           // No need to send score/percentage here, just completion status
         };
         console.log('[useExamDetail] User progress update payload:', progressPayload);
         const progressResponse = await axios.post<SubmitProgressResponse>(progressUrl, progressPayload, { timeout: 10000 });
 
         if (progressResponse.data.status !== 'success') {
           console.warn('[useExamDetail] Failed to update user progress:', progressResponse.data.message || 'Unknown error');
         } else {
           console.log('[useExamDetail] User progress updated successfully.');
         }
       } else {
         console.log('[useExamDetail] Exam not passed. Skipping user progress update.');
       }
 
       // --- Final UI Updates ---
       setExamResult(displayResult); // Set result for display
       setExamCompleted(true); // Mark as completed
       await AsyncStorage.removeItem(`exam_${examMeta.examId}_user_${userId}_state`); // Use examMeta.examId for key
 
     } catch (err: any) {
       console.error('[useExamDetail] Error submitting exam results:', err.response?.data || err.message);
     } finally {
       setSubmittingResults(false);
     }
   }, [examMeta, questions, userAnswers, userId, providerId, pathId, examTiming, submittingResults]);
 

  // --- Submit Exam (Handles confirmation) ---
  const submitExam = useCallback(() => {
    const answeredCount = Object.keys(userAnswers).length;
    if (answeredCount < questions.length) {
      Alert.alert(
        'Incomplete Exam',
        `You've answered ${answeredCount} of ${questions.length} questions. Submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: processAndSubmitResults }, // Call the processing function
        ]
      );
    } else {
      processAndSubmitResults(); // Call the processing function directly
    }
  }, [userAnswers, questions.length, processAndSubmitResults]);

  // --- Start Exam ---
  const startExam = () => {
    if (examStarted) return; // Prevent restarting if already started (e.g., loaded from storage)
    const startTime = new Date();
    console.log('[useExamDetail] Starting exam at:', startTime.toISOString());
    setExamStarted(true);
    setExamTiming({
      startTime: startTime.toISOString(),
      timeSpent: 0, // Assuming starting fresh, loaded state handles timeSpent
    });
    // Optionally post 'start' action here
    // postProgressUpdate('start');
  };

  // --- Handle Answer Selection ---
  const handleAnswerSelection = (questionId: string, answerLetter: string) => {
    if (examCompleted) return; // Don't allow changes after completion
    setUserAnswers(prev => ({ ...prev, [questionId]: answerLetter }));
  };

  // --- Navigation ---
  const navigateToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const navigateToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const navigateToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
        setCurrentQuestionIndex(index);
    }
  };

  // --- Load/Save State ---
  const loadSavedExamState = useCallback(async () => {
    if (!userId) return; // Only load/save if user is identified
    try {
      const savedExamState = await AsyncStorage.getItem(`exam_${examId}_user_${userId}_state`);
      if (savedExamState) {
        console.log('[useExamDetail] Loading saved state from AsyncStorage');
        const parsedState = JSON.parse(savedExamState);
        setUserAnswers(parsedState.userAnswers || {});
        setCurrentQuestionIndex(parsedState.currentQuestionIndex || 0);
        setExamTiming(parsedState.examTiming || null);
        if (parsedState.examTiming && !examCompleted) { // Only set started if not already completed
          setExamStarted(true);
          console.log('[useExamDetail] Resuming exam based on saved state.');
        }
      } else {
         console.log('[useExamDetail] No saved state found in AsyncStorage.');
         // Reset state if no saved data found (optional, prevents stale data)
         setUserAnswers({});
         setCurrentQuestionIndex(0);
         setExamTiming(null);
         setExamStarted(false);
      }
    } catch (error) {
      console.error('[useExamDetail] Error loading saved exam state:', error);
      // Don't set error state here, just log
    }
  }, [examId, userId, examCompleted]); // Depend on userId and examCompleted

  const saveExamState = useCallback(async () => {
    // Only save if started, not completed, and user identified
    if (!examStarted || examCompleted || !userId || !examMeta) return;
    try {
      const examState = {
        userAnswers,
        currentQuestionIndex,
        examTiming,
        // Optionally add examMeta.id or timestamp for validation?
      };
      await AsyncStorage.setItem(`exam_${examId}_user_${userId}_state`, JSON.stringify(examState));
      // console.log('[useExamDetail] Saved exam state to AsyncStorage'); // Can be noisy
    } catch (error) {
      console.error('[useExamDetail] Error saving exam state:', error);
      // Don't set error state here, just log
    }
  }, [userAnswers, currentQuestionIndex, examTiming, examId, examStarted, examCompleted, userId, examMeta]);

  // Effect to save state periodically or on change
  useEffect(() => {
    saveExamState();
  }, [saveExamState]); // Save whenever the state it depends on changes

  // --- Refetch Function ---
  const refetchExamData = useCallback(() => {
    console.log('[useExamDetail] Manual refetch triggered.');
    // Reset potentially stale state before fetching again
    setQuestions([]);
    setExamMeta(null);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setExamCompleted(false);
    setExamResult(null);
    setExamStarted(false);
    setExamTiming(null);
    fetchExamData(); // Call the main fetch function
  }, [fetchExamData]);


  return {
    examMeta,
    questions,
    loading,
    error,
    userIdError, // Added
    userAnswers,
    currentQuestionIndex,
    examCompleted,
    examResult,
    examStarted,
    examTiming,
    setUserAnswers,
    setCurrentQuestionIndex,
    setExamCompleted,
    setExamStarted,
    fetchExamData, // Renamed
    submitExam,
    startExam,
    handleAnswerSelection,
    navigateToNextQuestion,
    navigateToPreviousQuestion,
    navigateToQuestion,
    refetchExamData, // Added
  };
};
