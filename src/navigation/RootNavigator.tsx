// c:\Users\thabi\Desktop\CloudExplorer\src\navigation\RootNavigator.tsx
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import TabNavigator from './TabNavigator';
import ModuleDetailScreen from '../screens/ModuleDetailScreen';
import QuizzesDetailScreen from '../screens/QuizzesDetailScreen';
import ExamDetailsScreen from '../screens/ExamDetailsScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import { useCustomTheme } from '../context/ThemeContext'; // Import theme hook

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  ModuleDetail: { moduleId: string };
  MainApp: { provider: string; path: string }; // <-- EXPECTS PARAMS!
  ModulesScreen: { provider: string; path: string }; // Direct access, likely within TabNavigator
  QuizzesScreen: { providerId: string; pathId: string }; // Pass context
  QuizzesDetail: {
    moduleId: string;
    providerId: string; // ADDED
    pathId: string;     // ADDED
    quizId?: string;    // Optional: Pass quizId if available/needed
  };
  ExamDetail: { examId: string; title: string; providerId: string; pathId: string }; // Pass context
  SettingsScreen: undefined; // Direct access, likely within TabNavigator
  CertificationsScreen: undefined; // Direct access, likely within TabNavigator
  ProfileScreen: undefined; // Direct access, likely within TabNavigator
  DashboardScreen: { provider: string; path: string }; // Direct access, likely within TabNavigator
  ExamsScreen: { providerId: string; pathId: string }; // Pass context
  CommunityScreen: undefined; // Direct access, likely within TabNavigator
  CreatePostScreen: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const { colors } = useCustomTheme().theme; // Get theme colors

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, 
      }}
    >
      {/* Screens accessible before/during authentication */}
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />

      {/* Main application screens, grouped under TabNavigator */}
      {/* The 'MainApp' route points to the TabNavigator component */}
      <Stack.Screen name="MainApp" component={TabNavigator} />

      {/* Detail Screens - These are pushed on top of the current stack (including tabs) */}
      <Stack.Screen
        name="ModulesScreen"
        component={TabNavigator}
        options={{ headerShown: true, title: 'Modules' }} // Example: Show header for detail screens
      />
      <Stack.Screen
        name="ModuleDetail"
        component={ModuleDetailScreen}
        options={{ headerShown: true, title: 'Module Details' }} // Example: Show header for detail screens
      />
      <Stack.Screen
        name="QuizzesDetail"
        component={QuizzesDetailScreen}
        options={{ headerShown: true, title: 'Quiz' }}
      />
      <Stack.Screen
        name="ExamDetail"
        component={ExamDetailsScreen}
        options={{ headerShown: true, title: 'Exam Practice' }}
      />
      <Stack.Screen
        name="CreatePostScreen"
        component={CreatePostScreen}
        options={{
          headerShown: true,
          title: 'Create Post',
          headerTitleAlign: 'center',
          // Use theme colors for the header
          headerTintColor: colors.background, // Color for title and back button
          headerStyle: {
            backgroundColor: colors.background, // Background color from theme
          },
          // Optionally customize back button behavior/appearance if needed
          headerBackTitleVisible: false,
        }}
      />

    </Stack.Navigator>
  );
}
export default RootNavigator;
