import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

interface GoogleSignInConfig {
  webClientId: string;
  offlineAccess: boolean;
}
interface UserData {
  userId: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: FirebaseFirestoreTypes.FieldValue;
  learningProgress: {
    completedModules: Record<string, any>;
    completedQuizzes: Record<string, any>;
    completedExams: Record<string, any>;
    score: number,
  };
  settings: {
    notificationsEnabled: boolean;
    darkMode: boolean;
  };
}

export class GoogleAuthService {
  private static instance: GoogleAuthService;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  async initialize(config: GoogleSignInConfig) {
    if (this.isInitialized) {
      console.warn('Google Sign-In is already initialized');
      return;
    }

    try {
      GoogleSignin.configure(config);
      this.isInitialized = true;
      console.log('Google Sign-In initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sign-In:', error);
      throw new Error('Failed to initialize Google authentication service. Please try again later.');
    }
  }

  async signIn(): Promise<FirebaseAuthTypes.UserCredential> {
    if (!this.isInitialized) {
      throw new Error('Google Sign-In service not initialized');
    }
    try {
      console.log('Checking Google Play services availability');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('Attempting Google Sign-In');

     // Get the users ID token
     const signInResult = await GoogleSignin.signIn();

     // Try the new style of google-sign in result, from v13+ of that module
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
       //idToken? = signInResult.idToken;
        console.error('Google Sign-In succeeded but no ID token was returned');
        throw new Error('Authentication failed. Please try again.');
      }
      if (!idToken) {
        throw new Error('No ID token found');
      }

      console.log('Creating Firebase credential with ID token');
      const credential = auth.GoogleAuthProvider.credential(idToken);

      console.log('Signing in with Firebase credential');
      const userCredential = await auth().signInWithCredential(credential);

      if (userCredential.additionalUserInfo?.isNewUser) {
        console.log('New user detected, creating profile');
        await this.createUserProfile(userCredential);
      }

      return auth().signInWithCredential(credential);
    } catch (error: any) {
      console.error('Google Sign-In error:', error);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Sign-in cancelled by user');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Sign-in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available or outdated');
      } else if (error.message?.includes('network error')) {
        throw new Error('Network error. Please check your internet connection.');
      }

      throw new Error('Authentication failed. Please try again.');
    }
  }

  private async createUserProfile(userCredential: FirebaseAuthTypes.UserCredential): Promise<void> {
    try {
      const userData: UserData = {
        userId: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
        createdAt: firestore.FieldValue.serverTimestamp(),
        learningProgress: {
          completedModules: {},
          completedQuizzes: {},
          completedExams: {},
          score: 0,
        },
        settings: {
          notificationsEnabled: true,
          darkMode: false,
        },
      };

      console.log('Saving user profile to Firestore');
      await firestore()
        .collection('users')
        .doc(userCredential.user.uid)
        .set(userData);

      console.log('User profile created successfully');
    } catch (error) {
      console.error('Failed to create user profile:', error);
      throw new Error('Failed to create user profile. Some features might not work properly.');
    }
  }

  async signOut(): Promise<void> {
    try {
      console.log('Attempting Google Sign-Out');
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();

      console.log('Attempting Firebase Sign-Out');
      await auth().signOut();

      console.log('Sign-out completed successfully');
    } catch (error) {
      console.error('Sign-out error:', error);
      throw new Error('Failed to sign out completely. Please try again.');
    }
  }
}
