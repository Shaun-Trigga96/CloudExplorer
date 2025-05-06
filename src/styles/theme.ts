import { lightColors, darkColors } from './colors';

export const getTheme = (isDarkMode: boolean) => ({
  colors: isDarkMode ? darkColors : lightColors,
  gradient: {
    fab: isDarkMode ? ['#26C6DA', '#4FC3F7'] : ['#00ACC1', '#4FC3F7'], // Teal to blue gradient
  },
  cardStyle: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.1,
    shadowRadius: 4,
    elevation: isDarkMode ? 0 : 3,
    borderWidth: isDarkMode ? 1 : 0,
    borderColor: isDarkMode ? darkColors.border : 'transparent', // Use theme border color in dark mode
  },
});