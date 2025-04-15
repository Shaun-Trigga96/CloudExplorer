// src/styles/quizzesStyles.ts
import { StyleSheet } from 'react-native';

export const quizzesStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  submitButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 3,
  },
  reviewTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
});