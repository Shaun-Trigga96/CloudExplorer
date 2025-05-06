import React, { FC } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useCustomTheme } from '../../context/ThemeContext';

interface TabBarProps {
  selectedTab: string;
  onSelect: (tab: string) => void;
}

const TabBar: FC<TabBarProps> = ({ selectedTab, onSelect }) => {
  const { theme: { colors } } = useCustomTheme();
  const tabs = [
    { name: 'feed', icon: 'message-square' },
    { name: 'members', icon: 'users' },
    { name: 'events', icon: 'calendar' },
  ];

  return (
    <Animated.View entering={SlideInDown.duration(300)} style={[styles.container, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.name}
          style={[styles.tab, selectedTab === tab.name && styles.activeTab]}
          onPress={() => onSelect(tab.name)}
        >
          <Icon
            name={tab.icon}
            size={20}
            color={selectedTab === tab.name ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              { color: selectedTab === tab.name ? colors.primary : colors.textSecondary },
            ]}
          >
            {tab.name.charAt(0).toUpperCase() + tab.name.slice(1)}
          </Text>
          {selectedTab === tab.name && (
            <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
          )}
        </TouchableOpacity>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeTab: {},
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  indicator: {
    position: 'absolute',
    bottom: -2,
    left: '25%',
    width: '50%',
    height: 3,
    borderRadius: 2,
  },
});

export default TabBar;