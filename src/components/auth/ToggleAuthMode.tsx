// src/components/auth/ToggleAuthMode.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';

interface ToggleAuthModeProps {
  isLogin: boolean;
  onToggle: () => void;
  disabled: boolean;
}

const ToggleAuthMode: React.FC<ToggleAuthModeProps> = ({ isLogin, onToggle, disabled }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <View style={styles.toggleContainer}>
      <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
      </Text>
      <Button
        mode="text"
        onPress={onToggle}
        labelStyle={[styles.toggleButton, { color: colors.primary }]}
        disabled={disabled}
      >
        {isLogin ? 'Sign Up' : 'Login'}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'System',
  },
  toggleButton: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
    marginLeft: -4,
  },
});

export default ToggleAuthMode;