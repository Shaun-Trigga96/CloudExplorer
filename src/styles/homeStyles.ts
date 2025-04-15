// src/styles/homeStyles.ts
import { StyleSheet } from 'react-native';

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    borderRadius: 12,
    elevation: 4,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});