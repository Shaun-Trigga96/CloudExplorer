import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { createGoogleDoc, getGoogleDocContent as fetchGoogleDocContent } from './GoogleDocsService'; // Fix extension and import

// Types for better type safety
interface Module {
  id: string;
  title: string;
  description: string;
  content: string; // Google Doc URL
  duration: number;
  quizzes: string[];
  prerequisites: string[];
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

interface UserSettings {
  notificationsEnabled?: boolean;
  darkMode?: boolean;
  emailUpdates?: boolean;
}

// Create a new module with Google Doc integration
export const createModule = async (title: string, description: string, content: string) => {
  try {
    // Create Google Doc and get its URL
    const googleDocUrl = await createGoogleDoc(title, content);

    // Save module data to Firestore
    const moduleRef = await firestore().collection('modules').add({
      title,
      description,
      content: googleDocUrl, // Store the Google Doc URL
      duration: 60, // Default duration
      quizzes: [], // Initialize with empty quizzes
      prerequisites: [],
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return { id: moduleRef.id, googleDocUrl };
  } catch (error) {
    console.error('Error creating module:', error);
    throw error;
  }
};

// Get all modules
export const getModules = async (): Promise<Module[]> => {
  const snapshot = await firestore().collection('modules').get();
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Module));
};

// Get module details with raw Google Doc content
export const getModuleDetails = async (moduleId: string): Promise<Module & { rawContent: any } | null> => {
  const doc = await firestore().collection('modules').doc(moduleId).get();
  if (!doc.exists) {return null;}

  const moduleData = doc.data() as Module;
  const rawContent = moduleData ? await fetchGoogleDocContent(moduleData.content) : null;
  return { ...moduleData, rawContent };
};

// User Service
export const userService = {
  getCurrentUser: () => auth().currentUser,

  updateUserSettings: async (userId: string, settings: UserSettings): Promise<boolean> => {
    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          settings,
        });
      return true;
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  },

  getUserProgress: async (userId: string): Promise<any> => {
    try {
      const userDoc = await firestore()
        .collection('users')
        .doc(userId)
        .get();

      if (!userDoc.exists) {return null;}
      return userDoc.data()?.learningProgress;
    } catch (error) {
      console.error('Error fetching user progress:', error);
      throw error;
    }
  },
};

// Module Service
export const moduleService = {
  getAllModules: async (): Promise<Module[]> => {
    try {
      const modulesSnapshot = await firestore()
        .collection('modules')
        .orderBy('order') // Ensure 'order' field exists in Firestore, or remove if not needed
        .get();

      return modulesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Module));
    } catch (error) {
      console.error('Error fetching modules:', error);
      throw error;
    }
  },

  getModuleById: async (moduleId: string): Promise<Module | null> => {
    try {
      const moduleDoc = await firestore()
        .collection('modules')
        .doc(moduleId)
        .get();

      return moduleDoc.exists ? { id: moduleDoc.id, ...moduleDoc.data() } as Module : null;
    } catch (error) {
      console.error('Error fetching module:', error);
      throw error;
    }
  },

  updateModuleProgress: async (userId: string, moduleId: string, progress: number): Promise<boolean> => {
    try {
      await firestore()
        .collection('users')
        .doc(userId)
        .update({
          [`learningProgress.modules.${moduleId}`]: {
            progress,
            lastAccessed: firestore.FieldValue.serverTimestamp(),
          },
        });
      return true;
    } catch (error) {
      console.error('Error updating module progress:', error);
      throw error;
    }
  },
};

// Quiz Service
export const quizService = {
  getAllQuizzes: async (): Promise<any[]> => {
    try {
      const quizzesSnapshot = await firestore()
        .collection('quizzes')
        .get();

      return quizzesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      throw error;
    }
  },

  submitQuizAttempt: async (userId: string, quizId: string, answers: any[], score: number): Promise<boolean> => {
    try {
      const batch = firestore().batch();

      const userRef = firestore().collection('users').doc(userId);
      batch.update(userRef, {
        [`learningProgress.quizzes.${quizId}`]: {
          completed: true,
          score,
          lastAttempt: firestore.FieldValue.serverTimestamp(),
          attempts: firestore.FieldValue.increment(1),
        },
      });

      const attemptRef = firestore()
        .collection('users')
        .doc(userId)
        .collection('quizAttempts')
        .doc();

      batch.set(attemptRef, {
        quizId,
        answers,
        score,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error submitting quiz attempt:', error);
      throw error;
    }
  },
};

// Exam Service
export const examService = {
  getAllExams: async (): Promise<any[]> => {
    try {
      const examsSnapshot = await firestore()
        .collection('exams')
        .get();

      return examsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Error fetching exams:', error);
      throw error;
    }
  },

  submitExamAttempt: async (userId: string, examId: string, answers: any[], score: number): Promise<boolean> => {
    try {
      const batch = firestore().batch();

      const userRef = firestore().collection('users').doc(userId);
      batch.update(userRef, {
        [`learningProgress.exams.${examId}`]: {
          completed: true,
          score,
          lastAttempt: firestore.FieldValue.serverTimestamp(),
          attempts: firestore.FieldValue.increment(1),
        },
      });

      const attemptRef = firestore()
        .collection('users')
        .doc(userId)
        .collection('examAttempts')
        .doc();

      batch.set(attemptRef, {
        examId,
        answers,
        score,
        timestamp: firestore.FieldValue.serverTimestamp(),
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error('Error submitting exam attempt:', error);
      throw error;
    }
  },
};