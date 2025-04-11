// c:\Users\thabi\Desktop\CloudExplorer\src\screens\HomeScreen.tsx
import React, { useEffect, useState } from 'react'; // Added useEffect
import { View, StyleSheet, Image, ActivityIndicator } from 'react-native'; // Added ActivityIndicator
import { Button, Text, Card } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme as useCustomTheme } from '../context/ThemeContext'; // Import your custom theme hook
import auth from '@react-native-firebase/auth'; // Import Firebase Auth
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// --- Define Theme Colors (Matching other screens) ---
const lightColors = {
  background: '#F0F2F5',
  surface: '#FFFFFF',
  primary: '#007AFF',
  text: '#1C1C1E',
  textSecondary: '#6E6E73',
  border: '#D1D1D6',
  buttonText: '#FFFFFF', // Explicitly define button text color
};

const darkColors = {
  background: '#000000',
  surface: '#1C1C1E',
  primary: '#0A84FF',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#3A3A3C',
  buttonText: '#FFFFFF', // Explicitly define button text color
};
// --- End Theme Colors ---

// Moved FeatureItem outside HomeScreen as it doesn't depend on HomeScreen's state directly
const FeatureItem = ({ icon, text }: { icon: string; text: string }) => {
  // Use custom theme hook here too for consistency
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <View style={[styles.featureItem, { backgroundColor: colors.surface }]}>
      {/* Use primary color from theme */}
      <Icon name={icon} size={24} color={colors.primary} style={styles.featureIcon} />
      {/* Use text color from theme */}
      <Text variant="bodyMedium" style={[styles.featureText, { color: colors.text }]}>
        {text}
      </Text>
    </View>
  );
};


const HomeScreen = ({ navigation }: Props) => {
  const { isDarkMode } = useCustomTheme(); // Use your custom theme hook
  const colors = isDarkMode ? darkColors : lightColors; // Select color palette
  const [checkingAuth, setCheckingAuth] = useState(true); // State to show loading indicator

  // --- Check Auth Status on Mount ---
  useEffect(() => {
    // Use onAuthStateChanged for a more reliable check, including initial state
    const subscriber = auth().onAuthStateChanged(async (user) => {
      console.log('Auth State Changed:', user ? `User UID: ${user.uid}` : 'No User');
      // Also check AsyncStorage as a fallback/confirmation
      const storedUserId = await AsyncStorage.getItem('userId');
      console.log('Stored User ID:', storedUserId);

      if (user || storedUserId) {
        console.log('User logged in, navigating to MainApp...');
        // Replace the current screen with MainApp so user can't go back to Home
        navigation.replace('MainApp');
      } else {
        console.log('User not logged in, staying on HomeScreen.');
        // Only stop checking once we confirm the user is NOT logged in
        setCheckingAuth(false);
      }
      // Note: We don't setCheckingAuth(false) if user IS logged in,
      // because the screen will unmount during navigation anyway.
    });

    // Cleanup subscriber on unmount
    return subscriber;
  }, [navigation]); // Dependency array includes navigation

  // --- Show Loading Indicator While Checking Auth ---
  if (checkingAuth) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Checking login status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Render Home Screen Content if Not Logged In ---
  return (
    // Apply background color from theme
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View
        entering={FadeIn.duration(1000)}
        // Apply surface color from theme
        style={[styles.headerSection, { backgroundColor: colors.surface }]}
      >
        <Image
          source={require('../assets/images/cloud_explorer.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {/* Apply text color from theme */}
        <Text variant="displayMedium" style={[styles.title, { color: colors.text }]}>
          Cloud Explorer
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.duration(1200)} style={styles.cardWrapper}>
        {/* Apply surface color and conditional border */}
        <Card style={[
            styles.card,
            {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: isDarkMode ? 1 : 0, // Add border in dark mode
            }
        ]}>
          <Card.Content>
            {/* Apply text color */}
            <Text variant="titleLarge" style={[styles.cardTitle, { color: colors.text }]}>
              Welcome to GCP Learning
            </Text>
            {/* Apply secondary text color */}
            <Text variant="bodyLarge" style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
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
      </Animated.View>

      <Animated.View entering={FadeIn.duration(1400)} style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Auth')} // Navigate to Auth screen first
          // Apply primary color
          style={[styles.button, { backgroundColor: colors.primary }]}
          contentStyle={styles.buttonContent}
          // Apply button text color
          labelStyle={[styles.buttonText, { color: colors.buttonText }]}
        >
          Get Started
        </Button>
      </Animated.View>
    </SafeAreaView>
  );
};


// --- Updated Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor applied dynamically
    justifyContent: 'space-between',
  },
  loadingContainer: { // Added for loading state
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    // backgroundColor applied dynamically
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
    // color applied dynamically
    textAlign: 'center',
    fontFamily: 'System',
  },
  cardWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    // backgroundColor applied dynamically
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    // borderColor and borderWidth applied dynamically
  },
  cardTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    // color applied dynamically
    marginBottom: 12,
    fontFamily: 'System',
  },
  cardSubtitle: {
    textAlign: 'center',
    fontSize: 16,
    // color applied dynamically
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
    // backgroundColor applied dynamically
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  featureIcon: {
    // Removed size/tintColor here, handled by Icon component props
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    // color applied dynamically
    fontFamily: 'System',
    flex: 1, // Allow text to wrap
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    // backgroundColor applied dynamically
    borderRadius: 12,
    elevation: 4,
  },
  buttonContent: {
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    // color applied dynamically
    fontFamily: 'System',
  },
});

export default HomeScreen;
