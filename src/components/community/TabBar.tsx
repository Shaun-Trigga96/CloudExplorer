import React, { FC } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useCustomTheme } from '../../context/ThemeContext';

interface TabBarProps {
  selectedTab: string;
  onSelect: (tab: string) => void;
}

const TabBar: FC<TabBarProps> = ({ selectedTab, onSelect }) => {
  const { colors } = useCustomTheme().theme;
  const tabs = ['feed', 'members', 'events'];

  return (
    <View style={[styles.container, { borderBottomColor: colors.border }]}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, selectedTab === tab && [styles.activeTab, { borderBottomColor: colors.primary }]]}
          onPress={() => onSelect(tab)}
        >
          <Text style={[styles.tabText, { color: selectedTab === tab ? colors.primary : colors.textSecondary }]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TabBar;