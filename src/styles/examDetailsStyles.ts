// src/styles/examDetailsStyles.ts
import { StyleSheet } from 'react-native';

export const examDetailsStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  startScreenContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  questionContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 180,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  submitContainer: {
    padding: 16,
    elevation: 4,
    borderTopWidth: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
  },
});