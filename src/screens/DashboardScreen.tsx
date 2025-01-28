import React from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryLabel, VictoryContainer } from 'victory-native';
import Icon from 'react-native-vector-icons/Feather';

type ProgressData = {
  module: string;
  completed: number;
};

type Feature = {
  icon: string;
  title: string;
  description: string;
  color: string;
};

const DashboardScreen = () => {
  const progressData: ProgressData[] = [
    { module: 'Compute', completed: 85 },
    { module: 'Storage', completed: 70 },
    { module: 'Database', completed: 60 },
    { module: 'Security', completed: 90 },
    { module: 'Networking', completed: 75 },
  ];

  const features: Feature[] = [
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
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cloud Explorer Features</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <Icon name={feature.icon} size={32} color={feature.color} />
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Learning Progress</Text>
        <View style={styles.chartContainer}>
          <VictoryChart
            width={Dimensions.get('window').width - 40}
            height={300}
            domainPadding={20}
            containerComponent={<VictoryContainer />}
          >
            <VictoryAxis
              tickFormat={(t: string) => t}
              style={{
                tickLabels: { angle: -45, fontSize: 8 },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(t: number) => `${t}%`}
            />
            <VictoryBar
              data={progressData}
              x="module"
              y="completed"
              style={{ data: { fill: '#3b82f6' } }}
              labels={({ datum }) => `${datum.completed}%`}
              labelComponent={<VictoryLabel />}
            />
          </VictoryChart>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  chartContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
});

export default DashboardScreen;
