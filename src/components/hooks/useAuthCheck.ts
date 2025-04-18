// src/hooks/useAuthCheck.ts
import { useState, useEffect } from 'react';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

interface UseAuthCheckReturn {
  checkingAuth: boolean;
}

export const useAuthCheck = (
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>
): UseAuthCheckReturn => {
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(async (user) => {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (user || storedUserId) {
        navigation.replace('Home');
        setCheckingAuth(false);
      } else if (navigation.canGoBack()) {
        navigation.popToTop();
        navigation.navigate('Auth');
      } else {
        setCheckingAuth(false);
      }
    });

    return subscriber;
  }, [navigation]);

  return { checkingAuth };
};