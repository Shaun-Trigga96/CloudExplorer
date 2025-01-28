import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
//import AuthScreen from './src/screens/AuthScreen';
//import HomeScreen from './src/screens/HomeScreen';
import RootNavigator from './src/navigation/RootNavigator';

// import firebase from '@react-native-firebase/app';

// // Firebase configuration
// const firebaseConfig = {
//   apiKey: 'AIzaSyAPXex6ZNB2to_crrC7_bBxGWDkTxuaGV8', // Web API Key
//   authDomain: 'cloud-explorer-c3d98.firebaseapp.com', // Project ID + firebaseapp.com
//   projectId: 'cloud-explorer-c3d98', // Project ID
//   databaseURL: 'https://cloud-explorer-c3d98-default-rtdb.firebaseio.com',
//   storageBucket: 'cloud-explorer-c3d98.appspot.com', // Project ID + appspot.com
//   messagingSenderId: '502638141687', // Project number
//   appId: '1:502638141687:android:e29f2daeafe883f87db3f2', // App ID
// };

// // Initialize Firebase
// if (!firebase.apps.length) {
//   firebase.initializeApp(firebaseConfig);
//   console.log('Firebase initialized successfully');
// } else {
//   console.log('Firebase already initialized');
// }

export default function App() {
  return (
    <NavigationContainer>
        {/* <Stack.Screen name="Auth" component={AuthScreen} /> */}
        {/* <Stack.Screen name="Home" component={HomeScreen} /> */}
        <RootNavigator />
    </NavigationContainer>
  );
}
