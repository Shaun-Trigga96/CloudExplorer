import React, { FC } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Switch } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const SettingsScreen = () => {
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [emailUpdates, setEmailUpdates] = React.useState(true);
  const [syncData, setSyncData] = React.useState(true);
  const [soundEffects, setSoundEffects] = React.useState(true);

  // Settings groups with vibrant colors
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
          state: notifications,
          setState: setNotifications,
        },
        {
          title: 'Dark Mode',
          description: 'Toggle dark theme',
          icon: 'theme-light-dark',
          iconColor: '#6A11CB',
          state: darkMode,
          setState: setDarkMode,
        },
        {
          title: 'Email Updates',
          description: 'Receive progress reports and tips',
          icon: 'email-outline',
          iconColor: '#C850C0',
          state: emailUpdates,
          setState: setEmailUpdates,
        },
        {
          title: 'Sync Data',
          description: 'Keep your progress in sync across devices',
          icon: 'sync',
          iconColor: '#3B7CD3',
          state: syncData,
          setState: setSyncData,
        },
        {
          title: 'Sound Effects',
          description: 'Enable sound feedback for interactions',
          icon: 'volume-high',
          iconColor: '#4F3DF5',
          state: soundEffects,
          setState: setSoundEffects,
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
          onPress: () => {},
          actionable: true,
        },
        {
          title: 'Learning Progress',
          description: 'View detailed learning statistics',
          icon: 'chart-line',
          iconColor: '#F09819',
          onPress: () => {},
          actionable: true,
        },
        {
          title: 'Certifications',
          description: 'Access your earned certificates',
          icon: 'certificate-outline',
          iconColor: '#FF9A5A',
          onPress: () => {},
          actionable: true,
        },
        {
          title: 'Sign Out',
          description: 'Log out of your account',
          icon: 'logout-variant',
          iconColor: '#FF5757',
          onPress: () => {},
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
  // eslint-disable-next-line react/no-unstable-nested-components
  const SettingItem: FC<SettingItemProps> = ({ item, index }) => {
    return (
      <Animated.View
        entering={FadeInRight.duration(400).delay(index * 100)}
        style={styles.settingItem}
      >
        <View style={styles.settingContent}>
          <View style={[styles.iconCircle, { backgroundColor: `${item.iconColor}15` }]}>
            <Icon name={item.icon} size={22} color={item.iconColor} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <Text style={styles.settingDescription}>{item.description}</Text>
          </View>
        </View>

        {item.actionable ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={item.onPress}
          >
            <Icon name="chevron-right" size={22} color="#A0A0A0" />
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
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your experience</Text>
        </Animated.View>

        {settingsGroups.map((group, groupIndex) => (
          <Animated.View
            key={group.title}
            entering={FadeInUp.duration(600).delay(groupIndex * 200)}
            style={styles.sectionContainer}
          >
            <LinearGradient
              colors={group.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sectionHeader}
            >
              <Icon name={group.icon} size={20} color="#FFFFFF" />
              <Text style={styles.sectionTitle}>{group.title}</Text>
            </LinearGradient>

            <View style={styles.sectionContent}>
              {group.items.map((item, index) => (
                <SettingItem
                  key={item.title}
                  item={item}
                  index={index}
                />
              ))}
            </View>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F8FF',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  sectionContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  sectionContent: {
    paddingVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666666',
  },
  actionButton: {
    padding: 4,
  },
});

export default SettingsScreen;
