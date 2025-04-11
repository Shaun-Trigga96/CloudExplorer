// c:\Users\thabi\Desktop\CloudExplorer\src\screens\AuthScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator, // Import ActivityIndicator for loading states
} from 'react-native';
import { TextInput, Button, Text, useTheme as usePaperTheme } from 'react-native-paper'; // Use Paper theme for components
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GoogleAuthService } from '../services/GoogleAuthService';
import auth from '@react-native-firebase/auth';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme as useCustomTheme } from '../context/ThemeContext'; // Import your custom theme hook

let AppleAuthService: { getInstance: () => any; };
if (Platform.OS === 'ios') {
  AppleAuthService = require('../services/AppleAuthService').AppleAuthService;
}

const GoogleIcon = () => <Icon name="google" size={20} color="white" />;
const AppleIcon = () => <Icon name="apple" size={20} color="white" />;

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;

interface AuthScreenProps {
  navigation: AuthScreenNavigationProp;
}

// --- Define Theme Colors (or import from a central file) ---
// Using the same structure as other screens for consistency
const lightColors = {
  background: '#F0F2F5',
  surface: '#FFFFFF',
  primary: '#007AFF', // Changed to match other screens
  text: '#1C1C1E',
  textSecondary: '#6E6E73',
  border: '#D1D1D6',
  error: '#FF3B30',
  // Add specific button colors if needed, otherwise rely on primary/brand
};

const darkColors = {
  background: '#000000',
  surface: '#1C1C1E',
  primary: '#0A84FF', // Changed to match other screens
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#3A3A3C',
  error: '#FF453A',
  // Add specific button colors if needed
};
// --- End Theme Colors ---

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const { isDarkMode } = useCustomTheme(); // Use your custom theme hook
  const colors = isDarkMode ? darkColors : lightColors; // Select color palette
  const paperTheme = usePaperTheme(); // Get Paper theme for component defaults if needed

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state
  const googleAuthService = GoogleAuthService.getInstance();
  const appleAuthService = Platform.OS === 'ios' ? AppleAuthService?.getInstance() : null;

  // --- useEffect and Handlers (Keep existing logic, add loading state management) ---
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication services');
        console.log('Initializing Google Sign-In service');
        googleAuthService.initialize({
          webClientId:
            '502638141687-rnoto7rbd205ngclna875vtkgejr4fg1.apps.googleusercontent.com',
          offlineAccess: true,
        });
        if (Platform.OS === 'ios' && appleAuthService) {
          console.log('Initializing Apple Sign-In');
          await appleAuthService.initialize();
        }
      } catch (error) {
        console.error('Authentication service initialization failed:', error);
        Alert.alert(
          'Initialization Error',
          'Failed to initialize authentication services. Please restart the app.',
        );
      }
    };

    initializeAuth();
  }, [appleAuthService, googleAuthService]);

  const handleGoogleSignIn = async () => {
    console.log('Starting Google Sign-In process');
    setLoading(true); // Start loading
    try {
      const userCredential = await googleAuthService.signIn();
      await googleAuthService.signIn();
      // Store the Firebase userId in AsyncStorage
      await AsyncStorage.setItem('userId', userCredential.user.uid);
      console.log('Firebase Auth UID:', userCredential.user.uid);
      console.log('Google Sign-In successful, navigating to Home');
      navigation.navigate('Home');
    } catch (error: any) { // Catch specific error types if possible
      console.error('Google Sign-In process failed:', error);
      let errorMessage = 'An unexpected error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('network error')) {
          errorMessage = 'Internet connection required for sign-in';
        } else if (error.message === '1001' || error.message.includes('SIGN_IN_CANCELLED')) {
            console.log('Google Sign in cancelled by user.');
            setLoading(false); // Ensure loading stops
            return; // Exit without showing alert
        }
      }
      Alert.alert('Authentication Error', errorMessage);
    } finally {
      console.log('Google Sign-In process completed');
      setLoading(false); // Stop loading
    }
  };

  const handleEmailAuth = async () => {
    setLoading(true); // Start loading
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await auth().signInWithEmailAndPassword(email, password);
      } else {
        userCredential = await auth().createUserWithEmailAndPassword(
          email,
          password,
        );
        // Update the user record with the email - This might not be needed if email is already set
        // await auth().currentUser?.updateEmail(email); // Consider if this is necessary

        // Create user document in Firestore
        await firestore()
          .collection('users')
          .doc(userCredential.user.uid)
          .set({
            userId: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.email?.split('@')[0] || 'New User', // Default display name
            createdAt: firestore.FieldValue.serverTimestamp(),
             learningProgress: {
              completedModules: [],
              completedQuizzes: [],
              completedExams: [],
              score: 0,
            },
            settings: {
              notificationsEnabled: true,
              darkMode: false,
              emailUpdates: true,
              syncData: true,
              soundEffects: true,
            },
          }, { merge: true }); // Use merge: true just in case
      }
      // Store the Firebase userId in AsyncStorage
      await AsyncStorage.setItem('userId', userCredential.user.uid);
      navigation.navigate('Home');
    } catch (error: any) {
      console.error('Email authentication failed:', error); // Log the error
      if (error.code?.startsWith('auth/')) {
        const errorMessages: { [key: string]: string } = {
          'auth/email-already-in-use': 'This email address is already in use.',
          'auth/invalid-email': 'Please enter a valid email address.',
          'auth/weak-password': 'Password should be at least 6 characters.',
          'auth/user-disabled': 'This account has been disabled.',
          'auth/user-not-found': 'No account found with this email address.',
          'auth/wrong-password': 'The password you entered is incorrect.',
          'auth/network-request-failed': 'Network error. Please check connection.',
        };
        Alert.alert(
          'Authentication Error',
          errorMessages[error.code] || `Authentication failed: ${error.code}`,
        );
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const handleAppleSignIn = async () => {
    console.log('Starting Apple Sign-In process');
    if (Platform.OS !== 'ios' || !appleAuthService) {return;}
    setLoading(true); // Start loading
    try {
      const userCredential = await appleAuthService.signIn();
      // Store the Firebase userId in AsyncStorage
      await AsyncStorage.setItem('userId', userCredential.user.uid);
      console.log('Apple Sign-In successful, navigating to Home');
      navigation.navigate('Home');
    } catch (error: any) { // Catch specific error types if possible
      console.error('Apple Sign-In process failed:', error);
      let errorMessage = 'An unexpected error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Check for cancellation error (codes might vary)
        if (error.message === '1001' || error.message.includes('cancelled')) {
            console.log('Apple Sign in cancelled by user.');
            setLoading(false); // Ensure loading stops
            return; // Exit without showing alert
        }
      }
      Alert.alert('Authentication Error', errorMessage);
    } finally {
      console.log('Apple Sign-In process completed');
      setLoading(false); // Stop loading
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      // Apply background color from theme
      style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        entering={FadeIn.duration(1000)}
        // Apply surface color and conditional border for dark mode
        style={[
          styles.content,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: isDarkMode ? 1 : 0, // Add border in dark mode
          },
        ]}>
        <Image
          source={require('../assets/images/cloud_explorer.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {/* Apply text color from theme */}
        <Text style={[styles.title, { color: colors.text }]}>
          {isLogin ? 'Login' : 'Sign Up'}
        </Text>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={styles.input} // Keep base input style
          keyboardType="email-address"
          autoCapitalize="none"
          // Apply theme colors to TextInput props
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          placeholderTextColor={colors.textSecondary}
          theme={{
            colors: {
              text: colors.text, // Text input color
              placeholder: colors.textSecondary,
              background: colors.surface, // Input background (Paper v3+)
              onSurface: colors.text, // Label color when focused
              onSurfaceVariant: colors.textSecondary, // Label color when unfocused/outline
            }
          }}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.input} // Keep base input style
          secureTextEntry
          // Apply theme colors to TextInput props
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          placeholderTextColor={colors.textSecondary}
           theme={{
            colors: {
              text: colors.text, // Text input color
              placeholder: colors.textSecondary,
              background: colors.surface, // Input background (Paper v3+)
              onSurface: colors.text, // Label color when focused
              onSurfaceVariant: colors.textSecondary, // Label color when unfocused/outline
            }
          }}
        />
        <Button
          mode="contained"
          onPress={handleEmailAuth}
          // Apply primary color from theme
          style={[styles.authButton, { backgroundColor: colors.primary }]}
          labelStyle={styles.buttonLabel}
          disabled={loading} // Disable button when loading
          loading={loading} // Show loading indicator
        >
          {/* Text changes based on loading state */}
          {loading ? (isLogin ? 'Logging in...' : 'Signing up...') : (isLogin ? 'Login' : 'Sign Up')}
        </Button>
        <Button
          mode="contained"
          onPress={handleGoogleSignIn}
          style={styles.googleButton} // Keep brand color
          labelStyle={styles.buttonLabel}
          icon={GoogleIcon}
          disabled={loading} // Disable button when loading
        >
          {/* Text changes based on loading state */}
          {loading ? 'Processing...' : 'Continue with Google'}
        </Button>
        {Platform.OS === 'ios' && (
          <Button
            mode="contained"
            onPress={handleAppleSignIn}
            style={styles.appleButton} // Keep brand color
            labelStyle={styles.buttonLabel}
            icon={AppleIcon}
            testID="apple-signin-button"
            disabled={loading} // Disable button when loading
          >
            {/* Text changes based on loading state */}
            {loading ? 'Processing...' : 'Continue with Apple'}
          </Button>
        )}
        <View style={styles.toggleContainer}>
          {/* Apply secondary text color */}
          <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </Text>
          <Button
            mode="text"
            onPress={() => setIsLogin(!isLogin)}
            // Apply primary color to labelStyle for text button
            labelStyle={[styles.toggleButton, { color: colors.primary }]}
            disabled={loading} // Disable toggle when loading
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </Button>
        </View>
         {/* Optional: Global loading indicator overlay if preferred over button indicators */}
         {/* {loading && (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
         )} */}
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor applied dynamically
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    // backgroundColor applied dynamically
    borderRadius: 15,
    marginHorizontal: 20,
    marginTop: 40,
    marginBottom: 20,
    // Shadows for light mode (subtle)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    // Border for dark mode applied dynamically
  },
  logo: {
    width: 100, // Slightly smaller logo
    height: 100,
    alignSelf: 'center',
    marginBottom: 24, // Adjusted margin
  },
  title: {
    fontSize: 26, // Adjusted size
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24, // Adjusted margin
    // color applied dynamically
    fontFamily: 'System',
  },
  input: {
    marginBottom: 15,
    // backgroundColor applied via theme prop in TextInput
    borderRadius: 10,
    // elevation: 2, // Elevation might not be needed with outlined inputs
  },
  authButton: {
    marginTop: 20,
    paddingVertical: 10,
    // backgroundColor applied dynamically
    borderRadius: 10,
    elevation: 3,
  },
  googleButton: {
    marginTop: 15,
    backgroundColor: '#DB4437', // Keep Google brand color
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 3,
  },
  appleButton: {
    marginTop: 15,
    backgroundColor: '#000000', // Keep Apple brand color
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 3,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff', // White text for primary/brand buttons
    fontFamily: 'System',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    // color applied dynamically
    fontFamily: 'System',
  },
  toggleButton: {
    fontSize: 14,
    fontWeight: '600',
    // color applied dynamically
    fontFamily: 'System',
    marginLeft: -4, // Reduce space for text button
  },
   loadingOverlay: { // Optional global overlay
     position: 'absolute',
     top: 0, left: 0, right: 0, bottom: 0,
     backgroundColor: 'rgba(0,0,0,0.3)',
     justifyContent: 'center',
     alignItems: 'center',
   },
});

export default AuthScreen;
