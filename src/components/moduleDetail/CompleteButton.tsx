import React, { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useCustomTheme } from '../../context/ThemeContext';

interface CompleteButtonProps {
  isLoading: boolean;
  allContentRead: boolean;
  onPress: () => void;
}

const CompleteButton: FC<CompleteButtonProps> = ({ isLoading, allContentRead, onPress }) => {
  const { colors } = useCustomTheme().theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.bottomBarBackground, borderTopColor: colors.border }]}>
      <Button
        mode="contained"
        onPress={onPress}
        loading={isLoading}
        disabled={!allContentRead || isLoading}
        style={allContentRead ? styles.button : styles.disabledButton}
        buttonColor={allContentRead ? colors.primary : colors.disabledButtonBackground}
        textColor={colors.buttonText}
      >
        {isLoading ? 'Saving...' : allContentRead ? 'Complete & Continue to Quiz' : 'Please read all content'}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    borderTopWidth: 1,
  },
  button: {},
  disabledButton: {},
});

export default CompleteButton;