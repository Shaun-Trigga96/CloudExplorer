import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Auth"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
