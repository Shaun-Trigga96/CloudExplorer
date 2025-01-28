import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';

interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
  icon: string;
}

const ModulesScreen = () => {
  const modules: Module[] = [
    {
      id: '1',
      title: 'Compute Engine',
      description: 'Learn about virtual machines in Google Cloud Platform',
      progress: 0,
      icon: '🖥️',
    },
    {
      id: '2',
      title: 'Cloud Storage',
      description: 'Master object storage in the cloud',
      progress: 0,
      icon: '💾',
    },
    {
      id: '3',
      title: 'Cloud Functions',
      description: 'Build serverless applications',
      progress: 0,
      icon: 'λ',
    },
    {
      id: '4',
      title: 'Kubernetes Engine',
      description: 'Container orchestration with GKE',
      progress: 0,
      icon: '🚀',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {modules.map((module) => (
        <Card key={module.id} style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Title>{module.icon} {module.title}</Title>
            </View>
            <Paragraph>{module.description}</Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" onPress={() => {}}>
              Start Learning
            </Button>
          </Card.Actions>
        </Card>
      ))}
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
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
});

export default ModulesScreen;
