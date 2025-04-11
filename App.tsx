// c:\Users\thabi\Desktop\CloudExplorer\App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  Provider as PaperProvider,
  MD3LightTheme, // Or MD2LightTheme if you prefer Material Design 2
  MD3DarkTheme,  // Or MD2DarkTheme
  // adaptNavigationTheme, // Optional: For deeper React Navigation theme integration
} from 'react-native-paper';
import RootNavigator from './src/navigation/RootNavigator';
import { ThemeProvider as CustomThemeProvider, useTheme as useCustomTheme } from './src/context/ThemeContext'; // Adjust path if needed

// --- Define Your Custom Colors (Centralized) ---
// It's best practice to define these once, e.g., in a theme file or here
const lightColors = {
  background: '#F0F2F5',
  surface: '#FFFFFF',
  primary: '#007AFF',
  text: '#1C1C1E',
  textSecondary: '#6E6E73',
  border: '#D1D1D6',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FFC107',
  buttonSecondaryBackground: '#E5E5EA',
  buttonPrimaryBackground: '#007AFF',
  buttonCompletedBackground: '#34C759',
  buttonText: '#FFFFFF',
  progressBarBackground: '#e0e0e0',
  examDetailBackground: '#f9f9f9',
  progressBackground: '#e3f2fd',
  // Ensure colors used by Paper components are defined
  onSurface: '#1C1C1E', // Usually same as text for light theme
  onSurfaceVariant: '#6E6E73', // Usually same as textSecondary
  onSurfaceDisabled: '#A0A0A0', // A grey color for disabled elements
  outline: '#D1D1D6', // Usually same as border
  // Add other Paper color keys if needed (e.g., secondary, tertiary, etc.)
};

const darkColors = {
  background: '#000000',
  surface: '#1C1C1E',
  primary: '#0A84FF',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#3A3A3C',
  error: '#FF453A',
  success: '#32D74B',
  warning: '#FFD60A',
  buttonSecondaryBackground: '#2C2C2E',
  buttonPrimaryBackground: '#0A84FF',
  buttonCompletedBackground: '#32D74B',
  buttonText: '#FFFFFF',
  progressBarBackground: '#3A3A3C',
  examDetailBackground: '#2C2C2E',
  progressBackground: '#1C1C1E',
  // Ensure colors used by Paper components are defined
  onSurface: '#FFFFFF', // Usually same as text for dark theme
  onSurfaceVariant: '#8E8E93', // Usually same as textSecondary
  onSurfaceDisabled: '#707070', // A lighter grey for disabled elements in dark mode
  outline: '#3A3A3C', // Usually same as border
  // Add other Paper color keys if needed
};
// --- End Custom Colors ---


// --- Merge custom colors with base Paper themes ---
// This ensures Paper components have all necessary base colors + your overrides
const CombinedLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors, // Your custom colors override defaults
  },
};

const CombinedDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors, // Your custom colors override defaults
  },
};
// --- End Theme Merging ---


// --- Intermediate Component to Bridge Context and Provider ---
// This component reads from your CustomThemeProvider and provides to PaperProvider
const ThemedApp = () => {
  // Get the dark mode state from YOUR custom context
  const { isDarkMode } = useCustomTheme();

  // Select the appropriate combined theme for React Native Paper
  const paperTheme = isDarkMode ? CombinedDarkTheme : CombinedLightTheme;

  // Optional: Adapt theme for React Navigation v6+ if you want nav elements themed too
  // const { LightTheme: NavLightTheme, DarkTheme: NavDarkTheme } = adaptNavigationTheme({
  //   reactNavigationLight: require('@react-navigation/native').DefaultTheme,
  //   reactNavigationDark: require('@react-navigation/native').DarkTheme,
  // });
  // const navigationTheme = isDarkMode ? NavDarkTheme : NavLightTheme;

  return (
    // Provide the selected theme to all React Native Paper components
    <PaperProvider theme={paperTheme}>
      {/* Pass the adapted theme to NavigationContainer if using adaptNavigationTheme */}
      {/* <NavigationContainer theme={navigationTheme}> */}
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
};


// --- Main App Component ---
export default function App() {
  return (
    // Your custom theme provider wraps everything, managing the isDarkMode state
    <CustomThemeProvider>
      {/* ThemedApp reads the state and provides the correct theme to Paper */}
      <ThemedApp />
    </CustomThemeProvider>
  );
}
