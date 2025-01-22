

import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';

const App = () => {
  return (
    <View style={styles.container}>
      <Image
        source={require('./assets/CloudExplorer.png')} // Replace with your logo path
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.welcomeMessage}>Welcome to Cloud Explorer</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f4',
  },
  logo: {
    width: 400,
    height: 400,
    marginBottom: 20,
  },
  welcomeMessage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
});

export default App;
