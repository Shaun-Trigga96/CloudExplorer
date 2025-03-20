import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import firestore from '@react-native-firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { GoogleAuthService } from '../services/GoogleAuthService';
import auth from '@react-native-firebase/auth';
import Animated, { FadeIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

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

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const googleAuthService = GoogleAuthService.getInstance();
  const appleAuthService = Platform.OS === 'ios' ? AppleAuthService?.getInstance() : null;

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
    try {
      const userCredential = await googleAuthService.signIn(); await googleAuthService.signIn();
      // Store the Firebase userId in AsyncStorage
      await AsyncStorage.setItem('userId', userCredential.user.uid);
      console.log('Firebase Auth UID:', userCredential.user.uid);
      console.log('Google Sign-In successful, navigating to Home');
      navigation.navigate('Home');
    } catch (error) {
      console.error('Google Sign-In process failed:', error);
      let errorMessage = 'An unexpected error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('network error')) {
          errorMessage = 'Internet connection required for sign-in';
        }
      }
      Alert.alert('Authentication Error', errorMessage);
    } finally {
      console.log('Google Sign-In process completed');
    }
  };

  const handleEmailAuth = async () => {
    try {
      let userCredential;
      if (isLogin) {
        userCredential = await auth().signInWithEmailAndPassword(email, password);
      } else {
        userCredential = await auth().createUserWithEmailAndPassword(
          email,
          password,
        );
        await firestore()
          .collection('users')
          .doc(userCredential.user.uid)
          .set({
            userId: userCredential.user.uid,
            email: userCredential.user.email,
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
          });
      }
      // Store the Firebase userId in AsyncStorage
      await AsyncStorage.setItem('userId', userCredential.user.uid);
      navigation.navigate('Home');
    } catch (error: any) {
      if (error.code?.startsWith('auth/')) {
        const errorMessages: { [key: string]: string } = {
          'auth/email-already-in-use': 'This email address is already in use.',
          'auth/invalid-email': 'Please enter a valid email address.',
          'auth/weak-password': 'Please choose a stronger password (minimum 6 characters).',
          'auth/user-disabled': 'This account has been disabled.',
          'auth/user-not-found': 'No account found with this email address.',
          'auth/wrong-password': 'The password you entered is incorrect.',
        };
        Alert.alert(
          'Authentication Error',
          errorMessages[error.code] || 'Failed to authenticate. Please try again.',
        );
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }
    } finally {
    }
  };

  const handleAppleSignIn = async () => {
    console.log('Starting Apple Sign-In process');
    if (Platform.OS !== 'ios' || !appleAuthService) {return;}
    try {
      const userCredential = await appleAuthService.signIn();
      // Store the Firebase userId in AsyncStorage
      await AsyncStorage.setItem('userId', userCredential.user.uid);
      console.log('Apple Sign-In successful, navigating to Home');
      navigation.navigate('Home');
    } catch (error) {
      console.error('Apple Sign-In process failed:', error);
      let errorMessage = 'An unexpected error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      Alert.alert('Authentication Error', errorMessage);
    } finally {
      console.log('Apple Sign-In process completed');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <Animated.View entering={FadeIn.duration(1000)} style={styles.content}>
        <Image
          source={require('../assets/images/cloud_explorer.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>
          {isLogin ? 'Log In' : 'Create an Account'}
        </Text>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          outlineColor="#e0e0e0"
          activeOutlineColor="#1a73e8"
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.input}
          secureTextEntry
          outlineColor="#e0e0e0"
          activeOutlineColor="#1a73e8"
        />
        <Button
          mode="contained"
          onPress={handleEmailAuth}
          style={styles.authButton}
          labelStyle={styles.buttonLabel}
        >
          {isLogin ? 'Login' : 'Sign Up'}
        </Button>
        <Button
          mode="contained"
          onPress={handleGoogleSignIn}
          style={styles.googleButton}
          labelStyle={styles.buttonLabel}
          icon={GoogleIcon}
        >
          Continue with Google
        </Button>
        {Platform.OS === 'ios' && (
          <Button
            mode="contained"
            onPress={handleAppleSignIn}
            style={styles.appleButton}
            labelStyle={styles.buttonLabel}
            icon={AppleIcon}
            testID="apple-signin-button"
          >
            Continue with Apple
          </Button>
        )}
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleText}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
          </Text>
          <Button
            mode="text"
            onPress={() => setIsLogin(!isLogin)}
            labelStyle={styles.toggleButton}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </Button>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    marginHorizontal: 20,
    marginTop: 40,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 30,
    color: '#202124',
    fontFamily: 'System',
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'transparent',
    borderRadius: 10,
    elevation: 2,
  },
  authButton: {
    marginTop: 20,
    paddingVertical: 10,
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    elevation: 3,
  },
  googleButton: {
    marginTop: 15,
    backgroundColor: '#DB4437',
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 3,
  },
  appleButton: {
    marginTop: 15,
    backgroundColor: '#000000',
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 3,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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
    color: '#5f6368',
    fontFamily: 'System',
  },
  toggleButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a73e8',
    fontFamily: 'System',
  },
});

export default AuthScreen;
