import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, useTheme, Card } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen = ({ navigation }: Props) => {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerSection}>
        <Icon name="cloud" size={48} color={theme.colors.primary} />
        <Text variant="displayMedium" style={styles.title}>
          Cloud Explorer
        </Text>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>
            Welcome to GCP Learning
          </Text>
          <Text variant="bodyLarge" style={styles.cardSubtitle}>
            Your journey to mastering Google Cloud Platform starts here
          </Text>
          <View style={styles.featuresContainer}>
            <FeatureItem
              icon="book-open-variant"
              text="Interactive Learning Modules"
            />
            <FeatureItem
              icon="checkbox-marked-circle-outline"
              text="Practice Quizzes"
            />
            <FeatureItem
              icon="certificate"
              text="Certification Prep"
            />
          </View>
        </Card.Content>
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('MainApp')}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Get Started
        </Button>
      </View>
    </SafeAreaView>
  );
};

const FeatureItem = ({ icon, text }: { icon: string; text: string }) => {
  const theme = useTheme();
  return (
    <View style={styles.featureItem}>
      <Icon name={icon} size={24} color={theme.colors.primary} />
      <Text variant="bodyMedium" style={styles.featureText}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  title: {
    marginTop: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 20,
    marginVertical: 16,
  },
  cardTitle: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  featuresContainer: {
    marginTop: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  featureText: {
    marginLeft: 12,
  },
  buttonContainer: {
    padding: 20,
    marginTop: 'auto',
  },
  button: {
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});

export default HomeScreen;