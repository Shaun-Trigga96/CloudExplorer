import React, { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useCustomTheme } from '../../context/ThemeContext';

interface SectionCardProps {
  content: JSX.Element[];
  isRead: boolean;
  fadeAnim: any; // Use 'any' to match useSharedValue type
  innerRef: React.RefObject<View>;
}

const SectionCard: FC<SectionCardProps> = ({ content, isRead, fadeAnim, innerRef }) => {
  const { isDarkMode } = useCustomTheme();
  const { colors, cardStyle } = useCustomTheme().theme;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  return (
    <Animated.View
      ref={innerRef}
      style={[
        styles.container,
        cardStyle,
        animatedStyle,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        isRead ? [styles.readSection, { borderLeftColor: colors.success }] : {},
      ]}
    >
      {content}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  readSection: {
    borderLeftWidth: 4,
  },
});

export default SectionCard;