// c:\Users\thabi\Desktop\CloudExplorer\src\components\hooks\useAuth.test.ts

// Mock external dependencies BEFORE importing the hook
jest.mock('@react-native-firebase/auth', () => {
  // Return a mock implementation for the auth module
  return () => ({
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    // Add mocks for other auth methods if needed (currentUser, onAuthStateChanged etc.)
  });
});

jest.mock('@react-native-firebase/firestore', () => {
  // Mock firestore().collection().doc().set() chain
  const set = jest.fn(() => Promise.resolve()); // Mock set to resolve successfully
  const doc = jest.fn(() => ({ set }));
  const collection = jest.fn(() => ({ doc }));
  return () => ({ collection });
});


jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)), // Default to no stored ID
  // Add mocks for other AsyncStorage methods if needed
}));

// Mock navigation (provide mock functions for methods used by the hook)
const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  reset: mockReset,
  // Add other navigation methods if your hook uses them
};

// Mock services (Google/Apple) - simplified example
jest.mock('../../services/GoogleAuthService', () => ({
  GoogleAuthService: {
    getInstance: () => ({
      initialize: jest.fn(),
      signIn: jest.fn(),
    }),
  },
}));

// Mock Google Sign-In
jest.mock('@react-native-google-signin/google-signin', () => ({
    GoogleSignin: {
      configure: jest.fn(),
      signIn: jest.fn(), // You might need to mock other methods if useAuth uses them
    },
    statusCodes: {}, // Mock status codes if your hook checks them
  }));
  

// Mock Platform and Alert
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn() }, // Mock Platform.OS
  Alert: { alert: jest.fn() }, // Mock Alert.alert
}));

// Mock Apple Sign In conditionally (if needed and testing on iOS context)
// jest.mock('../../services/AppleAuthService', ...);

// NOW import the hook and testing utilities
import { renderHook, act } from '@testing-library/react-native';
import { useAuth } from './useAuth';
import auth from '@react-native-firebase/auth'; // Get the mocked version
import AsyncStorage from '@react-native-async-storage/async-storage'; // Mocked
import firestore from '@react-native-firebase/firestore'; // Mocked
import { Alert } from 'react-native';

describe('useAuth Hook', () => {
  // Clear mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset specific mock implementations if needed
  });

  // Test 1: Initial State (Red -> Green -> Refactor - often Green immediately)
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAuth(mockNavigation as any));

    expect(result.current.isLogin).toBe(true);
    expect(result.current.email).toBe('');
    expect(result.current.password).toBe('');
    expect(result.current.loading).toBe(false);
  });

  // Test 2: Successful Email Login (Red -> Green -> Refactor)
  it('should handle successful email login', async () => {
    // Arrange: Setup mocks for this specific test case
    const mockUser = { uid: 'test-uid-123' };
    const mockedSignIn = auth().signInWithEmailAndPassword as jest.Mock;
    mockedSignIn.mockResolvedValue({ user: mockUser }); // Simulate successful Firebase login

    const { result } = renderHook(() => useAuth(mockNavigation as any));

    // Act: Simulate user input and triggering the login function
    act(() => {
      result.current.setEmail('test@example.com');
      result.current.setPassword('password123');
    });

    // Trigger the async action
    await act(async () => {
      result.current.handleEmailAuth();
      // Wait for loading state changes if needed (waitForNextUpdate might be useful)
    });

    // Assert: Check the results
    expect(result.current.loading).toBe(false); // Should be false after completion
    expect(auth().signInWithEmailAndPassword).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('userId', 'test-uid-123');
    expect(mockNavigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  });

  // Test 3: Failed Email Login (Red -> Green -> Refactor)
  it('should handle failed email login and show alert', async () => {
      // Arrange: Mock Firebase to reject
      const loginError = new Error('auth/user-not-found'); // Simulate specific error
      (auth().signInWithEmailAndPassword as jest.Mock).mockRejectedValue(loginError);
      const mockAlert = jest.spyOn(Alert, 'alert'); // Spy on the mocked Alert

      const { result } = renderHook(() => useAuth(mockNavigation as any));

      // Act: Set credentials and attempt login
      act(() => {
          result.current.setEmail('wrong@example.com');
          result.current.setPassword('wrongpassword');
      });

      await act(async () => {
          await result.current.handleEmailAuth();
      });

      // Assert: Check loading state, error handling, and lack of navigation
      expect(result.current.loading).toBe(false);
      expect(auth().signInWithEmailAndPassword).toHaveBeenCalledWith('wrong@example.com', 'wrongpassword');
      expect(mockAlert).toHaveBeenCalledWith(
          'Authentication Error', // Title from handleAuthError
          'No user found with this email.' // Message from authErrorMessages map
      );
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
      expect(mockNavigation.reset).not.toHaveBeenCalled();
  });


  // --- Continue the Cycle ---

  // Test 4: Successful Email Signup
  it('should handle successful email signup and create user document', async () => {
    // Arrange: Mock createUser, firestore set, etc.
    const mockUser = { uid: 'new-user-456', email: 'new@example.com' };
    (auth().createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({ user: mockUser });
    const firestoreSetMock = firestore().collection('users').doc('new-user-456').set as jest.Mock;

    const { result } = renderHook(() => useAuth(mockNavigation as any));

    // Act: Set state to signup mode, set credentials, call handleEmailAuth
    act(() => {
      result.current.setIsLogin(false);
      result.current.setEmail('new@example.com');
      result.current.setPassword('newpassword');
    });
    await act(async () => {
      await result.current.handleEmailAuth();
    });

    // Assert: Check createUser call, firestore call, AsyncStorage, navigation
    expect(auth().createUserWithEmailAndPassword).toHaveBeenCalledWith('new@example.com', 'newpassword');
    expect(firestoreSetMock).toHaveBeenCalledWith(
      expect.objectContaining({ // Check if essential fields are present
        userId: 'new-user-456',
        email: 'new@example.com',
      }),
      { merge: true }
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('userId', 'new-user-456');
    expect(mockNavigation.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Home' }] });
  });


  // Test 5: Failed Email Signup (e.g., email already exists)
  // Test 6: Successful Google Sign-In
  // Test 7: Failed Google Sign-In (e.g., user cancels)
  // Test 8: Successful Apple Sign-In (if applicable)
  // Test 9: Failed Apple Sign-In (if applicable)
  // Test 10: Toggling between Login/Signup state updates `isLogin`

  // ... Add more tests for other scenarios and edge cases ...

});
