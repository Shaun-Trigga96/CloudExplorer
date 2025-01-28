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


const GoogleIcon = () => <Icon name="google" size={20} color="white" />;
type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;

interface AuthScreenProps {
  navigation: AuthScreenNavigationProp;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const googleAuthService = GoogleAuthService.getInstance();

  useEffect(() => {
    console.log('Initializing Google Sign-In service');
    googleAuthService.initialize({
      webClientId: '502638141687-rnoto7rbd205ngclna875vtkgejr4fg1.apps.googleusercontent.com',
      offlineAccess: true,
    }).catch(error => {
      console.error('Google Sign-In initialization failed:', error);
      Alert.alert(
        'Initialization Error',
        'Failed to initialize Google authentication. Please restart the app.'
      );
    });
  }, [googleAuthService]);

  const handleGoogleSignIn = async () => {
    console.log('Starting Google Sign-In process');

    try {
      await googleAuthService.signIn();
      console.log('Google Sign-In successful, navigating to Home');
      navigation.navigate('Home');
    } catch (error) {
      console.error('Google Sign-In process failed:', error);

      let errorMessage = 'An unexpected error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;

        // Handle specific error scenarios
        if (error.message.includes('network error')) {
          errorMessage = 'Internet connection required for sign-in';
        }
      }

      Alert.alert('Authentication Error', errorMessage);
    } finally {
      console.log('Google Sign-In process completed');
    }
  };

  // Keep your existing handleEmailAuth function as is
  const handleEmailAuth = async () => {
    try {
      if (isLogin) {
        await auth().signInWithEmailAndPassword(email, password);
      } else {
        const userCredential = await auth().createUserWithEmailAndPassword(
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
        Alert.alert('Authentication Error', errorMessages[error.code] || 'Failed to authenticate. Please try again.');
      } else {
        Alert.alert('Error', 'An unexpected error occurred');
      }
    } finally {
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/CloudExplorer.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>
          {isLogin ? 'Welcome Back!' : 'Create an Account'}
        </Text>

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.input}
          secureTextEntry
        />

        <Button
          mode="contained"
          onPress={handleEmailAuth}
          style={styles.button}
          labelStyle={styles.buttonLabel}>
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
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    marginBottom: 15,
    backgroundColor: 'white',
  },
  button: {
    marginTop: 20,
    paddingVertical: 8,
    borderRadius: 4,
  },
  googleButton: {
    marginTop: 15,
    backgroundColor: '#DB4437',
    paddingVertical: 8,
    borderRadius: 4,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
  },
  toggleButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
});

export default AuthScreen;
