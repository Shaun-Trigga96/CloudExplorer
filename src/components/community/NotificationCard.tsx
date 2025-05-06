import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useCustomTheme } from '../../context/ThemeContext';

const NotificationCard: FC = () => {
  const { theme: { colors } } = useCustomTheme();

  return (
    <Animated.View entering={FadeIn.duration(500)} style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.iconContainer}>
        <Icon name="bell" size={24} color={colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>New Updates!</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          You have 3 new notifications: New event added, 2 new posts in your topics.
        </Text>
      </View>
      <TouchableOpacity style={styles.actionButton}>
        <Text style={[styles.actionText, { color: colors.primary }]}>View All</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F0FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
export default NotificationCard;