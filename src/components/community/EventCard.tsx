import React, { FC, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Chip, Button } from 'react-native-paper';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import axios from 'axios';
import { REACT_APP_BASE_URL } from '@env';
import { CommunityEvent } from '../../types/community';
import { useCustomTheme } from '../../context/ThemeContext';
import { formatDate } from '../../utils/formatDate';
import { formatRelativeTime } from '../../utils/formatTime';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const BASE_URL = REACT_APP_BASE_URL;

interface EventCardProps {
  event: CommunityEvent & { isRegistered?: boolean; isSaved?: boolean };
  userId: string | null;
}

const EventCard: FC<EventCardProps> = ({ event, userId }) => {
  const { theme: { colors } } = useCustomTheme();
  const [isAttending, setIsAttending] = useState(event.isRegistered || false);
  const [isSavedState, setIsSavedState] = useState(event.isSaved || false);
  const [loadingAttend, setLoadingAttend] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  const handleAttendToggle = useCallback(async () => {
    if (!userId || loadingAttend || !event.id) return;
    setLoadingAttend(true);
    const originalAttendState = isAttending;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAttending(!originalAttendState);
    try {
      const action = originalAttendState ? 'unregister' : 'register';
      const url = `${BASE_URL}/api/v1/community/events/${event.id}/${action}`;
      await axios.post(url, { userId });
    } catch (error) {
      let action;
      try {
        action = originalAttendState ? 'unregister' : 'register';
        const url = `${BASE_URL}/api/v1/community/events/${event.id}/${action}`;
        await axios.post(url, { userId });
      } catch (error) {
        let action;
        try {
          action = originalAttendState ? 'unregister' : 'register';
          const url = `${BASE_URL}/api/v1/community/events/${event.id}/${action}`;
          await axios.post(url, { userId });
        } catch (error) {
          console.error(`Error ${action}ing event:`, error);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setIsAttending(originalAttendState);
          Alert.alert('Error', `Could not ${action} for the event.`);
        } finally {
          setLoadingAttend(false);
        }
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsAttending(originalAttendState);
        Alert.alert('Error', `Could not ${action} for the event.`);
      } finally {
        setLoadingAttend(false);
      }
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsAttending(originalAttendState);
      Alert.alert('Error', `Could not ${action} for the event.`);
    } finally {
      setLoadingAttend(false);
    }
  }, [userId, event.id, isAttending, loadingAttend]);

  const handleSaveToggle = useCallback(async () => {
    if (!userId || loadingSave || !event.id) return;
    setLoadingSave(true);
    const originalSaveState = isSavedState;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSavedState(!originalSaveState);
    try {
      const action = originalSaveState ? 'unsave' : 'save';
      const url = `${BASE_URL}/api/v1/community/events/${event.id}/${action}`;
      await axios.post(url, { userId });
    } catch (error) {
      let action;
      console.error(`Error ${action}ing event:`, error);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsSavedState(originalSaveState);
      Alert.alert('Error', `Could not ${action} the event.`);
    } finally {
      setLoadingSave(false);
    }
  }, [userId, event.id, isSavedState, loadingSave]);

  const handleOpenLink = useCallback(async () => {
    if (!event.link) return;
    const supported = await Linking.canOpenURL(event.link);
    if (supported) {
      await Linking.openURL(event.link);
    } else {
      Alert.alert('Error', `Cannot open this URL: ${event.link}`);
    }
  }, [event.link]);

  const eventDate = new Date(event.date);
  const isPastEvent = eventDate < new Date();
  const day = eventDate.getDate();
  const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();

  if (isPastEvent) {
    return (
      <Animated.View entering={FadeIn.duration(500)} style={[styles.cardBase, styles.pastCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.pastContent}>
          <View style={[styles.pastDateBlock, { backgroundColor: colors.textSecondary }]}>
            <Text style={styles.pastDateText}>{formatDate(event.date)}</Text>
          </View>
          <View style={styles.pastInfo}>
            <Text style={[styles.pastTitle, { color: colors.textSecondary }]}>{event.title}</Text>
            <Text style={[styles.pastPlatform, { color: colors.textSecondary }]}>Platform: {event.platform || 'N/A'}</Text>
          </View>
        </View>
        {event.link && (
          <TouchableOpacity onPress={handleOpenLink} style={styles.pastLinkButton}>
            <Icon name="external-link" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
        <View style={[styles.pastBadge, { backgroundColor: colors.textSecondary }]}>
          <Text style={styles.pastBadgeText}>Past</Text>
        </View>
      </Animated.View>
    );
  } else {
    return (
      <Animated.View entering={FadeIn.duration(500)} style={[styles.cardBase, styles.upcomingCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={styles.cardContentRow}>
          <View style={[styles.dateBlock, { backgroundColor: colors.primary }]}>
            <Text style={styles.dateDay}>{day}</Text>
            <Text style={styles.dateMonth}>{month}</Text>
          </View>
          <View style={styles.mainContent}>
            <Text style={[styles.title, { color: colors.text }]}>{event.title}</Text>
            <Chip
              style={[styles.platformChip, { backgroundColor: colors.chipBackground }]}
              textStyle={[styles.platformChipText, { color: colors.primary }]}
              mode="flat"
            >
              {event.platform || 'General'}
            </Chip>
            <View style={styles.detailRow}>
              <Icon name="clock" size={16} color={colors.textSecondary} />
              <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                {event.time ? formatRelativeTime(event.time) : 'Time TBD'}
              </Text>
            </View>
            {event.location && (
              <View style={styles.detailRow}>
                <Icon name="map-pin" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            )}
            {event.description && (
              <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
                {event.description}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <View style={styles.footerLeft}>
            <View style={styles.attendeesContainer}>
              <Icon name="users" size={16} color={colors.textSecondary} />
              <Text style={[styles.attendeesText, { color: colors.textSecondary }]}>
                {event.attending || 0} attending
              </Text>
            </View>
            {event.link && (
              <Animated.View entering={ZoomIn.duration(300)}>
                <Button
                  mode="text"
                  onPress={handleOpenLink}
                  style={styles.viewEventButton}
                  labelStyle={[styles.viewEventButtonText, { color: colors.primary }]}
                  icon="external-link"
                >
                  View Event
                </Button>
              </Animated.View>
            )}
          </View>
          <Animated.View style={styles.actionButtonsContainer}>
            <Animated.View entering={ZoomIn.duration(300)}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleSaveToggle}
                disabled={loadingSave}
              >
                {loadingSave ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Icon
                    name="bookmark"
                    size={22}
                    color={isSavedState ? colors.primary : colors.textSecondary}
                  />
                )}
              </TouchableOpacity>
            </Animated.View>
            <Animated.View entering={ZoomIn.duration(300).delay(100)}>
              <Button
                mode={isAttending ? 'contained' : 'outlined'}
                onPress={handleAttendToggle}
                disabled={loadingAttend}
                style={[styles.attendButton, isAttending && { borderColor: colors.success }]}
                labelStyle={[styles.attendButtonText, { color: isAttending ? colors.background : colors.primary }]}
                icon={isAttending ? 'check' : 'plus'}
                loading={loadingAttend}
              >
                {isAttending ? 'Attending' : 'Attend'}
              </Button>
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    );
  }
};

const styles = StyleSheet.create({
  cardBase: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  upcomingCard: {},
  pastCard: {
    opacity: 0.85,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pastContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  pastDateBlock: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  pastDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  pastInfo: {
    flex: 1,
  },
  pastTitle: {
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  pastPlatform: {
    fontSize: 13,
    marginTop: 4,
  },
  pastLinkButton: {
    padding: 10,
    marginHorizontal: 8,
  },
  pastBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  pastBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardContentRow: {
    flexDirection: 'row',
    padding: 16,
  },
  dateBlock: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 14,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  platformChip: {
    alignSelf: 'flex-start',
    height: 28,
    borderRadius: 14,
    marginBottom: 8,
    justifyContent: 'center',
  },
  platformChipText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flexShrink: 1,
    marginRight: 12,
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  attendeesText: {
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  viewEventButton: {
    paddingVertical: 4,
  },
  viewEventButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 10,
    marginRight: 8,
  },
  attendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 100,
    height: 36,
    justifyContent: 'center',
  },
  attendButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
});

export default EventCard;