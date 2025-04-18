// src/styles/examsStyles.ts
import { StyleSheet } from 'react-native';

export const examsStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  screenDescription: {
    marginBottom: 24,
  },

noExamsContainer: {
       flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     padding: 20,
     marginTop: 50,
   },
  noExamsText: {
     fontSize: 16,
     textAlign: 'center',
   },
});