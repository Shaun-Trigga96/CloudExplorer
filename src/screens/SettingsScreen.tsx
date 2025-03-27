import React, {FC, useEffect, useState} from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text, Switch} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {FadeInUp, FadeInRight} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, {AxiosError} from 'axios';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import {useNavigation} from '@react-navigation/native';
import {StackNavigationProp} from '@react-navigation/stack';
import {RootStackParamList} from '../navigation/RootNavigator'; 
import {useTheme} from '../context/ThemeContext'; 
import {REACT_APP_BASE_URL} from '@env';

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
  const {isDarkMode, toggleDarkMode} = useTheme();
  const [userSettings, setUserSettings] = useState<UserSettings>({
    notificationsEnabled: false,
    darkMode: false,
    emailUpdates: false,
    syncData: false,
    soundEffects: false,
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch settings
  const fetchUserSettings = async () => {
    setLoading(true);
    try {
      const userId =
        auth().currentUser?.uid || (await AsyncStorage.getItem('userId'));
      if (!userId) throw new Error('User ID not found');

      const response = await axios.get(`${BASE_URL}/api/v1/users/{userId}/settings`);
      const settings = response.data.settings || {};
      setUserSettings({...userSettings, ...settings});
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error fetching settings:', error);
      try {
        const storedSettings = await AsyncStorage.getItem('userSettings');
        if (storedSettings) setUserSettings(JSON.parse(storedSettings));
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
    try {
      const userId =
        auth().currentUser?.uid || (await AsyncStorage.getItem('userId'));
      if (!userId) throw new Error('User ID not found');

      await axios.put(`${BASE_URL}/api/v1/users/{userId}/settings`, {
        settings: updatedSettings,
      });
      const newSettings = {...userSettings, ...updatedSettings};
      setUserSettings(newSettings);
      await AsyncStorage.setItem('userSettings', JSON.stringify(newSettings));

      if (
        updatedSettings.darkMode !== undefined &&
        updatedSettings.darkMode !== isDarkMode
      ) {
        toggleDarkMode();
      }
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
    }
  };

  // Handle notifications
  const handleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const token = await messaging().getToken();
      await messaging().subscribeToTopic('learning_reminders');
      console.log('Subscribed to notifications:', token);
    } else {
      await messaging().unsubscribeFromTopic('learning_reminders');
      console.log('Unsubscribed from notifications');
    }
  };

  // Handle email updates (placeholder)
  const handleEmailUpdates = async (enabled: boolean) => {
    console.log(enabled ? 'Email updates enabled' : 'Email updates disabled');
    // TODO: Integrate with backend email service (e.g., SendGrid)
  };

  // Handle sync data (placeholder)
  const handleSyncData = async (enabled: boolean) => {
    console.log(enabled ? 'Sync data enabled' : 'Sync data disabled');
    // TODO: Enable/disable Firestore real-time listeners
  };

  // Handle sound effects (placeholder)
  const handleSoundEffects = async (enabled: boolean) => {
    console.log(enabled ? 'Sound effects enabled' : 'Sound effects disabled');
    // TODO: Integrate react-native-sound
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await auth().signOut();
      await AsyncStorage.removeItem('userId');
      navigation.navigate('Auth');
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Logout Error', 'Failed to log out. Please try again.');
    }
  };

  // Error handling for Axios requests
  const handleAxiosError = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (!axiosError.response) {
        Alert.alert('Network Error', 'Could not connect to the server.');
      } else if (axiosError.response.status === 404) {
        Alert.alert('Not Found', 'User settings not found.');
      } else {
        Alert.alert(
          'Server Error',
          `Server error: ${axiosError.response.status}`,
        );
      }
    } else {
      Alert.alert('Unexpected Error', 'An unexpected error occurred.');
    }
  };

  // Initialize
  // Request notification permissions on mount
  useEffect(() => {
    const init = async () => {
      await messaging().requestPermission();
      await fetchUserSettings();
    };
    init();
  }, []);

  // Settings groups
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
            updateUserSettings({notificationsEnabled: value}),
        },
        {
          title: 'Dark Mode',
          description: 'Toggle dark theme',
          icon: 'theme-light-dark',
          iconColor: '#6A11CB',
          state: isDarkMode,
          setState: (value: boolean) => updateUserSettings({darkMode: value}),
        },
        {
          title: 'Email Updates',
          description: 'Receive progress reports and tips',
          icon: 'email-outline',
          iconColor: '#C850C0',
          state: userSettings.emailUpdates,
          setState: (value: boolean) =>
            updateUserSettings({emailUpdates: value}),
        },
        {
          title: 'Sync Data',
          description: 'Keep your progress in sync across devices',
          icon: 'sync',
          iconColor: '#3B7CD3',
          state: userSettings.syncData,
          setState: (value: boolean) => updateUserSettings({syncData: value}),
        },
        {
          title: 'Sound Effects',
          description: 'Enable sound feedback for interactions',
          icon: 'volume-high',
          iconColor: '#4F3DF5',
          state: userSettings.soundEffects,
          setState: (value: boolean) =>
            updateUserSettings({soundEffects: value}),
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
          onPress: () => navigation.navigate('DashboardScreen'),
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
          iconColor: '#FF5757',
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

  const SettingItem: FC<SettingItemProps> = ({item, index}) => (
    <Animated.View
      entering={FadeInRight.duration(400).delay(index * 100)}
      style={styles.settingItem}>
      <View style={styles.settingContent}>
        <View
          style={[styles.iconCircle, {backgroundColor: `${item.iconColor}15`}]}>
          <Icon name={item.icon} size={22} color={item.iconColor} />
        </View>
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.settingTitle,
              {color: isDarkMode ? '#FFF' : '#1A1A1A'},
            ]}>
            {item.title}
          </Text>
          <Text
            style={[
              styles.settingDescription,
              {color: isDarkMode ? '#A0A0A0' : '#666'},
            ]}>
            {item.description}
          </Text>
        </View>
      </View>
      {item.actionable ? (
        <TouchableOpacity style={styles.actionButton} onPress={item.onPress}>
          <Icon
            name="chevron-right"
            size={22}
            color={isDarkMode ? '#FFF' : '#A0A0A0'}
          />
        </TouchableOpacity>
      ) : (
        <Switch
          value={item.state}
          onValueChange={item.setState}
          color={item.iconColor}
        />
      )}
    </Animated.View>
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {backgroundColor: isDarkMode ? '#1A1A1A' : '#F6F8FF'},
      ]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}>
        <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
          <Text
            style={[
              styles.headerTitle,
              {color: isDarkMode ? '#FFF' : '#1A1A1A'},
            ]}>
            Settings
          </Text>
          <Text
            style={[
              styles.headerSubtitle,
              {color: isDarkMode ? '#A0A0A0' : '#666'},
            ]}>
            Customize your experience
          </Text>
        </Animated.View>
        {loading ? (
          <Text style={{color: isDarkMode ? '#FFF' : '#000'}}>Loading...</Text>
        ) : (
          settingsGroups.map((group, groupIndex) => (
            <Animated.View
              key={group.title}
              entering={FadeInUp.duration(600).delay(groupIndex * 200)}
              style={styles.sectionContainer}>
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

const styles = StyleSheet.create({
  safeArea: {flex: 1},
  container: {flex: 1},
  contentContainer: {padding: 16, paddingBottom: 30},
  header: {marginBottom: 24, paddingHorizontal: 4},
  headerTitle: {fontSize: 32, fontWeight: 'bold'},
  headerSubtitle: {fontSize: 16},
  sectionContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionContent: {paddingVertical: 8},
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingContent: {flexDirection: 'row', alignItems: 'center', flex: 1},
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {flex: 1},
  settingTitle: {fontSize: 16, fontWeight: '600'},
  settingDescription: {fontSize: 13},
  actionButton: {padding: 4},
});

export default SettingsScreen;
