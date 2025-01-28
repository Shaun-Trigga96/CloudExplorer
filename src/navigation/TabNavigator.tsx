// TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import { RouteProp } from '@react-navigation/native';
import DashboardScreen from '../screens/DashboardScreen';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator();



type TabBarIconProps = {
  color: string;
  size: number;
  route: RouteProp<Record<string, object | undefined>, string>;
};

const TabNavigator = () => {
  const theme = useTheme();

  const renderTabBarIcon = ({ color, size, route }: TabBarIconProps) => {
    let iconName: string;

    switch (route.name) {
      case 'Dashboard':
        iconName = 'view-dashboard';
        break;
      case 'Modules':
        iconName = 'book-open-variant';
        break;
      case 'Quizzes':
        iconName = 'help-circle';
        break;
      case 'Exams':
        iconName = 'certificate';
        break;
      case 'Settings':
        iconName = 'cog';
        break;
      default:
        iconName = 'alert';
    }

    return <Icon name={iconName} size={size} color={color} />;
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => renderTabBarIcon({ color, size, route }),
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceDisabled,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 2, // Better spacing for labels
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 8,
          height: 60,  // Optimized for both iOS and Android
          paddingTop: 8,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Overview' }}  // More descriptive label
      />
      <Tab.Screen
        name="Modules"
        component={require('../screens/ModulesScreen').default}
        options={{ title: 'Learning' }}
      />
      <Tab.Screen
        name="Quizzes"
        component={require('../screens/QuizzesScreen').default}
        options={{ title: 'Practice' }}
      />
      <Tab.Screen 
        name="Exams"
        component={require('../screens/ExamsScreen').default}
        options={{ title: 'Certify' }}
      />
      <Tab.Screen
        name="Settings"
        component={require('../screens/SettingsScreen').default}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
