// src/components/community/EventCard.tsx
import React, {FC, useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import axios from 'axios';
import {CommunityEvent} from '../../types/community'; // Use updated type if needed
import {useCustomTheme} from '../../context/ThemeContext';
import {formatDate} from '../../utils/formatDate'; // Assumes you have date formatting


interface EventCardProps {
  event: CommunityEvent & {isRegistered?: boolean; isSaved?: boolean}; // Expect status from API
  userId: string | null; // Pass current user ID
  // Add onPress prop later for navigating to event details
}

const EventCard: FC<EventCardProps> = ({event, userId}) => {
  const {theme} = useCustomTheme();
  const {colors} = theme;

  // Internal state to manage button loading and optimistic updates
  const [isAttending, setIsAttending] = useState(event.isRegistered || false);
  const [isSavedState, setIsSavedState] = useState(event.isSaved || false);
  const [loadingAttend, setLoadingAttend] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);

  // --- Actions ---
  const handleAttendToggle = useCallback(async () => {
    if (!userId || loadingAttend) return;
    if (!event.id) {
      console.error('Event ID missing');
      return;
    }

    setLoadingAttend(true);
    const originalAttendState = isAttending;
    setIsAttending(!originalAttendState); // Optimistic update

    try {
      const action = originalAttendState ? 'unregister' : 'register';
      const url = `<span class="math-inline">\{BASE\_URL\}/api/v1/community/events/</span>{event.id}/${action}`;
      await axios.post(url, {userId}); // Backend verifies userId via token ideally
      // Success - state already updated optimistically
    } catch (error) {
      console.error(
        `Error ${originalAttendState ? 'un' : ''}registering event:`,
        error,
      );
      setIsAttending(originalAttendState); // Revert on error
      Alert.alert(
        'Error',
        `Could not ${originalAttendState ? 'un' : ''}register for the event.`,
      );
    } finally {
      setLoadingAttend(false);
    }
  }, [userId, event.id, isAttending, loadingAttend]);

  const handleSaveToggle = useCallback(async () => {
    if (!userId || loadingSave) return;
    if (!event.id) {
      console.error('Event ID missing');
      return;
    }

    setLoadingSave(true);
    const originalSaveState = isSavedState;
    setIsSavedState(!originalSaveState); // Optimistic update

    try {
      const action = originalSaveState ? 'unsave' : 'save';
      const url = `<span class="math-inline">\{BASE\_URL\}/api/v1/community/events/</span>{event.id}/${action}`;
      await axios.post(url, {userId});
      // Success
    } catch (error) {
      console.error(
        `Error ${originalSaveState ? 'un' : ''}saving event:`,
        error,
      );
      setIsSavedState(originalSaveState); // Revert on error
      Alert.alert(
        'Error',
        `Could not ${originalSaveState ? 'un' : ''}save the event.`,
      );
    } finally {
      setLoadingSave(false);
    }
  }, [userId, event.id, isSavedState, loadingSave]);

  // --- Rendering ---
  const isPastEvent = new Date(event.date) < new Date(); // Simple check

  // Render different card styles based on upcoming/past or details available
  if (!isPastEvent && event.description) {
    // Detailed Upcoming Event Card
    return (
      <View
        style={[
          styles.upcomingContainer,
          {backgroundColor: colors.primary, borderColor: colors.border},
        ]}>
        {/* Optional: Add Save button/icon */}
        <TouchableOpacity
          onPress={handleSaveToggle}
          style={styles.saveButton}
          disabled={loadingSave}>
          {loadingSave ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon
              name={isSavedState ? 'bookmark' : 'bookmark'}
              size={20}
              color={isSavedState ? colors.primary : colors.textSecondary}
            />
          )}
        </TouchableOpacity>

        <Text style={[styles.title, {color: colors.text}]}>{event.title}</Text>
        <View style={styles.dateTimeRow}>
          <Icon name="calendar" size={14} color={colors.textSecondary} />
          <Text style={[styles.detailText, {color: colors.textSecondary}]}>
            {formatDate(event.date)}
          </Text>
        </View>
        {event.time && (
          <View style={styles.dateTimeRow}>
            <Icon name="clock" size={14} color={colors.textSecondary} />
            <Text style={[styles.detailText, {color: colors.textSecondary}]}>
              {formatDate(event.time)}
            </Text>
          </View>
        )}
        <Text style={[styles.description, {color: colors.textSecondary}]}>
          {event.description}
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.attendeesText, {color: colors.textSecondary}]}>
            {event.attending || 0} attending
          </Text>
          <TouchableOpacity
            style={[
              styles.actionButton,
              isAttending
                ? {
                    backgroundColor: colors.background,
                    borderColor: colors.primary,
                    borderWidth: 1,
                  }
                : {backgroundColor: colors.primary},
            ]}
            onPress={handleAttendToggle}
            disabled={loadingAttend}>
            {loadingAttend ? (
              <ActivityIndicator
                size="small"
                color={isAttending ? colors.primary : colors.background}
              />
            ) : (
              <>
                <Icon
                  name={isAttending ? 'check-circle' : 'plus-circle'}
                  size={16}
                  color={isAttending ? colors.primary : colors.background}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    {color: isAttending ? colors.primary : colors.background},
                  ]}>
                  {isAttending ? 'Attending' : 'Attend'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  } else {
    // Simplified Card (Past or less detail)
    return (
      <TouchableOpacity
        style={[styles.pastContainer, {borderBottomColor: colors.border}]}>
        <TouchableOpacity
          onPress={handleSaveToggle}
          style={styles.saveIconPast}
          disabled={loadingSave}>
          {loadingSave ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon
              name={isSavedState ? 'bookmark' : 'bookmark'}
              size={18}
              color={isSavedState ? colors.primary : colors.textSecondary}
            />
          )}
        </TouchableOpacity>
        <View style={styles.pastDetails}>
          <Text
            style={[styles.pastTitle, {color: colors.text}]}
            numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.pastDate, {color: colors.textSecondary}]}>
            {formatDate(event.date)}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }
};

// --- Styles --- (Combine and adapt styles from previous versions)
const styles = StyleSheet.create({
  upcomingContainer: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  saveButton: {position: 'absolute', top: 10, right: 10, padding: 6, zIndex: 1},
  saveIconPast: {
    position: 'absolute',
    top: 16,
    right: 30,
    padding: 4,
    zIndex: 1,
  },
  title: {fontSize: 17, fontWeight: 'bold', marginBottom: 10, marginRight: 30},
  dateTimeRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 5},
  detailText: {marginLeft: 6, fontSize: 13},
  description: {fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 12},
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
  }, // Use theme border
  attendeesText: {fontSize: 13, color: '#555'}, // use theme textSecondary
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    minWidth: 100,
    height: 36,
  },
  actionButtonText: {marginLeft: 6, fontWeight: 'bold', fontSize: 13},
  pastContainer: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingRight: 10,
  },
  pastDetails: {flex: 1, marginRight: 35}, // Space for save icon and chevron
  pastTitle: {fontSize: 15, fontWeight: '500', marginBottom: 3},
  pastDate: {fontSize: 13},
});

export default EventCard;
