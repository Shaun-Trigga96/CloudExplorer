import auth from '@react-native-firebase/auth';
import type { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { appleAuth } from '@invertase/react-native-apple-authentication';


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

  async signIn(): Promise<any> {
    try {
      console.log('Attempting Apple Sign-In');
      // Perform Apple sign-in request
      const appleAuthResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // Get credentials
      const { identityToken } = appleAuthResponse;

      if (!identityToken) {
        throw new Error('No identity token returned from Apple Sign-In');
      }

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
