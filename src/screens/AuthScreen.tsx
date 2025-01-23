import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Image, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type AuthScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Auth'
>;

interface AuthScreenProps {
  navigation: AuthScreenNavigationProp;
}


interface AuthScreenProps {
  navigation: AuthScreenNavigationProp;
}

const AuthScreen = ({ navigation }: AuthScreenProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '502638141687-rnoto7rbd205ngclna875vtkgejr4fg1.apps.googleusercontent.com',
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const { idToken } = await GoogleSignin.signIn() as any;
      const credential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(credential);
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Authentication Error');
    }
  };

  const handleEmailAuth = async () => {
    try {
      if (isLogin) {
        await auth().signInWithEmailAndPassword(email, password);
      } else {
        await auth().createUserWithEmailAndPassword(email, password);
      }
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Authentication Error');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
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
          labelStyle={styles.buttonLabel}
        >
          {isLogin ? 'Login' : 'Sign Up'}
        </Button>

        <Button
          mode="contained"
          onPress={handleGoogleSignIn}
          style={styles.googleButton}
          labelStyle={styles.buttonLabel}
          icon={() => <Icon name="google" size={20} color="white" />}
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
