import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Card, Title, Paragraph, Button } from 'react-native-paper';
import CloudStorage from '../assets/icons/cloud_storage.svg';
import ComputeEngine from '../assets/icons/compute_engine.svg';
import CloudFunctions from '../assets/icons/cloud_functions.svg';
import KubernetesEngine from '../assets/icons/google_kubernetes_engine.svg';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useNavigation } from '@react-navigation/native';

interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  icon: React.FC;
}

type NavigationProp = StackNavigationProp<RootStackParamList, 'QuizzesDetail'>;

const QuizzesScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const quizzes: Quiz[] = [
    {
      id: 'compute-engine', // Updated IDs
      title: 'Compute Engine',
      description: 'Test your knowledge of basic GCP concepts',
      questionCount: 20,
      icon: ComputeEngine,
    },
    {
      id: 'cloud-storage',// Updated IDs
      title: 'Cloud Storage',
      description: 'Practice questions on GCP cloud storage services',
      questionCount: 15,
      icon: CloudStorage,
    },
    {
      id: 'cloud-functions',// Updated IDs
      title: '  Cloud Functions',
      description: 'Practice Questions about Cloud Functions',
      questionCount: 15,
      icon: CloudFunctions,
    },
    {
      id: 'kubernetes-engine',// Updated IDs
      title: ' Google Kubernetes Engine',
      description: 'Test Kubernets knowledge',
      questionCount: 20,
      icon: KubernetesEngine,
    },
  ];

  const handleStartQuiz = (moduleId: string) => {
    navigation.navigate('QuizzesDetail', { moduleId: moduleId});
  };

  return (
    <ScrollView style={styles.container}>
      {quizzes.map((quiz) => {
        const Icon = quiz.icon;
        return (
          <Card key={quiz.id} style={styles.card}>
            <Card.Content>
              <View style={styles.headerRow}>
                <View style={styles.iconContainer}>
                  <Icon width={34} height={34} {...(Icon as React.SVGProps<SVGSVGElement>)}/>
                </View>
                <Title style={styles.title}>{quiz.title}</Title>
              </View>
              <Paragraph>{quiz.description}</Paragraph>
              <Paragraph style={styles.questionCount}>
                {quiz.questionCount} Questions
              </Paragraph>
            </Card.Content>
            <Card.Actions>
              <Button mode="contained"
                onPress={() => handleStartQuiz(quiz.id)}>
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
