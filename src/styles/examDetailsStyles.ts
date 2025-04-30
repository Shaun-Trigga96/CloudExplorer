// src/styles/examDetailsStyles.ts
import { StyleSheet } from 'react-native';

export const examDetailsStyles = StyleSheet.create({
  container: {
    flex: 1, // Crucial for the layout
  },
  startScreenContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  // --- FIX: Remove paddingBottom from here ---
  questionContainer: {
    // flex: 1, // We will apply flex: 1 inline in the component
    paddingHorizontal: 16,
    paddingTop: 16,
    // paddingBottom: 180, // REMOVED - This was incorrect here
  },
  // --- END FIX ---
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
  buttonContainer: { // Style for buttons on the Result screen
    flexDirection: 'row',
    justifyContent: 'space-between',
    margin: 16,
  },
});
