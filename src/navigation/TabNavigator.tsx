import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack'; // Import createStackNavigator
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// Import screens directly
import DashboardScreen from '../screens/DashboardScreen';
import ModulesScreen from '../screens/ModulesScreen';
import QuizzesScreen from '../screens/QuizzesScreen';
import ExamsScreen from '../screens/ExamsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ModuleDetailScreen from '../screens/ModuleDetailScreen';
import { RootStackParamList } from './RootNavigator';
import QuizzesDetailScreen from '../screens/QuizzesDetailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CertificationsScreen from '../screens/CertificationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>(); // Create a StackNavigator

// Create a Stack Navigator for Modules
function ModulesStackNavigator() {
  return (
    <Stack.Navigator
        screenOptions={{
        headerShown: false,
        }}
    >
      <Stack.Screen name="ModulesScreen" component={ModulesScreen} />
      <Stack.Screen name="ModuleDetail" component={ModuleDetailScreen} />
    </Stack.Navigator>
  );
}

// Create a Stack Navigator for Quizzes
function QuizzesStackNavigator() {
  return (
    <Stack.Navigator
        screenOptions={{
        headerShown: false,
        }}
    >
      <Stack.Screen name="QuizzesScreen" component={QuizzesScreen} />
      <Stack.Screen name="QuizzesDetail" component={QuizzesDetailScreen} />
    </Stack.Navigator>
  );
}

// Create a Stack Navigator for Dashboard
function DashboardStackNavigator() {
  return (
    <Stack.Navigator
        screenOptions={{
        headerShown: false,
        }}
    >
      <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
    </Stack.Navigator>
  );
}
// Create a Stack Navigator for Exams
function ExamsStackNavigator() {
  return (
    <Stack.Navigator
        screenOptions={{
        headerShown: false,
        }}
    >
      <Stack.Screen name="ExamsScreen" component={ExamsScreen} />
    </Stack.Navigator>
  );
}

// Create a Stack Navigator for Settings
function SettingsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="CertificationsScreen" component={CertificationsScreen} />
    </Stack.Navigator>
  );
}
const TabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // eslint-disable-next-line react/no-unstable-nested-components
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
        component={DashboardStackNavigator}
        options={{ title: 'Overview' }}
      />
      <Tab.Screen
        name="Modules"
        component={ModulesStackNavigator}
        options={{ title: 'Learning' }}
      />
      <Tab.Screen
        name="Quizzes"
        component={QuizzesStackNavigator}
        options={{ title: 'Practice' }}
      />
      <Tab.Screen
        name="Exams"
        component={ExamsStackNavigator}
        options={{ title: 'Certify' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
