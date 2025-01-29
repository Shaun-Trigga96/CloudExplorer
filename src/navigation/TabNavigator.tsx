import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// Import screens directly
import DashboardScreen from '../screens/DashboardScreen';
import ModulesScreen from '../screens/ModulesScreen';
import QuizzesScreen from '../screens/QuizzesScreen';
import ExamsScreen from '../screens/ExamsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName = 'alert';

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
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceDisabled,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 8,
          height: 60,
          paddingTop: 8,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Overview' }}
      />
      <Tab.Screen 
        name="Modules" 
        component={ModulesScreen}
        options={{ title: 'Learning' }}
      />
      <Tab.Screen 
        name="Quizzes" 
        component={QuizzesScreen}
        options={{ title: 'Practice' }}
      />
      <Tab.Screen 
        name="Exams" 
        component={ExamsScreen}
        options={{ title: 'Certify' }}
      />
      <Tab.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;