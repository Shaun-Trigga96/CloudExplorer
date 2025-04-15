// src/utils/errorHandler.ts
import { Alert } from 'react-native';
import axios, { AxiosError } from 'axios';

export const authErrorMessages: { [key: string]: string } = {
  default: 'An unexpected error occurred. Please try again.',
  'auth/email-already-in-use': 'This email address is already in use.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'The password you entered is incorrect.',
  'auth/network-request-failed': 'Network error. Please check connection.',
  '1001': 'Sign-in cancelled.',
  'SIGN_IN_CANCELLED': 'Sign-in cancelled.',
  'network error': 'Internet connection required for sign-in.',
};

export const handleAxiosError = (error: unknown, context: string = 'Operation') => {
  console.error(`[${context}] Error:`, error);
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    if (!axiosError.response) {
      Alert.alert('Network Error', 'Could not connect to the server. Please check your connection.');
      return;
    }
    const { status, data } = axiosError.response;
    const message = data?.message || data?.error || 'Unknown server error';
    if (status === 404) {
      Alert.alert('Not Found', `${context} not found on the server.`);
    } else if (status === 401) {
      Alert.alert('Unauthorized', 'You are not authorized to perform this action.');
    } else {
      Alert.alert('Server Error', `Code: ${status}. ${message}`);
    }
  } else {
    const errorMessage = (error as Error)?.message || 'Unknown error';
    Alert.alert('Error', `${context} failed: ${errorMessage}`);
  }
};