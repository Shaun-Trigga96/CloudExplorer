// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleAuthService } from '../../services/GoogleAuthService';
import { authErrorMessages } from '../../utils/authErrors';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { statusCodes } from '@react-native-google-signin/google-signin';

let AppleAuthService: { getInstance: () => any };
if (Platform.OS === 'ios') {
  AppleAuthService = require('../../services/AppleAuthService').AppleAuthService;
}

interface UseAuthReturn {
  isLogin: boolean;
  email: string;
  password: string;
  loading: boolean;
  setIsLogin: React.Dispatch<React.SetStateAction<boolean>>;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  handleEmailAuth: () => Promise<void>;
  handleGoogleSignIn: () => Promise<void>;
  handleAppleSignIn: () => Promise<void>;
}

export const useAuth = (
  navigation: StackNavigationProp<RootStackParamList, 'Auth'>
): UseAuthReturn => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const googleAuthService = GoogleAuthService.getInstance();
  const appleAuthService = Platform.OS === 'ios' ? AppleAuthService?.getInstance() : null;

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        googleAuthService.initialize({
          webClientId:
            '502638141687-rnoto7rbd205ngclna875vtkgejr4fg1.apps.googleusercontent.com',
          offlineAccess: true,
        });
        if (Platform.OS === 'ios' && appleAuthService) {
          await appleAuthService.initialize();
        }
      } catch (error) {
        Alert.alert(
          'Initialization Error',
          'Failed to initialize authentication services. Please restart the app.'
        );
      }
    };

    initializeAuth();
  }, [googleAuthService, appleAuthService, ]);

    const handleAuthError = (error: any, method: string) => {
      let errorMessage = 'An unexpected error occurred';
  
      // --- Determine the error message ---
      if (error instanceof Error) {
        // Use specific message from your map or the error's message
        errorMessage = authErrorMessages[error.message] || error.message;
      } else if (error.code && authErrorMessages[error.code]) {
        // Use specific message from your map based on error code
        errorMessage = authErrorMessages[error.code];
      } else if (error.code) {
          // Fallback to the error code if no specific message is found
          errorMessage = `Error Code: ${error.code}`;
      }
      // You might want to add more specific checks here if needed
  
      // --- Handle specific cases ---
  
      // Handle cancellation silently in the console
      if (errorMessage.includes('cancelled') || (error.code && error.code === 'CANCELLED') || (error.code && error.code === statusCodes.SIGN_IN_CANCELLED) ) {
        console.log(`${method} cancelled by user.`);
        return; // Don't show an alert for cancellations
      }
  
      // TEMPORARY CHANGE: Log Google Sign-In errors instead of showing an Alert
      // (Useful for debugging the 'activity is null' issue without the secondary alert error)
      if (method === 'Google Sign-In') {
        console.error(`Authentication Error (${method}):`, errorMessage, error);
        // If you want to show an alert *specifically* for Google errors later, uncomment below
        // Alert.alert('Authentication Error', errorMessage);
        return; // Prevent the default alert for Google Sign-In errors for now
      }
  
      // --- Show Alert for other errors ---
      console.error(`Authentication Error (${method}):`, errorMessage, error); // Log all other errors too
      Alert.alert('Authentication Error', errorMessage);
    };
  
  const saveUserId = async (userId: string) => {
    await AsyncStorage.setItem('userId', userId);
  };

  const handleEmailAuth = async () => {
    setLoading(true);
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await auth().signInWithEmailAndPassword(email, password);
      } else {
        userCredential = await auth().createUserWithEmailAndPassword(email, password);
        await firestore()
          .collection('users')
          .doc(userCredential.user.uid)
          .set(
            {
              userId: userCredential.user.uid,
              email: userCredential.user.email,
              displayName: userCredential.user.email?.split('@')[0] || 'New User',
              createdAt: firestore.FieldValue.serverTimestamp(),
              learningProgress: {
                completedModules: [],
                completedQuizzes: [],
                completedExams: [],
                score: 0,
              },
              settings: {
                notificationsEnabled: false,
                darkMode: false,
                emailUpdates: false,
                syncData: false,
                soundEffects: false,
              },
            },
            { merge: true }
          );
      }
      await saveUserId(userCredential.user.uid);
      navigation.navigate('Home');
    } catch (error: any) {
      handleAuthError(error, 'Email authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const userCredential = await googleAuthService.signIn();
      await saveUserId(userCredential.user.uid);
      navigation.navigate('Home');
    } catch (error: any) {
      handleAuthError(error, 'Google Sign-In');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios' || !appleAuthService) return;
    setLoading(true);
    try {
      const userCredential = await appleAuthService.signIn();
      await saveUserId(userCredential.user.uid);
      navigation.navigate('Home');
    } catch (error: any) {
      handleAuthError(error, 'Apple Sign-In');
    } finally {
      setLoading(false);
    }
  };

  return {
    isLogin,
    email,
    password,
    loading,
    setIsLogin,
    setEmail,
    setPassword,
    handleEmailAuth,
    handleGoogleSignIn,
    handleAppleSignIn,
  };
};