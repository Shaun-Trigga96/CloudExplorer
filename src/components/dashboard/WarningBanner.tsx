import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import { useCustomTheme } from '../../context/ThemeContext';

interface WarningBannerProps {
  onRetry: () => void;
}

const WarningBanner: FC<WarningBannerProps> = ({ onRetry }) => {
  const { colors } = useCustomTheme().theme;

  return (
    <Animated.View entering={FadeIn.duration(800)} style={[styles.container, { backgroundColor: colors.warning }]}>
      <Icon name="alert-triangle" size={18} color="#fff" style={styles.icon} />
      <Text style={styles.message}>Some data couldn't be loaded.</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    marginRight: 8,
  },
  message: {
    color: '#fff',
    flex: 1,
    fontSize: 14,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default WarningBanner;