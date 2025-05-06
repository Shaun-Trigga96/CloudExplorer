import React, { FC, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator, // Import ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Switch } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import { REACT_APP_BASE_URL } from '@env';
import Sound from 'react-native-sound'; // Import react-native-sound
import { darkColors, lightColors } from '../styles/colors';

const BASE_URL = REACT_APP_BASE_URL;

interface UserSettings {
  notificationsEnabled: boolean;
  darkMode: boolean;
  emailUpdates: boolean;
  syncData: boolean;
  soundEffects: boolean;
}

type SettingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'SettingsScreen'
>;


const SettingsScreen: FC = () => {
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const { isDarkMode, toggleDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors; // Use theme colors
  const [userSettings, setUserSettings] = useState<UserSettings>({
    notificationsEnabled: false,
    darkMode: isDarkMode, // Initialize with theme context
    emailUpdates: false,
    syncData: false,
    soundEffects: false,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [sound, setSound] = useState<Sound | null>(null);

  // Fetch settings
  const fetchUserSettings = async () => {
    setLoading(true);
    try {
      const userId =
        auth().currentUser?.uid || (await AsyncStorage.getItem('userId'));
      if (!userId) throw new Error('User ID not found');

      const response = await axios.get(`${BASE_URL}/api/v1/users/${userId}/settings`);
      console.log('User Settings Response:', response)
      const settingsFromServer = response.data.settings || {};

      // Combine server settings with current theme state for dark mode
      const combinedSettings = {
        ...userSettings, // Start with default/current state
        ...settingsFromServer, // Override with server settings
        darkMode: isDarkMode, // Ensure dark mode reflects the app's theme context initially
      };

      setUserSettings(combinedSettings);
      await AsyncStorage.setItem('userSettings', JSON.stringify(combinedSettings));

      // Sync theme context if server setting differs (and it's the first load)
      if (settingsFromServer.darkMode !== undefined && settingsFromServer.darkMode !== isDarkMode) {
        toggleDarkMode(); // This will trigger a re-render with the correct colors object
      }

    } catch (error) {
      console.error('Error fetching settings:', error);
      try {
        const storedSettings = await AsyncStorage.getItem('userSettings');
        if (storedSettings) {
          const parsedStored = JSON.parse(storedSettings);
          // Ensure stored dark mode matches theme context on load failure
          setUserSettings({ ...parsedStored, darkMode: isDarkMode });
        } else {
          // Fallback to defaults if nothing stored, respecting theme context
          setUserSettings(prev => ({ ...prev, darkMode: isDarkMode }));
        }
      } catch (asyncError) {
        console.error('Error loading from AsyncStorage:', asyncError);
      }
      handleAxiosError(error);
    } finally {
      setLoading(false);
    }
  };

  // Update settings
  const updateUserSettings = async (updatedSettings: Partial<UserSettings>) => {
    // Optimistically update local state for better UX
    const newSettings = { ...userSettings, ...updatedSettings };
    setUserSettings(newSettings);

    // Handle dark mode toggle immediately
    if (
      updatedSettings.darkMode !== undefined &&
      updatedSettings.darkMode !== isDarkMode
    ) {
      toggleDarkMode(); // This updates the theme context
    }

    try {
      const userId =
        auth().currentUser?.uid || (await AsyncStorage.getItem('userId'));
      if (!userId) throw new Error('User ID not found');

      // Send update to backend
      await axios.put(`${BASE_URL}/api/v1/users/${userId}/settings`, {
        settings: updatedSettings,
      });

      // Save confirmed settings to AsyncStorage
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));

      // Trigger side effects after successful backend update
      if (updatedSettings.notificationsEnabled !== undefined) {
        await handleNotifications(updatedSettings.notificationsEnabled);
      }
      if (updatedSettings.emailUpdates !== undefined) {
        await handleEmailUpdates(updatedSettings.emailUpdates);
      }
      if (updatedSettings.syncData !== undefined) {
        await handleSyncData(updatedSettings.syncData);
      }
      if (updatedSettings.soundEffects !== undefined) {
        await handleSoundEffects(updatedSettings.soundEffects);
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      handleAxiosError(error);
      // Revert optimistic update on error
      fetchUserSettings(); // Refetch to get the last known good state
    }
  };

  // Handle notifications
  const handleNotifications = async (enabled: boolean) => {
    try {
      if (enabled) {
        await messaging().requestPermission(); // Ensure permission is granted
        const token = await messaging().getToken();
        await messaging().subscribeToTopic('learning_reminders');
        console.log('Subscribed to notifications:', token);
      } else {
        await messaging().unsubscribeFromTopic('learning_reminders');
        console.log('Unsubscribed from notifications');
      }
    } catch (permError) {
      console.error("Notification permission or subscription error:", permError);
      Alert.alert("Notification Error", "Could not update notification settings. Please check app permissions.");
      // Revert the switch state if permission fails
      setUserSettings(prev => ({ ...prev, notificationsEnabled: !enabled }));
    }
  };

  // Handle email updates
  const handleEmailUpdates = async (enabled: boolean) => {
    console.log(enabled ? 'Email updates enabled' : 'Email updates disabled');
    try {
      const userId = auth().currentUser?.uid || await AsyncStorage.getItem('userId');
      if (!userId) {
        console.error('No user ID found for email update.');
        return;
      }
      const response = await axios.post(`${BASE_URL}/api/v1/email/update-subscription`, {
        userId, // Send userId in the request body
        enabled,
      });
      console.log('Email update response:', response.data);
    } catch (error) {
      console.error('Error updating email subscription:', error);
      handleAxiosError(error);
      // Revert UI on error
      setUserSettings(prev => ({ ...prev, emailUpdates: !enabled }));
    }
  };

  // Handle sync data
  const handleSyncData = async (enabled: boolean) => {
    console.log(enabled ? 'Sync data enabled' : 'Sync data disabled');
    // TODO: Implement Firestore real-time listeners logic here
    // This is a placeholder for future implementation
    if (enabled) {
      // Start listening for changes in Firestore
      console.log('Starting Firestore real-time listeners...');
    } else {
      // Stop listening for changes in Firestore
      console.log('Stopping Firestore real-time listeners...');
    }
    // Note: No backend call needed here unless sync itself needs server confirmation
  };

  // Handle sound effects
  const handleSoundEffects = async (enabled: boolean) => {
    console.log(enabled ? 'Sound effects enabled' : 'Sound effects disabled');
    if (enabled) {
      // Load and play a sound
      const newSound = new Sound('click.mp3', Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.error('Failed to load the sound "click.mp3":', error);
          // Revert UI if sound fails to load
          Alert.alert(
            'Sound Error',
            'Could not load sound effect (click.mp3). Please ensure the file is correctly placed in the app assets and rebuild the app.'
          ); setUserSettings(prev => ({ ...prev, soundEffects: false }));
          return;
        }
        // Play the sound with an onEnd callback
        newSound.play((success) => {
          if (success) {
            console.log('successfully finished playing');
          } else {
            console.log('playback failed due to audio decoding errors');
          }
          // Optionally release immediately after playing for short effects
          newSound.release();
        });
      });
      // Release previous sound if exists
      if (sound) {
        sound.release();
      }
      setSound(newSound);
    } else {
      // Release the sound
      if (sound) {
        sound.release();
        setSound(null);
      }
    }
    // Note: No backend call needed here unless sound preference needs server storage
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await auth().signOut();
              await AsyncStorage.clear(); // Clear all async storage on logout
              // Navigate to Auth screen, resetting the stack
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            } catch (error) {
              console.error('Logout failed:', error);
              Alert.alert('Logout Error', 'Failed to log out. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Error handling for Axios requests
  const handleAxiosError = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (!axiosError.response) {
        Alert.alert('Network Error', 'Could not connect to the server.');
      } else if (axiosError.response.status === 404) {
        Alert.alert('Not Found', 'User settings not found on the server. Using local settings.');
      } else if (axiosError.response.status === 401) {
        Alert.alert('Unauthorized', 'Authentication error. Please log in again.');
        // Optionally trigger logout here
      } else {
        const errorData = axiosError.response.data as any; // Type assertion
        const message = errorData?.message || errorData?.error || 'Unknown server error';
        Alert.alert(
          'Server Error',
          `Code: ${axiosError.response.status}. ${message}`
        );
      }
    } else {
      Alert.alert('Unexpected Error', `An unexpected error occurred: ${(error as Error)?.message || 'Unknown'}`);
    }
  };

  // Initialize: Fetch settings on mount
  useEffect(() => {
    fetchUserSettings();
    // Cleanup sound on unmount
    return () => {
      if (sound) {
        sound.release();
      }
    };
  }, []); // Run only once on mount

  // Re-fetch settings if isDarkMode changes externally (e.g., system theme change)
  // This might be redundant if toggleDarkMode already handles state correctly
  useEffect(() => {
    fetchUserSettings();
  }, [isDarkMode]);


  // Settings groups definition (remains the same)
  const settingsGroups = [
    {
      title: 'App Settings',
      icon: 'cog-outline',
      gradient: ['#4158D0', '#C850C0'],
      items: [
        {
          title: 'Push Notifications',
          description: 'Receive learning reminders and updates',
          icon: 'bell',
          iconColor: '#4158D0',
          state: userSettings.notificationsEnabled,
          setState: (value: boolean) =>
            updateUserSettings({ notificationsEnabled: value }),
        },
        {
          title: 'Dark Mode',
          description: 'Toggle dark theme',
          icon: 'theme-light-dark',
          iconColor: '#6A11CB',
          state: isDarkMode, // Use isDarkMode from context for the Switch state
          setState: (value: boolean) => updateUserSettings({ darkMode: value }),
        },
        {
          title: 'Email Updates',
          description: 'Receive progress reports and tips',
          icon: 'email-outline',
          iconColor: '#C850C0',
          state: userSettings.emailUpdates,
          setState: (value: boolean) =>
            updateUserSettings({ emailUpdates: value }),
        },
        {
          title: 'Sync Data',
          description: 'Keep your progress in sync across devices',
          icon: 'sync',
          iconColor: '#3B7CD3',
          state: userSettings.syncData,
          setState: (value: boolean) => updateUserSettings({ syncData: value }),
        },
        {
          title: 'Sound Effects',
          description: 'Enable sound feedback for interactions',
          icon: 'volume-high',
          iconColor: '#4F3DF5',
          state: userSettings.soundEffects,
          setState: (value: boolean) =>
            updateUserSettings({ soundEffects: value }),
        },
      ],
    },
    {
      title: 'Account',
      icon: 'account-circle-outline',
      gradient: ['#FF512F', '#F09819'],
      items: [
        {
          title: 'Profile',
          description: 'Manage your profile and preferences',
          icon: 'account-cog-outline',
          iconColor: '#FF512F',
          onPress: () => navigation.navigate('ProfileScreen'),
          actionable: true,
        },
        {
          title: 'Learning Progress',
          description: 'View detailed learning statistics',
          icon: 'chart-line',
          iconColor: '#F09819',
          onPress: () => navigation.navigate('DashboardScreen', {
            provider: '',
            path: '',
          }),
          actionable: true,
        },
        {
          title: 'Certifications',
          description: 'Access your earned certificates',
          icon: 'certificate-outline',
          iconColor: '#FF9A5A',
          onPress: () => navigation.navigate('CertificationsScreen'),
          actionable: true,
        },
        {
          title: 'Sign Out',
          description: 'Log out of your account',
          icon: 'logout-variant',
          iconColor: colors.error, // Use theme error color
          onPress: handleLogout,
          actionable: true,
        },
      ],
    },
  ];

  interface SettingItemProps {
    item: {
      title: string;
      description: string;
      icon: string;
      iconColor: string;
      state?: boolean;
      setState?: (value: boolean) => void;
      onPress?: () => void;
      actionable?: boolean;
    };
    index: number;
  }

  // SettingItem Component using theme colors
  const SettingItem: FC<SettingItemProps> = ({ item, index }) => (
    <Animated.View
      entering={FadeInRight.duration(400).delay(index * 100)}
      // Apply border color from theme
      style={[styles.settingItem, { borderBottomColor: colors.border }]}>
      <View style={styles.settingContent}>
        <View
          style={[styles.iconCircle, { backgroundColor: `${item.iconColor}1A` }]}>
          {/* Use item.iconColor for the icon itself */}
          <Icon name={item.icon} size={22} color={item.iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.settingTitle,
              { color: colors.text }, // Use theme text color
            ]}>
            {item.title}
          </Text>
          <Text
            style={[
              styles.settingDescription,
              { color: colors.textSecondary }, // Use theme secondary text color
            ]}>
            {item.description}
          </Text>
        </View>
      </View>
      {item.actionable ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={item.onPress}
          // Add accessibility role for better screen reader support
          accessibilityRole="button"
          accessibilityLabel={item.title}
        >
          <Icon
            name="chevron-right"
            size={24} // Slightly larger chevron
            color={colors.textSecondary} // Use theme secondary text color
          />
        </TouchableOpacity>
      ) : (
        <Switch
          value={item.state}
          onValueChange={item.setState}
          color={colors.primary} // Use theme primary color for the switch active state
          // Ensure track color contrasts in both modes
          trackColor={{ false: colors.border, true: `${colors.primary}80` }} // Semi-transparent primary when true
          // Add accessibility role
          accessibilityRole="switch"
          accessibilityLabel={item.title}
          accessibilityState={{ checked: item.state }}
        />
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false} // Hide scrollbar
      >
        <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.text }, // Use theme text color
            ]}>
            Settings
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              { color: colors.textSecondary }, // Use theme secondary text color
            ]}>
            Customize your experience
          </Text>
        </Animated.View>
        {loading ? (
          // Use ActivityIndicator for loading state
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Settings...</Text>
          </View>
        ) : (
          settingsGroups.map((group, groupIndex) => (
            <Animated.View
              key={group.title}
              entering={FadeInUp.duration(600).delay(groupIndex * 150)} // Slightly faster delay
              // Apply background, border from theme
              style={[
                styles.sectionContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: isDarkMode ? 1 : 0, // Add border in dark mode
                }
              ]}>
              <View style={styles.sectionContent}>
                {group.items.map((item, index) => (
                  <SettingItem key={item.title} item={item} index={index} />
                ))}
              </View>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Updated Styles using theme colors where applicable
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 }, // Increased padding
  header: { marginBottom: 32, paddingHorizontal: 0 }, // Removed horizontal padding here
  headerTitle: { fontSize: 34, fontWeight: 'bold', marginBottom: 4 }, // Larger title
  headerSubtitle: { fontSize: 17 }, // Larger subtitle
  sectionContainer: {
    marginBottom: 24,
    borderRadius: 18, // More rounded corners like ProfileScreen
    overflow: 'hidden',
    // Shadows for light mode (subtle)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8, // Keep elevation for Android
  },
  sectionContent: { paddingVertical: 8 }, // Reduced vertical padding inside card
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14, // Adjusted padding
    paddingHorizontal: 20, // Increased horizontal padding
    borderBottomWidth: 1,
    // borderBottomColor is now applied dynamically inline
  },
  settingContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: { flex: 1, marginRight: 8 }, // Added margin to prevent text touching switch/chevron
  settingTitle: { fontSize: 17, fontWeight: '500' }, // Adjusted font size/weight
  settingDescription: { fontSize: 14, marginTop: 2 }, // Adjusted font size
  actionButton: { padding: 8 }, // Increased touch area for chevron
  loadingContainer: { // Style for loading indicator
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default SettingsScreen;
