import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';

interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  icon: string;
}

const QuizzesScreen = () => {
  const quizzes: Quiz[] = [
    {
      id: '1',
      title: 'GCP Fundamentals',
      description: 'Test your knowledge of basic GCP concepts',
      questionCount: 20,
      icon: '📝',
    },
    {
      id: '2',
      title: 'Compute Services',
      description: 'Practice questions on GCP compute services',
      questionCount: 15,
      icon: '🖥️',
    },
    {
      id: '3',
      title: 'Storage Solutions',
      description: 'Questions about GCP storage options',
      questionCount: 15,
      icon: '💾',
    },
    {
      id: '4',
      title: 'Networking',
      description: 'Test your GCP networking knowledge',
      questionCount: 20,
      icon: '🌐',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {quizzes.map((quiz) => (
        <Card key={quiz.id} style={styles.card}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Title>{quiz.icon} {quiz.title}</Title>
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
  questionCount: {
    marginTop: 8,
    color: '#666',
  },
});

export default QuizzesScreen;