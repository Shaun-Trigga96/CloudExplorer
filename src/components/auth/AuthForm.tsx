// src/components/auth/AuthForm.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';

interface AuthFormProps {
  email: string;
  password: string;
  isLogin: boolean;
  loading: boolean;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  onSubmit: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  email,
  password,
  isLogin,
  loading,
  setEmail,
  setPassword,
  onSubmit,
}) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <View>
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        placeholderTextColor={colors.textSecondary}
        theme={{
          colors: {
            text: colors.text,
            placeholder: colors.textSecondary,
            background: colors.surface,
            onSurface: colors.text,
            onSurfaceVariant: colors.textSecondary,
          },
        }}
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        style={styles.input}
        secureTextEntry
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        placeholderTextColor={colors.textSecondary}
        theme={{
          colors: {
            text: colors.text,
            placeholder: colors.textSecondary,
            background: colors.surface,
            onSurface: colors.text,
            onSurfaceVariant: colors.textSecondary,
          },
        }}
      />
      <Button
        mode="contained"
        onPress={onSubmit}
        style={[styles.authButton, { backgroundColor: colors.primary }]}
        labelStyle={styles.buttonLabel}
        disabled={loading}
        loading={loading}
      >
        {loading ? (isLogin ? 'Logging in...' : 'Signing up...') : (isLogin ? 'Login' : 'Sign Up')}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    marginBottom: 15,
    borderRadius: 10,
  },
  authButton: {
    marginTop: 20,
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
});

export default AuthForm;