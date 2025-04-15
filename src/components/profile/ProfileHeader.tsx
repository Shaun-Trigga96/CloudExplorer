// src/components/profile/ProfileHeader.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';

const ProfileHeader: React.FC = () => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
      <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
        Manage your profile information
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 17,
  },
});

export default ProfileHeader;