import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import TabNavigator from './TabNavigator';


export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  MainApp: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
      <Stack.Navigator
        initialRouteName="Auth"
        screenOptions={{ headerShown: false, gestureEnabled: false,
         }}
      >
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="MainApp" component={TabNavigator} />
      </Stack.Navigator>
  );
}

