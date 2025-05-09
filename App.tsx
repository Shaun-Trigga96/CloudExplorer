// c:\Users\thabi\Desktop\CloudExplorer\App.tsx
import 'react-native-gesture-handler';
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {
  Provider as PaperProvider,
  MD3LightTheme, // Or MD2LightTheme if you prefer Material Design 2
  MD3DarkTheme, // Or MD2DarkTheme
  // adaptNavigationTheme, // Optional: For deeper React Navigation theme integration
} from 'react-native-paper';
import RootNavigator from './src/navigation/RootNavigator';
import {
  ThemeProvider as CustomThemeProvider,
  useCustomTheme,
} from './src/context/ThemeContext'; // Adjust path if needed
import {ActiveLearningPathProvider} from './src/context/ActiveLearningPathContext'; // Import the new provider
import {lightColors, darkColors} from './src/styles/colors';

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
  const {isDarkMode} = useCustomTheme();

  // Select the appropriate combined theme for React Native Paper
  const paperTheme = isDarkMode ? CombinedDarkTheme : CombinedLightTheme;

  // Select the appropriate theme for React Navigation (optional, but good practice)
  // const navigationTheme = isDarkMode ? CombinedDarkTheme : CombinedLightTheme; // Use the same combined theme or adapt it

  return (
    // Provide the selected theme to all React Native Paper components
    <PaperProvider theme={paperTheme}>
      {/* Provide the theme to React Navigation */}
      <NavigationContainer /* theme={navigationTheme} */>
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
      {/* ActiveLearningPathProvider wraps components needing access to the active path */}
      <ActiveLearningPathProvider>
        {/* ThemedApp reads the theme state and provides the correct theme to Paper/Navigation */}
        <ThemedApp />
      </ActiveLearningPathProvider>
    </CustomThemeProvider>
  );
}
