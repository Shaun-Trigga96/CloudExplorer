/* eslint-disable react-native/no-inline-styles */
import React, { FC } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Animated, { FadeIn } from 'react-native-reanimated';

const GridLayout = () => {
  // Sample data for grid items
  const gridItems = [
    {
      icon: 'book-open',
      title: 'Learning Modules',
      description: 'Interactive GCP concepts with AI-powered content',
      color: '#3b82f6',
    },
    {
      icon: 'activity',
      title: 'Progress Tracking',
      description: 'Real-time progress monitoring across modules',
      color: '#22c55e',
    },
    {
      icon: 'award',
      title: 'Certifications',
      description: 'Comprehensive exam preparation paths',
      color: '#a855f7',
    },
    {
      icon: 'bell',
      title: 'Smart Notifications',
      description: 'AI-driven learning reminders and updates',
      color: '#f97316',
    },
    {
      icon: 'settings',
      title: 'Settings',
      description: 'Customize your learning experience and preferences',
      color: '#ef4444',
    },
    {
      icon: 'users',
      title: 'Community',
      description: 'Connect with other cloud learners',
      color: '#0ea5e9',
    },
  ];

  // Calculate item width based on screen size
  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - 48) / 2; // Accounting for padding and gap

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Features</Text>

        <View style={styles.gridContainer}>
          {gridItems.map((item, index) => (
            <Animated.View
              key={index}
              entering={FadeIn.duration(800).delay(index * 100)}
              style={[styles.gridItem, { width: itemWidth }]}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
                <Icon name={item.icon} size={24} color="#ffffff" />
              </View>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Learning Progress Section */}
        <Animated.View entering={FadeIn.duration(1200)} style={styles.card}>
          <Text style={styles.cardTitle}>Learning Progress</Text>

          {/* Overall Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabelContainer}>
              <Text style={styles.progressLabel}>Overall Completion</Text>
              <Text style={styles.progressPercentage}>68%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: '68%', backgroundColor: '#3b82f6' }]} />
            </View>
          </View>

          {/* Module Progress Items */}
          <View style={styles.moduleProgressContainer}>
            <ModuleProgressItem
              title="GCP Fundamentals"
              progress={100}
              color="#22c55e"
              icon="check-circle"
            />
            <ModuleProgressItem
              title="Compute Engine"
              progress={75}
              color="#3b82f6"
              icon="server"
            />
            <ModuleProgressItem
              title="Cloud Storage"
              progress={50}
              color="#a855f7"
              icon="database"
            />
            <ModuleProgressItem
              title="Kubernetes"
              progress={25}
              color="#f97316"
              icon="layers"
            />
            <ModuleProgressItem
              title="Big Data"
              progress={0}
              color="#9ca3af"
              icon="bar-chart-2"
            />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Component for each module progress item
interface ModuleProgressItemProps {
  title: string;
  progress: number;
  color: string;
  icon: string;
}
const ModuleProgressItem: FC<ModuleProgressItemProps> = ({ title, progress, color, icon }) => (
  <View style={styles.moduleItem}>
    <View style={styles.moduleItemHeader}>
      <View style={[styles.moduleIconCircle, { backgroundColor: color }]}>
        <Icon name={icon} size={16} color="#ffffff" />
      </View>
      <Text style={styles.moduleTitle}>{title}</Text>
      <Text style={styles.modulePercentage}>{progress}%</Text>
    </View>
    <View style={styles.moduleProgressBarContainer}>
      <View
        style={[
          styles.moduleProgressBar,
          { width: `${progress}%`, backgroundColor: color }
        ]}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    color: '#202124',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    color: '#202124',
  },
  itemDescription: {
    fontSize: 12,
    color: '#5f6368',
    textAlign: 'center',
    marginTop: 4,
  },
  // Card for Progress Section
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: '#202124',
  },
  // Progress Bar Styles
  progressSection: {
    marginBottom: 20,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3b82f6',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
  },
  // Module Progress Styles
  moduleProgressContainer: {
    marginTop: 10,
  },
  moduleItem: {
    marginBottom: 14,
  },
  moduleItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  moduleIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  moduleTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#202124',
    flex: 1,
  },
  modulePercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5f6368',
  },
  moduleProgressBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  moduleProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
});

export default GridLayout;
