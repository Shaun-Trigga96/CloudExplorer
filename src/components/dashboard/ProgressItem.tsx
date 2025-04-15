import React, { FC } from 'react';
import { View, Text, Image, ImageSourcePropType, StyleSheet } from 'react-native';
import { useCustomTheme } from '../../context/ThemeContext';

interface ProgressItemProps {
  title: string;
  status: string;
  percentage?: number;
  color: string;
  imageIcon: ImageSourcePropType;
}

const ProgressItem: FC<ProgressItemProps> = ({ title, status, percentage, color, imageIcon }) => {
  const { colors } = useCustomTheme().theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.progressItemBackground }]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: color }]}>
          <Image source={imageIcon} style={styles.imageIcon} resizeMode="contain" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    borderRadius: 8,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  imageIcon: {
    width: 24,
    height: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
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
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
});

export default ProgressItem;