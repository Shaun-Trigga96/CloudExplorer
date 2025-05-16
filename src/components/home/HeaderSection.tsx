// src/components/home/HeaderSection.tsx
import React from 'react';
import { Image, StyleSheet } from 'react-native';
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  headerSection: {
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  logo: {
    width: 190,
    height: 190,
    marginBottom: 12,
  },
});

export default HeaderSection;