import { Platform, StyleSheet } from 'react-native';

export const communityStyles = StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'android' ? 12 : 0,
      paddingBottom: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
    },
    notificationButton: {
      position: 'relative',
      padding: 4,
    },
    notificationBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 16,
      height: 16,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    notificationCount: {
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
    },
    topicsScroll: {
      maxHeight: 40,
      marginBottom: 16,
      paddingHorizontal: 16,
    },
    feedContainer: {
      paddingHorizontal: 16,
      paddingBottom: 80,
    },
    membersContainer: {
      paddingHorizontal: 16,
      paddingBottom: 80,
    },
    membersHeader: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 15,
    },
    eventsContent: {
      padding: 16,
      paddingBottom: 80,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      marginTop: 16,
      fontSize: 16,
      textAlign: 'center',
    },
    endListText: {
      textAlign: 'center',
      paddingVertical: 20,
      fontSize: 14,
    },
  });