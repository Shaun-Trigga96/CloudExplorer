// src/components/home/FeatureCard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';
import FeatureItem from './FeatureItem';

const FeatureCard: React.FC = () => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <Animated.View entering={FadeIn.duration(1200)} style={styles.cardWrapper}>
      <Card
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: isDarkMode ? 1 : 0,
          },
        ]}
      >
        <Card.Content>
          <Text variant="titleLarge" style={[styles.cardTitle, { color: colors.text }]}>
            Welcome to Cloud Explorer
          </Text>
          <Text variant="bodyLarge" style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Your journey to mastering Google Cloud Platform starts here
          </Text>
          <View style={styles.featuresContainer}>
            <FeatureItem icon="book-open-variant" text="Interactive Learning Modules" />
            <FeatureItem icon="checkbox-marked-circle-outline" text="Practice Quizzes" />
            <FeatureItem icon="certificate" text="Certification Prep" />
          </View>
        </Card.Content>
      </Card>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'System',
  },
  cardSubtitle: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 20,
    opacity: 0.8,
    fontFamily: 'System',
  },
  featuresContainer: {
    marginTop: 20,
    gap: 12,
  },
});

export default FeatureCard;