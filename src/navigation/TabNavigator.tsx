// c:\Users\thabi\Desktop\CloudExplorer\src\navigation\TabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme as usePaperTheme } from 'react-native-paper';
import { useCustomTheme } from '../context/ThemeContext'; // Import your custom hook
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StyleSheet } from 'react-native'; // Import StyleSheet

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
import CommunityScreen from '../screens/CommunityScreen'

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();

// --- Stack Navigators (No changes needed here) ---
function ModulesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ModulesScreen" component={ModulesScreen} />
      <Stack.Screen name="ModuleDetail" component={ModuleDetailScreen} />
    </Stack.Navigator>
  );
}

function QuizzesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="QuizzesScreen" component={QuizzesScreen} />
      <Stack.Screen name="QuizzesDetail" component={QuizzesDetailScreen} />
    </Stack.Navigator>
  );
}

function DashboardStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardScreen" component={DashboardScreen} />
    </Stack.Navigator>
  );
}

function ExamsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExamsScreen" component={ExamsScreen} />
    </Stack.Navigator>
  );
}

function CommunityStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommunityScreen" component={CommunityScreen} />
    </Stack.Navigator>
  );
}

function SettingsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} />
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="CertificationsScreen" component={CertificationsScreen} />
      <Stack.Screen name="CommunityScreen" component={CommunityScreen} />
      {/* Add other settings-related screens here */}
    </Stack.Navigator>
  );
}
// --- End Stack Navigators ---


const TabNavigator = () => {
  const theme = usePaperTheme(); // Use Paper's theme (now correctly provided by App.tsx)
  const { isDarkMode } = useCustomTheme(); // Use your custom hook to get the mode status

  type MD3Colors = {
    primary: string;
    onSurfaceDisabled: string;
    border: string; // Add 'border' property to the type definition
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // eslint-disable-next-line react/no-unstable-nested-components
        tabBarIcon: ({ color, size }) => {
          let iconName = 'alert'; // Default icon

          // Using outline icons for potential consistency
          switch (route.name) {
            case 'Dashboard':
              iconName = 'view-dashboard-outline';
              break;
            case 'Modules':
              iconName = 'book-open-variant'; // Keep filled if preferred
              break;
            case 'Quizzes':
              iconName = 'help-circle-outline';
              break;
            case 'Exams':
              iconName = 'certificate-outline';
              break;
            case 'Settings':
              iconName = 'cog-outline';
              break;
            case 'Community':
              iconName = 'account-group-outline'; // Use a more appropriate icon for community
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary, // Uses Paper theme primary
        tabBarInactiveTintColor: theme.colors.onSurfaceDisabled, // Uses Paper theme disabled color (ensure this key exists in your merged themes)
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 2,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.surface, // Uses Paper theme surface (adapts to dark/light)
          borderTopWidth: isDarkMode ? StyleSheet.hairlineWidth : 0, // Add subtle border ONLY in dark mode
          borderTopColor: (theme.colors as unknown as MD3Colors).border, // Use theme border color (ensure 'border' key exists)
          elevation: 8, // Keep elevation for Android shadow
          height: 60, // Adjust as needed
          paddingTop: 8, // Adjust as needed
          // Add shadow for iOS if needed (often handled by elevation on Android)
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -1 }, // Shadow upwards
          shadowOpacity: isDarkMode ? 0.3 : 0.1, // Adjust opacity for dark/light
          shadowRadius: 3,
        },
        headerShown: false, // Keep headers hidden as stacks manage them
      })}
    >
      {/* --- Tab Screens --- */}
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
        name="Community"
        component={CommunityStackNavigator}
        options={{ title: 'Community' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackNavigator}
        options={{ title: 'Settings' }}
      />

      {/* --- End Tab Screens --- */}
    </Tab.Navigator>
  );
};

export default TabNavigator;
