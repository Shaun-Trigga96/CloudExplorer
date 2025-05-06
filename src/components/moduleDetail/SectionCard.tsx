import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { useCustomTheme } from '../../context/ThemeContext';

interface SectionCardProps {
  title?: string;
  content: JSX.Element[];
  isRead: boolean;
  fadeAnim: SharedValue<number>;
  innerRef: React.RefObject<View>;
  onNavigateToQuiz: (quizId: string, moduleId: string) => void;
  moduleId: string;
}

const SectionCard: React.FC<SectionCardProps> = ({ 
  title,
  content, 
  isRead, 
  fadeAnim,
  innerRef,
  moduleId,
  onNavigateToQuiz, // We still keep this prop but it's handled in preprocessMarkdownWithIcons
}) => {
  const { colors } = useCustomTheme().theme;

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
      transform: [{ translateY: (1 - fadeAnim.value) * 20 }]
    };
  });

  return (
    <Animated.View style={[
      styles.card, 
      { backgroundColor: colors.background },
      animatedStyle
    ]}>
      {/* Read indicator */}
      <View style={[
        styles.readIndicator, 
        { backgroundColor: isRead ? colors.success : colors.disabled }
      ]} />


      {/* Content section - THIS VIEW GETS THE REF */}
      <View ref={innerRef} style={styles.contentContainer}>
        {/* Render the content elements - link handling is already set in preprocessMarkdownWithIcons */}
        {content}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  readIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    margin: 12,
    zIndex: 1,
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 8,
  },
});

export default SectionCard;
