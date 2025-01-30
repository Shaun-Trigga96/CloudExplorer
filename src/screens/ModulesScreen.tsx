import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';
import ComputeEngineIcon from '../assets/icons/compute_engine.svg';
import CloudStorageIcon from '../assets/icons/cloud_storage.svg';
import CloudFunctionsIcon from '../assets/icons/cloud_functions.svg';
import KubernetesEngineIcon from '../assets/icons/google_kubernetes_engine.svg';

interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
  icon: React.FC; // Use React component type for SVG
}

const ModulesScreen = () => {
  const modules: Module[] = [
    {
      id: '1',
      title: 'Compute Engine',
      description: 'Learn about virtual machines in Google Cloud Platform',
      progress: 0,
      icon: ComputeEngineIcon,
    },
    {
      id: '2',
      title: 'Cloud Storage',
      description: 'Master object storage in the cloud',
      progress: 0,
      icon: CloudStorageIcon,
    },
    {
      id: '3',
      title: 'Cloud Functions',
      description: 'Build serverless applications',
      progress: 0,
      icon: CloudFunctionsIcon,
    },
    {
      id: '4',
      title: 'Kubernetes Engine',
      description: 'Container orchestration with GKE',
      progress: 0,
      icon: KubernetesEngineIcon,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {modules.map((module) => {
        const IconComponent = module.icon;
        
        return (
          <Card key={module.id} style={styles.card}>
            <Card.Content>
              <View style={styles.headerRow}>
                <IconComponent width={24} height={24} style={styles.icon} {...(IconComponent as React.SVGProps<SVGSVGElement>)} />
                <Title style={styles.title}>{module.title}</Title>
              </View>
              <Paragraph>{module.description}</Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" onPress={() => {}}>
                Start Learning
              </Button>
            </Card.Actions>
          </Card>
        );
      })}
    </ScrollView>
  );
};

// Keep the same styles as before
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  card: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    marginLeft: 8,
  },
});

export default ModulesScreen;