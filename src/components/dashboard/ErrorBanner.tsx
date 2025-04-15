import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import { Button } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';
import { ErrorInfo } from '../../types/dashboard';

interface ErrorBannerProps {
  error: ErrorInfo;
  onRetry: () => void;
}

const ErrorBanner: FC<ErrorBannerProps> = ({ error, onRetry }) => {
  const { colors } = useCustomTheme().theme;

  const handleOpenIndexUrl = () => {
    if (error.indexUrl) Linking.openURL(error.indexUrl).catch(err => console.error('Failed to open URL:', err));
  };

  return (
    <Animated.View entering={FadeIn.duration(800)} style={[styles.container, { backgroundColor: colors.surface }]}>
      <Icon name="alert-circle" size={40} color={colors.error} style={styles.icon} />
      <Text style={[styles.message, { color: colors.text }]}>{error.message}</Text>
      {error.isIndexError && error.indexUrl && (
        <>
          <Text style={[styles.helpText, { color: colors.textSecondary }]}>
            This is a database configuration issue. An administrator needs to create an index.
          </Text>
          <TouchableOpacity style={[styles.indexButton, { backgroundColor: colors.primary }]} onPress={handleOpenIndexUrl}>
            <Text style={styles.indexButtonText}>Open Firebase Console</Text>
          </TouchableOpacity>
        </>
      )}
      <Button
        mode="contained"
        style={[styles.retryButton, { backgroundColor: colors.primary }]}
        labelStyle={{ color: '#FFFFFF' }}
        icon="refresh"
        onPress={onRetry}
      >
        Retry
      </Button>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 15,
    padding: 24,
    marginVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  icon: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '500',
  },
  helpText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  indexButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  indexButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  retryButton: {
    marginTop: 10,
    paddingHorizontal: 16,
  },
});

export default ErrorBanner;