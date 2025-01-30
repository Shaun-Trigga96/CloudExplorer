import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';
import CloudGeneric from '../assets/icons/cloud_generic.svg';
import CloudNetwork from '../assets/icons/cloud_network.svg';
import CloudStorage from '../assets/icons/cloud_storage.svg';
import ComputeEngine from '../assets/icons/compute_engine.svg';


interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  icon: React.FC;
}

const QuizzesScreen = () => {
  const quizzes: Quiz[] = [
    {
      id: '1',
      title: 'GCP Fundamentals',
      description: 'Test your knowledge of basic GCP concepts',
      questionCount: 20,
      icon: CloudGeneric,
    },
    {
      id: '2',
      title: 'Compute Services',
      description: 'Practice questions on GCP compute services',
      questionCount: 15,
      icon: ComputeEngine,
    },
    {
      id: '3',
      title: 'Storage Solutions',
      description: 'Questions about GCP storage options',
      questionCount: 15,
      icon: CloudStorage,
    },
    {
      id: '4',
      title: 'Networking',
      description: 'Test your GCP networking knowledge',
      questionCount: 20,
      icon: CloudNetwork,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {quizzes.map((quiz) => {
        const Icon = quiz.icon;
        return (
          <Card key={quiz.id} style={styles.card}>
            <Card.Content>
              <View style={styles.headerRow}>
                <View style={styles.iconContainer}>
                  <Icon width={24} height={24} {...(Icon as React.SVGProps<SVGSVGElement>)}/>
                </View>
                <Title style={styles.title}>{quiz.title}</Title>
              </View>
              <Paragraph>{quiz.description}</Paragraph>
              <Paragraph style={styles.questionCount}>
                {quiz.questionCount} Questions
              </Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained" onPress={() => {}}>
                Start Quiz
              </Button>
            </Card.Actions>
          </Card>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    marginRight: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
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
  questionCount: {
    marginTop: 8,
    color: '#666',
  },
});

export default QuizzesScreen;