import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme } from '../styles/theme'; // Import getTheme from your theme file

// Define the shape of the theme object (based on getTheme return type)
interface Theme {
  colors: {
    textPrimary: string;
    disabled: string 
    background: string;
    surface: string;
    primary: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    warning: string;
    progressBarBackground: string;
    gridItemBackground: string;
    quizModuleBackground: string;
    quizItemBackground: string;
    progressItemBackground: string;
    discussionItemBackground: string;
    chipBackground: string;
    inputBackground: string;
    onlineIndicatorBorder: string;
    buttonCompletedBackground: string;
    buttonText: string;
    buttonPrimaryBackground: string;
    bottomBarBackground: string;
    disabledButtonBackground: string;
    correctBackground: string;
    markdownCodeBackground: string;
    markAsReadBackground: string;
    markAsReadText: string;
    selectedAnswerBackground: string;
    selectedAnswerText: string;
    wrongBackground: string;
    neutralBackground: string;
    explanationBackground: string;
    buttonSecondaryBackground: string;
    examDetailBackground: string;
    progressBackground: string;
    critical: string;
    troubleshootingBackground: string;
    examInfoBackground: string;
    examRulesBackground: string;
    cardBackground: string;
    notificationBackground: string;

  };
  cardStyle: {
    borderRadius: number;
    marginBottom: number;
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
    borderWidth: number;
  };
}

// Update the ThemeContextProps interface to include theme
interface ThemeContextProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextProps>({
  isDarkMode: false,
  toggleDarkMode: () => {},
  theme: getTheme(false), // Provide a default theme
});

export const useCustomTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('darkMode');
        if (storedTheme !== null) {
          setIsDarkMode(storedTheme === 'true');
        }
      } catch (error) {
        console.error('Error loading theme from AsyncStorage:', error);
      }
    };
    loadTheme();
  }, []);

  const toggleDarkMode = async () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      try {
        AsyncStorage.setItem('darkMode', newMode.toString());
      } catch (error) {
        console.error('Error saving theme to AsyncStorage:', error);
      }
      return newMode;
    });
  };

  // Compute the theme based on isDarkMode
  const theme = getTheme(isDarkMode);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};