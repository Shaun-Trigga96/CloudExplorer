import { lightColors, darkColors } from './colors';

export const getTheme = (isDarkMode: boolean) => ({
  colors: isDarkMode ? darkColors : lightColors,
  cardStyle: {
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDarkMode ? 0 : 0.1,
    shadowRadius: 4,
    elevation: isDarkMode ? 0 : 3,
    borderWidth: isDarkMode ? 1 : 0,
  },
});