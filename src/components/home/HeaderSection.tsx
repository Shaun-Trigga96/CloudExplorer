// src/components/home/HeaderSection.tsx
import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';

const HeaderSection: React.FC = () => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Animated.View
      entering={FadeIn.duration(1000)}
      style={[styles.headerSection, { backgroundColor: colors.surface }]}
    >
      <Image
        source={require('../../assets/images/cloud_explorer.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text variant="displayMedium" style={[styles.title, { color: colors.text }]}>
        Cloud Explorer
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: 'System',
  },
});

export default HeaderSection;