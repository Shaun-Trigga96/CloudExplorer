import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Button, Chip } from 'react-native-paper';
import Icon from 'react-native-vector-icons/Feather';
import { useCustomTheme } from '../../context/ThemeContext';

interface Event {
  id: number;
  title: string;
  date: string;
  isUpcoming?: boolean;
  time?: string;
  description?: string;
  attending?: number;
  interested?: number;
  speakers?: number;
  daysLeft?: number;
}

interface EventCardProps {
  event: Event;
  index?: number;
}

const EventCard: FC<EventCardProps> = ({ event, index = 0 }) => {
  const { isDarkMode } = useCustomTheme();
  const { colors, cardStyle } = useCustomTheme().theme;

  if (event.isUpcoming) {
    return (
      <Animated.View entering={FadeIn.duration(800)} style={[styles.upcomingCard, cardStyle, { backgroundColor: colors.surface }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.upcomingLabel, { color: colors.primary }]}>UPCOMING EVENT</Text>
          <Chip style={{ backgroundColor: colors.warning }} textStyle={{ color: '#333' }}>
            {event.daysLeft} day{event.daysLeft !== 1 ? 's' : ''} left
          </Chip>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
        <View style={styles.timeRow}>
          <Icon name="calendar" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>{event.time}</Text>
        </View>
        <Text style={[styles.description, { color: colors.text }]}>{event.description}</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{event.attending}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Attending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{event.interested}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Interested</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{event.speakers}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Speakers</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Button mode="contained" style={[styles.registerButton, { backgroundColor: colors.primary }]} labelStyle={{ color: colors.background }}>
            Register Now
          </Button>
          <Button mode="outlined" style={[styles.saveButton, { borderColor: colors.primary }]} labelStyle={{ color: colors.primary }}>
            Save for Later
          </Button>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(500).delay(300 + index * 100)} style={[styles.pastCard, cardStyle, { backgroundColor: colors.surface }]}>
      <View style={styles.pastHeader}>
        <Text style={[styles.pastTitle, { color: colors.text }]}>{event.title}</Text>
        <Chip style={{ backgroundColor: colors.chipBackground }} textStyle={{ color: colors.textSecondary }}>
          Recording Available
        </Chip>
      </View>
      <View style={styles.timeRow}>
        <Icon name="calendar" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
        <Text style={[styles.pastDate, { color: colors.textSecondary }]}>{event.date}</Text>
      </View>
      <TouchableOpacity style={styles.viewRecordingButton}>
        <Text style={[styles.viewRecordingText, { color: colors.primary }]}>View Recording</Text>
        <Icon name="chevron-right" size={16} color={colors.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  upcomingCard: {
    padding: 16,
    marginBottom: 24,
  },
  pastCard: {
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  upcomingLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 26,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeText: {
    fontSize: 14,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#000',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  registerButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  pastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pastTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  pastDate: {
    fontSize: 14,
  },
  viewRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  viewRecordingText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
});

export default EventCard;