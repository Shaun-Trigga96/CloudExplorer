import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { appleAuth, AppleRequestResponseFullName } from '@invertase/react-native-apple-authentication';

interface UserData {
  userId: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: FirebaseFirestoreTypes.FieldValue;
  learningProgress: {
    modules: Record<string, any>;
    quizzes: Record<string, any>;
    exams: Record<string, any>;
  };
  settings: {
    notificationsEnabled: boolean;
    darkMode: boolean;
  };
}

export class AppleAuthService {
  private static instance: AppleAuthService;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): AppleAuthService {
    if (!AppleAuthService.instance) {
      AppleAuthService.instance = new AppleAuthService();
    }
    return AppleAuthService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('Apple Sign-In is already initialized');
      return;
    }

    try {
      if (!appleAuth.isSupported) {
        throw new Error('Apple Sign-In is not supported on this device');
      }

      this.isInitialized = true;
      console.log('Apple Sign-In initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Apple Sign-In:', error);
      throw new Error('Failed to initialize Apple authentication service. Please try again later.');
    }
  }

  async signIn(): Promise<FirebaseAuthTypes.UserCredential> {
    if (!this.isInitialized) {
      throw new Error('Apple Sign-In service not initialized');
    }

    try {
      console.log('Attempting Apple Sign-In');
      // Perform Apple sign-in request
      const appleAuthResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // Get credentials
      const { identityToken, nonce } = appleAuthResponse;

      if (!identityToken) {
        throw new Error('No identity token returned from Apple Sign-In');
      }

      // Create Firebase credential
      console.log('Creating Firebase credential with Apple identity token');
      const credential = auth.AppleAuthProvider.credential(identityToken, nonce);

      // Sign in to Firebase
      console.log('Signing in with Firebase credential');
      const userCredential = await auth().signInWithCredential(credential);

      // If this is a new user, create their profile
      if (userCredential.additionalUserInfo?.isNewUser) {
        console.log('New user detected, creating profile');
        await this.createUserProfile(userCredential, appleAuthResponse.fullName);
      }

      return userCredential;
    } catch (error: any) {
      console.error('Apple Sign-In error:', error);

      if (error.code === appleAuth.Error.CANCELED) {
        throw new Error('Sign-in cancelled by user');
      } else if (error.code === appleAuth.Error.FAILED) {
        throw new Error('Sign-in failed');
      } else if (error.code === appleAuth.Error.INVALID_RESPONSE) {
        throw new Error('Invalid response received');
      } else if (error.message?.includes('network error')) {
        throw new Error('Network error. Please check your internet connection.');
      }

      throw new Error('Authentication failed. Please try again.');
    }
  }

  private async createUserProfile(
    userCredential: FirebaseAuthTypes.UserCredential,
    fullName?: AppleRequestResponseFullName | null
  ): Promise<void> {
    try {
      let displayName = userCredential.user.displayName;
      // If we have fullName from Apple response, construct display name
      if (fullName) {
        displayName = [fullName.givenName, fullName.familyName]
          .filter(Boolean)
          .join(' ');
      }

      const userData: UserData = {
        userId: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: displayName,
        photoURL: userCredential.user.photoURL,
        createdAt: firestore.FieldValue.serverTimestamp(),
        learningProgress: {
          modules: {},
          quizzes: {},
          exams: {},
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
      console.log('Attempting Firebase Sign-Out');
      await auth().signOut();
      console.log('Sign-out completed successfully');
    } catch (error) {
      console.error('Sign-out error:', error);
      throw new Error('Failed to sign out completely. Please try again.');
    }
  }
}
