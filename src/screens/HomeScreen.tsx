// src/screens/HomeScreen.tsx
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import { darkColors, lightColors } from '../styles/colors';
import { useAuthCheck } from '../components/hooks/useAuthCheck';
import { LoadingView } from '../components/common/LoadingView';
import { homeStyles } from '../styles/homeStyles';
import { FeatureCard, HeaderSection } from '../components/home';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;
  const { checkingAuth } = useAuthCheck(navigation);

  if (checkingAuth) {
    return <LoadingView message="Checking login status..." />;
  }

  return (
    <SafeAreaView style={[homeStyles.container, { backgroundColor: colors.background }]}>
      <HeaderSection />
      <FeatureCard />
      <Button
        mode="contained"
        onPress={() => navigation.navigate('Auth')}
        style={[homeStyles.button, { backgroundColor: colors.primary }]}
        contentStyle={homeStyles.buttonContent}
        labelStyle={[homeStyles.buttonText, { color: colors.buttonText }]}
      >
        Get Started
      </Button>
    </SafeAreaView>
  );
};

export default HomeScreen;