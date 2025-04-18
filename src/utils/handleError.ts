import { Alert } from 'react-native';
import { AxiosError } from 'axios';

export const handleError = (err: any, setError: (error: string | null) => void) => {
  let message = 'An unexpected error occurred';
  if (err && typeof err === 'object' && 'isAxiosError' in err) {
    const axiosError = err as AxiosError;
    if (!axiosError.response) {
      message = 'Could not connect to the server. Please check your internet connection and try again.';
    } else {
      message = `An error occurred on the server: ${axiosError.response.status}`;
      if (axiosError.response.status === 404) {
        message = 'User progress data not found. Please try again later.';
      } else if (axiosError.response.status === 401) {
        message = 'Authentication error. Please log in again.';
      } else if (axiosError.response.data) {
        message += ` - ${JSON.stringify(axiosError.response.data)}`;
      }
    }
  }
  Alert.alert('Error', message, [{ text: 'OK' }]);
  setError(message);
  return null; 
};