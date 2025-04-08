import React, { FC } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../src/context/ThemeContext';
import Animated, { SlideInRight } from 'react-native-reanimated';

interface CloudProvider {
  label: string;
  value: string;
  icon: string;
}

interface FiltersProps {
  searchText: string;
  setSearchText: (text: string) => void;
  filterProvider: string;
  setFilterProvider: (provider: string) => void;
  sortBy: 'date' | 'provider';
  setSortBy: (sort: 'date' | 'provider') => void;
  cloudProviders: CloudProvider[];
}

const Filters: FC<FiltersProps> = ({
  searchText,
  setSearchText,
  filterProvider,
  setFilterProvider,
  sortBy,
  setSortBy,
  cloudProviders,
}) => {
  const { isDarkMode } = useTheme();

  const getCloudProviderIcon = (providerId?: string) => {
    if (!providerId) return 'cloud';
    const provider = cloudProviders.find(p => p.value === providerId);
    return provider ? provider.icon : 'cloud';
  };

  return (
    <Animated.View
      entering={SlideInRight.duration(300)}
      style={[
        styles.filtersContainer,
        { backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF' },
      ]}
    >
      <TextInput
        style={[styles.searchInput, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
        placeholder="Search certifications..."
        placeholderTextColor="#888"
        value={searchText}
        onChangeText={setSearchText}
      />

      <Dropdown
        style={[
          styles.filterDropdown,
          { backgroundColor: isDarkMode ? '#3A3A3A' : '#F0F0F0' },
        ]}
        placeholderStyle={{ color: '#888' }}
        selectedTextStyle={{ color: isDarkMode ? '#FFF' : '#1A1A1A' }}
        data={[{ label: 'All Providers', value: '' }, ...cloudProviders]}
        labelField="label"
        valueField="value"
        placeholder="Filter by Provider"
        value={filterProvider}
        onChange={(item) => {
          setFilterProvider(item.value);
        }}
        renderLeftIcon={() => (
          <MaterialIcon
            name={
              filterProvider
                ? getCloudProviderIcon(filterProvider)
                : 'filter-variant'
            }
            size={20}
            color="#007BFF"
            style={styles.dropdownIcon}
          />
        )}
      />

      <View style={styles.sortButtons}>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
          onPress={() => setSortBy('date')}
        >
          <Text style={[styles.sortButtonText, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}>
            By Date
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.sortButton,
            sortBy === 'provider' && styles.sortButtonActive,
          ]}
          onPress={() => setSortBy('provider')}
        >
          <Text style={[styles.sortButtonText, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}>
            By Provider
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  filtersContainer: {
    padding: 15,
    marginBottom: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    // backgroundColor handled dynamically based on isDarkMode
  },
  searchInput: {
    height: 45,
    borderWidth: 1,
    borderColor: '#DDD', // Default border color, adjust if needed
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
    fontSize: 16,
    // color handled dynamically based on isDarkMode
  },
  filterDropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: '#DDD', // Default border color, adjust if needed
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 10,
    // backgroundColor handled dynamically based on isDarkMode
    // placeholderStyle handled inline
    // selectedTextStyle handled inline
  },
  dropdownIcon: {
    marginRight: 10,
  },
  sortButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 5,
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  sortButtonActive: {
   
  },
  sortButtonText:{

  },
});

export default Filters;
