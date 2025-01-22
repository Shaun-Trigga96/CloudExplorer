import React, { useState } from 'react';
import { StyleSheet, View, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import auth from '@react-native-firebase/auth';

const App = () => {
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Registration
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async () => {
    try {
      if (isLogin) {
        // Login
        const userCredential = await auth().signInWithEmailAndPassword(email, password);
        console.log('Logged in:', userCredential.user);
      } else {
        // Registration
        const userCredential = await auth().createUserWithEmailAndPassword(email, password);
        console.log('Registered:', userCredential.user);
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        {/* Logo */}
        <Image
          source={require('./assets/CloudExplorer.png')} // Replace with your logo path
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Welcome Message */}
        <Text style={styles.welcomeMessage}>
          {isLogin ? 'Welcome Back!' : 'Create an Account'}
        </Text>

        {/* Email Input */}
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password Input */}
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.input}
          secureTextEntry
        />

        {/* Auth Button */}
        <Button
          mode="contained"
          onPress={handleAuth}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        >
          {isLogin ? 'Login' : 'Sign Up'}
        </Button>

        {/* Toggle between Login and Registration */}
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
    backgroundColor: '#f4f4f4',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    width: 250,
    height: 250,
    marginBottom: 20,
  },
  welcomeMessage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    marginTop: 10,
    paddingVertical: 5,
  },
  buttonLabel: {
    fontSize: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
  },
  toggleButton: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default App;
