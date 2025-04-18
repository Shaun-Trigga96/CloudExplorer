// src/components/community/EventCard.tsx
import React, {FC, useState, useCallback} from 'react';
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
  Linking, // Import Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { Chip } from 'react-native-paper'; // Import Chip
import axios from 'axios';
import {REACT_APP_BASE_URL} from '@env';
import {CommunityEvent} from '../../types/community'; // Ensure this type includes platform and link
import {useCustomTheme} from '../../context/ThemeContext';
import {formatDate} from '../../utils/formatDate';
import {formatRelativeTime} from '../../utils/formatTime';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const BASE_URL = REACT_APP_BASE_URL;

interface EventCardProps {
  event: CommunityEvent & {isRegistered?: boolean; isSaved?: boolean};
  userId: string | null;
}

const EventCard: FC<EventCardProps> = ({event, userId}) => {
  const {theme} = useCustomTheme();
  const {colors} = theme;

  const [isAttending, setIsAttending] = useState(event.isRegistered || false);
  const [isSavedState, setIsSavedState] = useState(event.isSaved || false);
  const [loadingAttend, setLoadingAttend] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  // --- Actions (Attend/Save - Keep the logic) ---
  const handleAttendToggle = useCallback(async () => {
    if (!userId || loadingAttend || !event.id) return;
    setLoadingAttend(true);
    const originalAttendState = isAttending;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsAttending(!originalAttendState);
    try {
      const action = originalAttendState ? 'unregister' : 'register';
      const url = `${BASE_URL}/api/v1/community/events/${event.id}/${action}`;
      await axios.post(url, {userId});
    } catch (error) {
      const action = originalAttendState ? 'unregister' : 'register'; // Declare the action variable here
      console.error(`Error ${action}ing event:`, error);
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
    setIsSavedState(!originalSaveState);
    try {
      const action = originalSaveState ? 'unsave' : 'save';
      const url = `${BASE_URL}/api/v1/community/events/${event.id}/${action}`;
      await axios.post(url, {userId});
    } catch (error) {
      console.error(`Error ${"action"}ing event:`, error);
      setIsSavedState(originalSaveState);
      Alert.alert('Error', `Could not ${"action"} the event.`);
    } finally {
      setLoadingSave(false);
    }
  }, [userId, event.id, isSavedState, loadingSave]);

  // --- Open Link Action ---
  const handleOpenLink = useCallback(async () => {
    if (!event.link) return;
    const supported = await Linking.canOpenURL(event.link);
    if (supported) {
      await Linking.openURL(event.link);
    } else {
      Alert.alert('Error', `Cannot open this URL: ${event.link}`);
    }
  }, [event.link]);

  // --- Date Formatting ---
  const eventDate = new Date(event.date);
  const isPastEvent = eventDate < new Date();
  const day = eventDate.getDate();
  const month = eventDate.toLocaleString('default', {month: 'short'}).toUpperCase();

  // --- Render Logic ---
  if (isPastEvent) {
    // --- Past Event Card ---
    return (
      <View
        style={[
          styles.cardBase,
          styles.pastCard,
          {backgroundColor: colors.surface, borderColor: colors.border},
        ]}>
        <View style={styles.pastContent}>
          <View style={styles.pastDateBlock}>
            <Text style={styles.pastDateText}>{formatDate(event.date)}</Text>
          </View>
          <View style={styles.pastInfo}>
            <Text style={[styles.pastTitle, {color: colors.textSecondary}]}>
              {event.title}
            </Text>
            {/* Optionally show platform for past events */}
            <Text style={[styles.pastPlatform, {color: colors.textSecondary}]}>
              Platform: {event.platform || 'N/A'}
            </Text>
          </View>
        </View>
        {/* Simple link for past events */}
        {event.link && (
          <TouchableOpacity onPress={handleOpenLink} style={styles.pastLinkButton}>
             <Icon name="external-link" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
        <View style={styles.pastBadge}>
          <Text style={styles.pastBadgeText}>Past</Text>
        </View>
      </View>
    );
  } else {
    // --- Upcoming Event Card ---
    return (
      <View
        style={[
          styles.cardBase,
          styles.upcomingCard,
          {backgroundColor: colors.surface, borderColor: colors.border},
        ]}>
        <View style={styles.cardContentRow}>
          {/* Date Block */}
          <View style={[styles.dateBlock, {backgroundColor: colors.primary}]}>
            <Text style={styles.dateDay}>{day}</Text>
            <Text style={styles.dateMonth}>{month}</Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={[styles.title, {color: colors.text}]}>
              {event.title}
            </Text>
            {/* Platform Chip */}
            <Chip
              style={[styles.platformChip, {backgroundColor: colors.chipBackground}]}
              textStyle={[styles.platformChipText, {color: colors.primary}]}
              mode="flat">
              {event.platform || 'General'}
            </Chip>
            {/* Details */}
            <View style={styles.detailRow}>
              <Icon name="clock" size={14} color={colors.textSecondary} />
              <Text style={[styles.detailText, {color: colors.textSecondary}]}>
                {event.time ? formatRelativeTime(event.time) : 'Time TBD'}
              </Text>
            </View>
            {event.location && (
              <View style={styles.detailRow}>
                <Icon name="map-pin" size={14} color={colors.textSecondary} />
                <Text
                  style={[styles.detailText, {color: colors.textSecondary}]}
                  numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            )}
            {event.description && (
              <Text
                style={[styles.description, {color: colors.textSecondary}]}
                numberOfLines={2}>
                {event.description}
              </Text>
            )}
          </View>
        </View>

        {/* Footer Actions */}
        <View style={[styles.footer, {borderTopColor: colors.border}]}>
          {/* Left side: Attendees & View Link */}
          <View style={styles.footerLeft}>
            <View style={styles.attendeesContainer}>
              <Icon name="users" size={14} color={colors.textSecondary} />
              <Text style={[styles.attendeesText, {color: colors.textSecondary}]}>
                {event.attending || 0} attending
              </Text>
            </View>
            {/* View Event Link Button */}
            {event.link && (
              <TouchableOpacity
                style={styles.viewEventButton}
                onPress={handleOpenLink}>
                <Icon name="external-link" size={14} color={colors.primary} />
                <Text style={[styles.viewEventButtonText, {color: colors.primary}]}>
                  View Event
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Right side: Save & Attend Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSaveToggle}
              disabled={loadingSave}>
              {loadingSave ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Icon
                  name="bookmark"
                  size={20}
                  color={isSavedState ? colors.primary : colors.textSecondary}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.attendButton,
                isAttending
                  ? {backgroundColor: colors.primary, borderColor: colors.success, borderWidth: 1}
                  : {backgroundColor: colors.primary},
              ]}
              onPress={handleAttendToggle}
              disabled={loadingAttend}>
              {loadingAttend ? (
                <ActivityIndicator
                  size="small"
                  color={isAttending ? colors.success : colors.background}
                />
              ) : (
                <>
                  <Icon
                    name={isAttending ? 'check' : 'plus'}
                    size={16}
                    color={isAttending ? colors.success : colors.background}
                  />
                  <Text
                    style={[
                      styles.attendButtonText,
                      {color: isAttending ? colors.success : colors.background},
                    ]}>
                    {isAttending ? 'Attending' : 'Attend'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
};

// --- Styles --- (Includes additions for platform chip and link button)
const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  upcomingCard: {},
  pastCard: {
    opacity: 0.75,
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
    marginRight: 10, // Space before link/badge
  },
  pastDateBlock: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#e0e0e0',
    marginRight: 12,
  },
  pastDateText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  pastInfo: {
    flex: 1,
  },
  pastTitle: {
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
  },
  pastPlatform: {
    fontSize: 12,
    marginTop: 2,
  },
  pastLinkButton: {
    padding: 8, // Make touch target larger
    marginHorizontal: 8,
  },
  pastBadge: {
    backgroundColor: '#a0a0a0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 'auto', // Push to the far right if no link
  },
  pastBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContentRow: {
    flexDirection: 'row',
    padding: 16,
  },
  dateBlock: {
    width: 55,
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    padding: 4,
  },
  dateDay: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 24,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 12,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  platformChip: {
    alignSelf: 'flex-start', // Don't stretch chip
    height: 24,
    marginBottom: 8,
    justifyContent: 'center', // Center text vertically
  },
  platformChipText: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 14, // Adjust for vertical centering
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 13,
    flexShrink: 1,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
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
    flexDirection: 'column', // Stack attendees and link
    alignItems: 'flex-start',
    flexShrink: 1, // Allow shrinking
    marginRight: 10, // Space before action buttons
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4, // Space between attendees and link
  },
  attendeesText: {
    fontSize: 13,
    marginLeft: 6,
  },
  viewEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4, // Add padding for touch area
  },
  viewEventButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
  },
  attendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    minWidth: 90,
    height: 32,
  },
  attendButtonText: {
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 13,
  },
});

export default EventCard;
