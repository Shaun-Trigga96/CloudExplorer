import React, { FC } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useCustomTheme } from '../../context/ThemeContext';

interface SearchBarProps {
  value: string;
  onChange: (text: string) => void;
}

const SearchBar: FC<SearchBarProps> = ({ value, onChange }) => {
  const { colors } = useCustomTheme().theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
      <Icon name="search" size={20} color={colors.textSecondary} style={styles.icon} />
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder="Search discussions, members..."
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChange}
        returnKeyType="search"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
});

export default SearchBar;