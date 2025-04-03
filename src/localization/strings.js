// src/localization/strings.js
// Basic example - consider using a library like i18next for full localization features

const strings = {
    // QuizzesScreen specific
    loadingQuizzes: 'Loading quizzes...',
    questionsSuffix: 'Questions', // Used in template literal: `${count} ${strings.questionsSuffix}`
    startQuiz: 'Start Quiz',
  
    // ExamsScreen specific
    loadingUserData: 'Loading user data...',
    certificationPracticeExamsTitle: 'Certification Practice Exams',
    certificationPracticeExamsDescription:
      'Test your knowledge with full-length practice exams for Google Cloud certifications. Each exam simulates the actual certification experience.',
    durationLabel: 'Duration',
    minutesSuffix: 'minutes', // Used like: `${duration} ${strings.minutesSuffix}`
    passRateLabel: 'Pass Rate',
    percentSuffix: '%', // Used like: `${rate}${strings.percentSuffix}` or `${score.toFixed(1)}${strings.percentSuffix}`
    previousAttemptsPrefix: 'Previous attempts: ', // Used like: `${strings.previousAttemptsPrefix}${attempts}`
    bestScorePrefix: 'Best score: ', // Used like: `${strings.bestScorePrefix}${score.toFixed(1)}%`
    startPracticeExam: 'Start Practice Exam',
    retry: 'Retry',
  
    // Shared / Error Messages
    errorTitle: 'Error',
    errorUserIDNotFound: 'User ID not found. Please log in again.',
    errorFailedLoadUserData: 'Failed to load user data.',
    errorServer: (status, data) => `Server Error: ${status} - ${data}`, // Example function for dynamic errors
    errorNetwork: 'Network error: Unable to connect to server. Please check your connection.',
    errorRequestSetup: (message) => `Error: ${message}`, // Example function
    errorUnexpected: (err) => `An unexpected error occurred: ${err}`, // Example function
    errorUnexpectedResponse: 'Unexpected response format from server.',
    errorUserIDRequired: 'User ID is required. Please log in.',
    errorExamProgressNotFound: 'Exam progress not found.',
    // Add other common strings as needed
  };
  
  export default strings;