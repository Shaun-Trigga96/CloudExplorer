import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';

const HomeScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Home'>>();
  const handleLogout = async () => {
    navigation.navigate('Auth');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Cloud Explorer</Text>
      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.button}
        labelStyle={styles.buttonLabel}
      >
        Logout
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 30,
  },
  button: {
    width: '100%',
    paddingVertical: 5,
  },
  buttonLabel: {
    fontSize: 16,
  },
});

export default HomeScreen;
