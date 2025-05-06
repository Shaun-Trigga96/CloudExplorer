import React, { FC } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Topic } from '../../types/community';
import { useCustomTheme } from '../../context/ThemeContext';

interface TopicButtonProps {
  topic: Topic;
  isSelected: boolean;
  onPress: (name: string) => void;
}

const TopicButton: FC<TopicButtonProps> = ({ topic, isSelected, onPress }) => {
  const { theme: { colors } } = useCustomTheme();

  return (
    <Animated.View entering={ZoomIn.duration(300)}>
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: isSelected ? colors.primary : colors.chipBackground },
          isSelected && styles.selectedButton,
        ]}
        onPress={() => onPress(topic.name)}
      >
        <Text
          style={[
            styles.text,
            { color: isSelected ? colors.background : colors.text },
          ]}
        >
          {topic.name} ({topic.count})
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedButton: {
    transform: [{ scale: 1.05 }],
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default TopicButton;