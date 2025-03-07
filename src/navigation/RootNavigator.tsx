import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import TabNavigator from './TabNavigator';
import ModuleDetailScreen from '../screens/ModuleDetailScreen';


export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  ModuleDetail: { moduleId: string };
  MainApp: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Auth"
      screenOptions={{
        headerShown: false, gestureEnabled: false,
      }}
    >
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ModuleDetail" component={ModuleDetailScreen}/>
      <Stack.Screen name="MainApp" component={TabNavigator} />
    </Stack.Navigator>
  );
}
export default RootNavigator;
