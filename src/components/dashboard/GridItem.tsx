import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import { useCustomTheme } from '../../context/ThemeContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';

interface GridItemProps {
  icon: string;
  title: string;
  description: string;
  color: string;
  screen: keyof RootStackParamList | string; // Allow string for Tab names
  index: number;
  navigation: NativeStackNavigationProp<RootStackParamList, 'MainApp'>;
  providerId: string;
  pathId: string;
}

const screenWidth = Dimensions.get('window').width;
const itemWidth = (screenWidth - 48) / 2;

const GridItem: FC<GridItemProps> = ({ icon, title, description, color, screen, index, navigation }) => {
  const { isDarkMode } = useCustomTheme();
  const { colors, cardStyle } = useCustomTheme().theme;

  const handlePress = () => {
    if (screen) navigation.navigate(screen as never);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(800).delay(index * 100)}
      style={[styles.container, cardStyle, { width: itemWidth, backgroundColor: colors.gridItemBackground, borderColor: colors.border }]}
    >
      <TouchableOpacity onPress={handlePress} style={styles.touchable}>
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
          <Icon name={icon} size={24} color="#ffffff" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  touchable: {
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default GridItem;