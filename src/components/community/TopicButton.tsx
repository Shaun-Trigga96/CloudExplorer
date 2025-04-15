import React, { FC } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Topic } from '../../types/community';
import { useCustomTheme } from '../../context/ThemeContext';

interface TopicButtonProps {
  topic: Topic;
  isSelected: boolean;
  onPress: (name: string) => void;
}

const TopicButton: FC<TopicButtonProps> = ({ topic, isSelected, onPress }) => {
  const { colors } = useCustomTheme().theme;

  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: isSelected ? colors.primary : colors.chipBackground }]}
      onPress={() => onPress(topic.name)}
    >
      <Text style={[styles.text, { color: isSelected ? colors.background : colors.textSecondary }]}>
        {topic.name} ({topic.count})
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TopicButton;