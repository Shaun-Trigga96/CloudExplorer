import React from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native'; // Add Image import
import { Card, Title, Paragraph, Button } from 'react-native-paper';

interface Exam {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: number; // Change to number for require() references
}

const ExamsScreen = () => {
  const exams: Exam[] = [
    {
      id: '1',
      title: 'Cloud Engineer',
      description: 'Professional Cloud Engineer Certification Practice Exam',
      duration: '2 hours',
      icon: require('../assets/images/cloud-engineer.png'),
    },
    {
      id: '2',
      title: 'Cloud Architect',
      description: 'Professional Cloud Architect Certification Practice Exam',
      duration: '2 hours',
      icon: require('../assets/images/cloud-architect.png'),
    },
    {
      id: '3',
      title: 'Data Engineer',
      description: 'Professional Data Engineer Certification Practice Exam',
      duration: '2 hours',
      icon: require('../assets/images/data-engineer.png'),
    },
    {
      id: '4',
      title: 'Security Engineer',
      description: 'Professional Security Engineer Certification Practice Exam',
      duration: '2 hours',
      icon: require('../assets/images/security-engineer.png'),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {exams.map((exam) => (
        <Card key={exam.id} style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Image
                source={exam.icon}
                style={styles.icon}
                resizeMode="contain"
              />
              <Title style={styles.title}>{exam.title}</Title>
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
  icon: {
    width: 52,
    height: 52,
    marginRight: 12,
  },
  title: {
    marginLeft: 8,
  },
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