/* eslint-disable react-native/no-inline-styles */
import React, { FC, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import ComputeEngineIcon from '../assets/icons/compute_engine.svg';
import CloudStorageIcon from '../assets/icons/cloud_storage.svg';
import CloudFunctionsIcon from '../assets/icons/cloud_functions.svg';
import KubernetesEngineIcon from '../assets/icons/google_kubernetes_engine.svg';

const BASE_URL = 'http://10.0.2.2:5000';

interface LearningProgress {
  completedModules: string[];
  completedQuizzes: string[];
  completedExams: string[];
  score: number;
}

interface ProgressEntry {
  quizId: string;
  moduleId: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
}

interface Module {
  id: string;
  title: string;
}

interface ModuleProgressItemProps {
  title: string;
  progress: number;
  color: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

const DashboardScreen: FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        let storedUserId = await AsyncStorage.getItem('userId');
        console.log('Stored User ID (original):', storedUserId);
        storedUserId = 'Mbcy1W9YEynQujbWQFqbW5d0Ij2';
        await AsyncStorage.setItem('userId', storedUserId);
        console.log('Stored User ID (used):', storedUserId);

        if (!storedUserId) {
          navigation.navigate('Auth');
          return;
        }

        const response = await axios.get(`${BASE_URL}/user/${storedUserId}/progress`);
        console.log('Full Progress Response:', JSON.stringify(response.data, null, 2));

        setLearningProgress(response.data.learningProgress || null);
        setProgress(response.data.progress || []);
        setModules(response.data.modules || []);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigation]);

  const retryFetch = () => {
    setLoading(true);
    setError(null);
    const fetchUserData = async () => {
      try {
        let storedUserId = await AsyncStorage.getItem('userId');
        console.log('Retry Stored User ID (original):', storedUserId);
        console.log('Retry Stored User ID (used):', storedUserId);

        if (!storedUserId) {
          navigation.navigate('Auth');
          return;
        }

        const response = await axios.get(`${BASE_URL}/user/${storedUserId}/progress`);
        console.log('Retry Full Progress Response:', JSON.stringify(response.data, null, 2));

        setLearningProgress(response.data.learningProgress || null);
        setProgress(response.data.progress || []);
        setModules(response.data.modules || []);
      } catch (err: any) {
        console.error('Retry Error:', err.response?.data || err.message);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  };

  // Calculate overall progress
  const totalModules = modules.length;
  const completedModuleIds = [
    ...new Set([
      ...(learningProgress?.completedModules || []),
      ...progress.map((entry) => entry.moduleId),
    ]),
  ];
  const progressPercentage = totalModules > 0 ? Math.round((completedModuleIds.length / totalModules) * 100) : 0;

  // Map module IDs to icons, colors, and titles
  const getModuleDetails = (moduleId: string) => {
    const moduleMap: { [key: string]: { icon: React.FC<React.SVGProps<SVGSVGElement>>; color: string; title: string } } = {
      'compute-engine': { icon: ComputeEngineIcon as React.FC<React.SVGProps<SVGSVGElement>>, color: '#3b82f6', title: 'Compute Engine' },
      'cloud-storage': { icon: CloudStorageIcon as React.FC<React.SVGProps<SVGSVGElement>>, color: '#a855f7', title: 'Cloud Storage' },
      'cloud-functions': { icon: CloudFunctionsIcon as React.FC<React.SVGProps<SVGSVGElement>>, color: '#9ca3af', title: 'Cloud Functions' },
      'kubernetes-engine': { icon: KubernetesEngineIcon as React.FC<React.SVGProps<SVGSVGElement>>, color: '#f97316', title: 'Kubernetes Engine' },
    };
    const module = modules.find((m) => m.id === moduleId);
    const mapped = moduleMap[moduleId] || { icon: ComputeEngineIcon, color: '#3b82f6', title: module?.title || moduleId };
    return { ...mapped, title: module?.title || mapped.title };
  };

  // Dynamic module progress data from both learningProgress and progress
  const moduleProgressData = completedModuleIds.map((moduleId) => {
    const { icon, color, title } = getModuleDetails(moduleId);
    const moduleProgress = progress.find((p) => p.moduleId === moduleId);
    const progressPercent = moduleProgress
      ? moduleProgress.score // Assume score is a percentage (0-100)
      : (learningProgress?.score || 0); // Fallback to overall score
    return {
      title,
      progress: progressPercent,
      color,
      icon,
    };
  }).slice(0, 4);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.error}>{error}</Text>
        <Button mode="contained" onPress={retryFetch} style={styles.retryButton}>
          Retry
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <GridLayout />

        <Animated.View entering={FadeIn.duration(1200)} style={styles.card}>
          <Text style={styles.cardTitle}>Learning Progress</Text>

          <View style={styles.progressSection}>
            <View style={styles.progressLabelContainer}>
              <Text style={styles.progressLabel}>Overall Completion</Text>
              <Text style={styles.progressPercentage}>{progressPercentage}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${progressPercentage}%`, backgroundColor: '#3b82f6' },
                ]}
              />
            </View>
          </View>

          <View style={styles.moduleProgressContainer}>
            {moduleProgressData.length > 0 ? (
              moduleProgressData.map((item) => (
                <ModuleProgressItem
                  key={item.title}
                  title={item.title}
                  progress={item.progress}
                  color={item.color}
                  icon={item.icon}
                />
              ))
            ) : (
              <Text style={styles.noDataText}>No progress data available yet.</Text>
            )}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const GridLayout: FC = () => {
  const gridItems = [
    { icon: 'book-open', title: 'Learning Modules', description: 'Interactive GCP concepts with AI-powered content', color: '#3b82f6' },
    { icon: 'activity', title: 'Progress Tracking', description: 'Real-time progress monitoring across modules', color: '#22c55e' },
    { icon: 'award', title: 'Certifications', description: 'Comprehensive exam preparation paths', color: '#a855f7' },
    { icon: 'bell', title: 'Smart Notifications', description: 'AI-driven learning reminders and updates', color: '#f97316' },
    { icon: 'settings', title: 'Settings', description: 'Customize your learning experience and preferences', color: '#ef4444' },
    { icon: 'users', title: 'Community', description: 'Connect with other cloud learners', color: '#0ea5e9' },
  ];

  const screenWidth = Dimensions.get('window').width;
  const itemWidth = (screenWidth - 48) / 2;

  return (
    <View>
      <Text style={styles.title}>Features</Text>
      <View style={styles.gridContainer}>
        {gridItems.map((item) => (
          <Animated.View
            key={item.title}
            entering={FadeIn.duration(800).delay(gridItems.indexOf(item) * 100)}
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
    </View>
  );
};

const ModuleProgressItem: FC<ModuleProgressItemProps> = ({ title, progress, color, icon: IconComponent }) => (
  <View style={styles.moduleItem}>
    <View style={styles.moduleItemHeader}>
      <View style={[styles.moduleIconCircle, { backgroundColor: color }]}>
        <IconComponent width={24} height={24} />
      </View>
      <Text style={styles.moduleTitle}>{title}</Text>
      <Text style={styles.modulePercentage}>{progress}%</Text>
    </View>
    <View style={styles.moduleProgressBarContainer}>
      <View style={[styles.moduleProgressBar, { width: `${progress}%`, backgroundColor: color }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8f9fa' },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#202124' },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 16, color: 'red', textAlign: 'center', padding: 20 },
  retryButton: { marginTop: 10, alignSelf: 'center' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
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
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  itemTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', color: '#202124' },
  itemDescription: { fontSize: 12, color: '#5f6368', textAlign: 'center', marginTop: 4 },
  cardTitle: { fontSize: 22, fontWeight: '700', marginBottom: 20, color: '#202124' },
  progressSection: { marginBottom: 20 },
  progressLabelContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 16, fontWeight: '600', color: '#202124' },
  progressPercentage: { fontSize: 16, fontWeight: '700', color: '#3b82f6' },
  progressBarContainer: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 5 },
  moduleProgressContainer: { marginTop: 10 },
  moduleItem: { marginBottom: 14 },
  moduleItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  moduleIconCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  moduleTitle: { fontSize: 14, fontWeight: '500', color: '#202124', flex: 1 },
  modulePercentage: { fontSize: 14, fontWeight: '600', color: '#5f6368' },
  moduleProgressBarContainer: { height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden' },
  moduleProgressBar: { height: '100%', borderRadius: 3 },
  noDataText: { fontSize: 14, color: '#5f6368', textAlign: 'center' },
});

export default DashboardScreen;
