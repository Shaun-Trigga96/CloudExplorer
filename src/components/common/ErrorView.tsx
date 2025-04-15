// src/components/common/ErrorView.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
  troubleshooting?: string[];
}

export const ErrorView: React.FC<ErrorViewProps> = ({ message, onRetry }) => {
  const { colors } = useCustomTheme().theme;
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.text, { color: colors.error }]}>{message}</Text>
      {onRetry && (
        <Button
          mode="contained"
          onPress={onRetry}
          style={{ backgroundColor: colors.primary }}
          labelStyle={{ color: colors.buttonText }}
        >
          Retry
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  text: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
  },
});