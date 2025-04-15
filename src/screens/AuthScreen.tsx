// src/screens/AuthScreen.tsx
import React from 'react';
import { Platform, KeyboardAvoidingView, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useCustomTheme } from '../context/ThemeContext';
import { darkColors, lightColors } from '../styles/colors';
import { useAuth } from '../components/hooks/useAuth';
import { authStyles } from '../styles/authStyles';
import AuthForm from '../components/auth/AuthForm';
import SocialAuthButton from '../components/auth/SocialAuthButton';
import ToggleAuthMode from '../components/auth/ToggleAuthMode';

type AuthScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;

interface AuthScreenProps {
  navigation: AuthScreenNavigationProp;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;
  const {
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
  } = useAuth(navigation);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[authStyles.container, { backgroundColor: colors.background }]}
    >
      <Animated.View
        entering={FadeIn.duration(1000)}
        style={[
          authStyles.content,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: isDarkMode ? 1 : 0,
          },
        ]}
      >
        <Image
          source={require('../assets/images/cloud_explorer.png')}
          style={authStyles.logo}
          resizeMode="contain"
        />
        <Text style={[authStyles.title, { color: colors.text }]}>
          {isLogin ? 'Login' : 'Sign Up'}
        </Text>
        <AuthForm
          email={email}
          password={password}
          isLogin={isLogin}
          loading={loading}
          setEmail={setEmail}
          setPassword={setPassword}
          onSubmit={handleEmailAuth}
        />
        <SocialAuthButton provider="google" onPress={handleGoogleSignIn} loading={loading} />
        {Platform.OS === 'ios' && (
          <SocialAuthButton provider="apple" onPress={handleAppleSignIn} loading={loading} />
        )}
        <ToggleAuthMode isLogin={isLogin} onToggle={() => setIsLogin(!isLogin)} disabled={loading} />
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

export default AuthScreen;