import React, { FC } from 'react';
import { TouchableOpacity, StyleSheet, GestureResponderEvent } from 'react-native'; // Import GestureResponderEvent if needed, otherwise () => void is fine
import Icon from 'react-native-vector-icons/Feather';
import { useCustomTheme } from '../../context/ThemeContext';

interface FABProps {
  onPress: () => void; // Simple function type is often sufficient
}

// Correctly type the Functional Component with its props interface
const FAB: FC<FABProps> = ({ onPress }) => {
  const { colors } = useCustomTheme().theme;

  return (
    // CORRECT: onPress is now a direct prop of TouchableOpacity
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.primary }]}
      onPress={onPress} // Moved onPress prop here
      activeOpacity={0.8} // Added default activeOpacity for better feedback
    >
      <Icon name="plus" size={24} color={colors.background} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});

export default FAB;