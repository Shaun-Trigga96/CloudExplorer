import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Button, Text, useTheme, Card } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen = ({ navigation }: Props) => {

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(1000)} style={styles.headerSection}>
        <Image
          source={require('../assets/images/cloud_explorer.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text variant="displayMedium" style={styles.title}>
          Cloud Explorer
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(1200)} style={styles.cardWrapper}>
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
                icon="checkbox-marked-circle-outline" // Fixed typo
                text="Practice Quizzes"
              />
              <FeatureItem
                icon="certificate"
                text="Certification Prep"
              />
            </View>
          </Card.Content>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(1400)} style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('MainApp')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonText}
        >
          Get Started
        </Button>
      </Animated.View>
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
    backgroundColor: '#f0f2f5',
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#202124',
    textAlign: 'center',
    fontFamily: 'System',
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 12,
    fontFamily: 'System',
  },
  cardSubtitle: {
    textAlign: 'center',
    fontSize: 16,
    color: '#5f6368',
    marginBottom: 20,
    opacity: 0.8,
    fontFamily: 'System',
  },
  featuresContainer: {
    marginTop: 20,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  featureIcon: {
    width: 28,
    height: 28,
    marginRight: 12,
    tintColor: '#1a73e8',
  },
  featureText: {
    fontSize: 16,
    color: '#202124',
    fontFamily: 'System',
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#1a73e8',
    borderRadius: 12,
    elevation: 4,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'System',
  },
});

export default HomeScreen;