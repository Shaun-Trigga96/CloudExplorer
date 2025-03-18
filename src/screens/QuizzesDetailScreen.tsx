import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import axios from 'axios';
import { Button, Card, Paragraph, Title } from 'react-native-paper';

const BASE_URL: string = 'http://10.0.2.2:5000';

interface Answer {
  letter: string;
  answer: string;
}

interface QuestionType {
  question: string;
  answers: Answer[];
  correctAnswer: string;
}

interface Quiz extends QuestionType {
  id: number;
}

const QuizzesDetailScreen = ({ route }: { route: any }) => {
  const { moduleId } = route.params;
  const [quiz, setQuiz] = useState<Quiz[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [moduleTitle, setModuleTitle] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      try {
        const moduleResponse = await axios.get(`${BASE_URL}/module/${moduleId}`);
        setModuleTitle(moduleResponse.data.title);

        const quizResponse = await axios.post(`${BASE_URL}/generate-quiz`, {
          moduleId,
        });
        const formattedQuiz = quizResponse.data.quiz
          .filter((q: Quiz) => {
            const isValidQuestion = q.question && q.question.trim().length > 0 &&
                                   (q.correctAnswer === 'True' || q.correctAnswer === 'False' ||
                                    ['a', 'b', 'c', 'd'].includes(q.correctAnswer));
            return isValidQuestion && (q.answers.length > 0 || q.correctAnswer === 'True' || q.correctAnswer === 'False');
          })
          .map((q: Quiz) => ({
            ...q,
            question: q.question.replace(/\s*\(question\)\s*/g, '').trim(),
            answers: q.answers.map((a: any) => ({
              letter: a.letter,
              answer: a.answer.replace(/\s*\(answer\)\s*/g, '').trim(),
            })),
          }));
        setQuiz(formattedQuiz);
      // eslint-disable-next-line no-catch-shadow, @typescript-eslint/no-shadow
      } catch (error: any) {
        console.error('Error fetching quiz:', error);
        if (error.response) {
          if (error.response.status === 403) {
            setError('Error: Invalid Hugging Face API Key. Please check your backend configuration.');
          } else if (error.response.status === 404) {
            setError('Module not found. Please check the module ID.');
          } else {
            setError(`Error fetching quiz: ${error.response.data?.error || error.response.statusText}`);
          }
        } else if (error.request) {
          setError('Network error: Unable to connect to server. Please check your connection.');
        } else {
          setError(`Error: ${error.message}`);
        }
      } finally {
        setLoading(false);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }
    };

    fetchQuiz();
  }, [moduleId, fadeAnim]);

  const handleAnswer = (questionId: number, answerLetter: string) => {
    setUserAnswers({ ...userAnswers, [questionId]: answerLetter });
  };

  const calculateScore = () => {
    let score = 0;
    if (quiz) {
      quiz.forEach((question) => {
        const userAnswer = userAnswers[question.id];
        if (
          userAnswer &&
          userAnswer.toLowerCase() === question.correctAnswer.toLowerCase()
        ) {
          score++;
        }
      });
    }
    return score;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  if (!quiz || !moduleTitle) {
    return null;
  }

  if (showResults) {
    const score = calculateScore();
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.resultCard, { opacity: fadeAnim }]}>
          <Title style={styles.resultTitle}>Your Score</Title>
          <Text style={styles.resultScore}>{score} / {quiz.length}</Text>
          <Button
            mode="contained"
            onPress={() => setShowResults(false)}
            style={styles.retryButton}
            labelStyle={styles.buttonText}
          >
            Try Again
          </Button>
        </Animated.View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Title style={styles.moduleTitle}>{moduleTitle} Quiz</Title>
        <Text style={styles.progress}>Progress: {Object.keys(userAnswers).length} / {quiz.length}</Text>
      </Animated.View>
      {quiz.map((question) => (
        <Animated.View key={question.id} style={[styles.card, { opacity: fadeAnim }]}>
          <Card.Content>
            <Paragraph style={styles.question}>{question.question}</Paragraph>
            {question.answers.length > 0 ? (
              <View style={styles.answerContainer}>
                {question.answers.map((answer) => (
                  <TouchableOpacity
                    key={answer.letter}
                    onPress={() => handleAnswer(question.id, answer.letter)}
                    style={[
                      styles.answerButton,
                      userAnswers[question.id] === answer.letter && styles.selectedAnswer,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.answerInner}>
                      <Text style={styles.answerLetter}>{answer.letter.toUpperCase()}</Text>
                      <Text style={styles.answerText}>{answer.answer}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => handleAnswer(question.id, question.correctAnswer)}
                style={[
                  styles.answerButton,
                  userAnswers[question.id] === question.correctAnswer && styles.selectedAnswer,
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.answerText}>
                  True / False: {question.correctAnswer}
                </Text>
              </TouchableOpacity>
            )}
          </Card.Content>
        </Animated.View>
      ))}
      <Button
        mode="contained"
        onPress={() => setShowResults(true)}
        style={styles.submitButton}
        labelStyle={styles.buttonText}
      >
        Submit Quiz
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  moduleTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a73e8',
    textAlign: 'center',
    marginBottom: 5,
    fontFamily: 'System',
  },
  progress: {
    fontSize: 14,
    color: '#5f6368',
    textAlign: 'center',
    fontFamily: 'System',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 15,
    lineHeight: 24,
    fontFamily: 'System',
  },
  answerContainer: {
    gap: 10,
  },
  answerButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  answerInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  answerLetter: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5f6368',
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  answerText: {
    fontSize: 16,
    color: '#202124',
    fontFamily: 'System',
  },
  selectedAnswer: {
    backgroundColor: '#1a73e8',
    borderColor: '#1a73e8',
    shadowOpacity: 0.2,
  },
  selectedAnswerText: {
    color: '#ffffff',
  },
  selectedAnswerLetter: {
    color: '#ffffff',
  },
  submitButton: {
    marginTop: 20,
    paddingVertical: 12,
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    fontFamily: 'System',
  },
  resultCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 10,
    fontFamily: 'System',
  },
  resultScore: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1a73e8',
    marginBottom: 20,
    fontFamily: 'System',
  },
  retryButton: {
    paddingVertical: 10,
    backgroundColor: '#34a853',
    borderRadius: 10,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#5f6368',
    fontFamily: 'System',
  },
  error: {
    padding: 20,
    fontSize: 16,
    color: '#d93025',
    textAlign: 'center',
    fontFamily: 'System',
  },
});

export default QuizzesDetailScreen;