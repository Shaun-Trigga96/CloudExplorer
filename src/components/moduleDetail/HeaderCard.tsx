import React, { FC } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useCustomTheme } from '../../context/ThemeContext';

interface HeaderCardProps {
  title: string;
  description: string;
  fadeAnim: any; // Use 'any' to match useSharedValue type
}

const HeaderCard: FC<HeaderCardProps> = ({ title, description, fadeAnim }) => {
  const { colors, cardStyle } = useCustomTheme().theme;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  return (
    <Animated.View style={[styles.container, cardStyle, animatedStyle, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 10,
    fontFamily: 'System',
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'System',
  },
});

export default HeaderCard;