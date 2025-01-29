import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: string;
}

const ExamsScreen = () => {
  const exams: Exam[] = [
    {
      id: '1',
      title: 'Cloud Engineer',
      description: 'Professional Cloud Engineer Certification Practice Exam',
      duration: '2 hours',
      icon: '🎯',
    },
    {
      id: '2',
      title: 'Cloud Architect',
      description: 'Professional Cloud Architect Certification Practice Exam',
      duration: '2 hours',
      icon: '🏗️',
    },
    {
      id: '3',
      title: 'Data Engineer',
      description: 'Professional Data Engineer Certification Practice Exam',
      duration: '2 hours',
      icon: '📊',
    },
    {
      id: '4',
      title: 'Security Engineer',
      description: 'Professional Security Engineer Certification Practice Exam',
      duration: '2 hours',
      icon: '🔒',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {exams.map((exam) => (
        <Card key={exam.id} style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Title>{exam.icon} {exam.title}</Title>
            </View>
            <Paragraph>{exam.description}</Paragraph>
            <Paragraph style={styles.duration}>
              Duration: {exam.duration}
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" onPress={() => {}}>
              Start Practice Exam
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
  duration: {
    marginTop: 8,
    color: '#666',
  },
});

export default ExamsScreen;