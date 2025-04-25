// src/components/dashboard/ProgressItem.tsx
import React, { FC } from 'react';
import { View, Text, Image, ImageSourcePropType, StyleSheet, TouchableOpacity } from 'react-native'; // Import TouchableOpacity
import { useCustomTheme } from '../../context/ThemeContext';

interface ProgressItemProps {
  title: string;
  subtitle?: string; // Added optional subtitle
  status: string;
  percentage?: number;
  color: string;
  imageIcon: ImageSourcePropType;
  onPress: () => void; // Changed onPress to a function type
}

const ProgressItem: FC<ProgressItemProps> = ({ title, subtitle, status, percentage, color, imageIcon, onPress }) => { // Destructure subtitle and onPress
  const { colors } = useCustomTheme().theme;

  return (
    // Wrap with TouchableOpacity to make it pressable
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.progressItemBackground }]}
      onPress={onPress} // Use the onPress prop here
      activeOpacity={0.7} // Add visual feedback on press
    >
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
          <Image source={imageIcon} style={styles.imageIcon} resizeMode="contain" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {/* Conditionally render the subtitle if it exists */}
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
          )}
          <Text style={[styles.status, { color: colors.textSecondary }]}>{status}</Text>
        </View>
        {percentage !== undefined && (
          <Text style={[styles.percentage, { color: colors.primary }]}>{percentage}%</Text>
        )}
      </View>
      {percentage !== undefined && (
        <View style={[styles.progressBarContainer, { backgroundColor: colors.progressBarBackground }]}>
          <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    borderRadius: 8,
    padding: 12,
    // Add subtle shadow/elevation if desired
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // Keep margin if percentage bar is shown
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16, // Make it a circle
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  imageIcon: {
    width: 50, // Adjust size as needed
    height: 50, // Adjust size as needed
  },
  textContainer: {
    flex: 1,
    marginRight: 8, // Add margin to prevent text touching percentage
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: { // Added style for subtitle
    fontSize: 12,
    marginTop: 1,
  },
  status: {
    fontSize: 13,
    marginTop: 2,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarContainer: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 4, // Add space only if progress bar is visible
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
});

export default ProgressItem;
