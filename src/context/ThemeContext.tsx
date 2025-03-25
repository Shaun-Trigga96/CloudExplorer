import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  isDarkMode: false,
  toggleDarkMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

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
    setIsDarkMode(!isDarkMode);
    try {
      await AsyncStorage.setItem('darkMode', (!isDarkMode).toString());
    } catch (error) {
      console.error('Error saving theme to AsyncStorage:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};