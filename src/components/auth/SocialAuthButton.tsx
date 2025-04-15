// src/components/auth/SocialAuthButton.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SocialAuthButtonProps {
  provider: 'google' | 'apple';
  onPress: () => void;
  loading: boolean;
}

const SocialAuthButton: React.FC<SocialAuthButtonProps> = ({ provider, onPress, loading }) => {
  const isGoogle = provider === 'google';
  const backgroundColor = isGoogle ? '#DB4437' : '#000000';
  const iconName = isGoogle ? 'google' : 'apple';
  const label = loading ? 'Processing...' : `Continue with ${isGoogle ? 'Google' : 'Apple'}`;

  return (
    <Button
      mode="contained"
      onPress={onPress}
      style={[styles.socialButton, { backgroundColor }]}
      labelStyle={styles.buttonLabel}
      icon={() => <Icon name={iconName} size={20} color="white" />}
      disabled={loading}
      testID={isGoogle ? 'google-signin-button' : 'apple-signin-button'}
    >
      {label}
    </Button>
  );
};

const styles = StyleSheet.create({
  socialButton: {
    marginTop: 15,
    paddingVertical: 10,
    borderRadius: 10,
    elevation: 3,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'System',
  },
});

export default SocialAuthButton;