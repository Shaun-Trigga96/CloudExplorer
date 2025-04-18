import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Button, ActivityIndicator } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from 'axios';
import { REACT_APP_BASE_URL } from '@env';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import { darkColors, lightColors } from '../styles/colors';
import { HeaderSection } from '../components/home';
import { useUserSelections } from '../components/hooks/useUserSelections';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { handleError } from '../utils/handleError';
import { 
  Provider, 
  PathResponse, 
  ProvidersResponse, 
  PathsResponse 
} from '../types/home';
import { homeStyles } from '../styles/homeStyles';

const BASE_URL = REACT_APP_BASE_URL;

type Props = NativeStackScreenProps<RootStackParamList, 'Home' | 'MainApp'>;

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;

  // --- State for Fetched Options ---
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [availablePaths, setAvailablePaths] = useState<{ [key: string]: PathResponse[] }>({});
  const [optionsLoading, setOptionsLoading] = useState<boolean>(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // --- User Selections Hook ---
  const {
    activeLearningPath,
    allLearningPaths,
    loading: loadingSelections,
    error: selectionsError,
    startNewPath,
    hasActivePath,
    refreshSelections,
  } = useUserSelections(navigation);

  const [selectedProvider, setSelectedProvider] = useState<string | null>(
    activeLearningPath?.providerId || null
  );
  const [selectedPath, setSelectedPath] = useState<string | null>(
    activeLearningPath?.pathId || null
  );
  const [showPathSelector, setShowPathSelector] = useState<boolean>(false);
  const [pathStartError, setPathStartError] = useState<string | null>(null);

  // --- Fetch Available Providers and Paths ---
  useEffect(() => {
    const fetchOptions = async () => {
      setOptionsLoading(true);
      setOptionsError(null);
      try {
        const [providersResponse, pathsResponse] = await Promise.all([
          axios.get<ProvidersResponse>(`${BASE_URL}/api/v1/providers`),
          axios.get<PathsResponse>(`${BASE_URL}/api/v1/paths/all`)
        ]);

        console.log('[HomeScreen] Providers response:', providersResponse.data);
        console.log('[HomeScreen] Paths response:', pathsResponse.data);

        // Check for API success status
        if (providersResponse.data.status !== 'success' || pathsResponse.data.status !== 'success') {
          throw new Error('Failed to fetch providers or paths');
        }

        setAvailableProviders(providersResponse.data.data.providers || []);
        setAvailablePaths(pathsResponse.data.data.paths || {});
      } catch (err: any) {
        console.error('[HomeScreen] Error fetching options:', {
          message: err.message,
          response: err.response?.data,
        });
        const errorMessage = handleError(err, setOptionsError) || 'Could not load learning options.';
        setOptionsError(errorMessage);
      } finally {
        setOptionsLoading(false);
      }
    };

    fetchOptions();
  }, []);

  // --- Log State for Debugging ---
  useEffect(() => {
    console.log('[HomeScreen] Learning paths state:', {
      activeLearningPath,
      allLearningPaths,
      hasActivePath,
    });
  }, [activeLearningPath, allLearningPaths, hasActivePath]);

  // --- Combined Loading and Error States ---
  const isLoading = loadingSelections || optionsLoading;
  const error = optionsError || selectionsError || pathStartError;

  if (isLoading) {
    return (
      <SafeAreaView style={[homeStyles.container, { backgroundColor: colors.background }]}>
        <View style={homeStyles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[homeStyles.loadingText, { color: colors.text }]}>
            {loadingSelections ? 'Loading your progress...' : 'Loading learning options...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[homeStyles.container, { backgroundColor: colors.background }]}>
        <View style={homeStyles.errorContainer}>
          <Text style={[homeStyles.errorText, { color: colors.error }]}>{error}</Text>
          <Button
            mode="contained"
            onPress={() => {
              console.log('[HomeScreen] Retrying on error');
              setOptionsError(null);
              setPathStartError(null);
              refreshSelections();
              if (optionsError) {
                const fetchOptions = async () => {
                  setOptionsLoading(true);
                  try {
                    const [providersResponse, pathsResponse] = await Promise.all([
                      axios.get<ProvidersResponse>(`${BASE_URL}/api/v1/providers`),
                      axios.get<PathsResponse>(`${BASE_URL}/api/v1/paths/all`)
                    ]);
                    setAvailableProviders(providersResponse.data.data.providers || []);
                    setAvailablePaths(pathsResponse.data.data.paths || {});
                    setOptionsError(null);
                  } catch (err) {
                    handleError(err, setOptionsError);
                  } finally {
                    setOptionsLoading(false);
                  }
                };
                fetchOptions();
              }
            }}
            style={[homeStyles.retryButton, { backgroundColor: colors.primary }]}
            labelStyle={{ color: colors.buttonText }}
          >
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // --- Event Handlers ---
  const handleProviderSelect = (providerId: string) => {
    console.log('[HomeScreen] Selected provider:', providerId);
    setSelectedProvider(providerId);
    setSelectedPath(null);
    setPathStartError(null);
  };

  const handlePathSelect = (pathId: string) => {
    console.log('[HomeScreen] Selected path:', pathId);
    setSelectedPath(pathId);
    setPathStartError(null);
  };

  const handleStartLearning = async () => {
    if (!selectedProvider || !selectedPath) {
      console.warn('[HomeScreen] Missing provider or path');
      setPathStartError('Please select both a provider and a learning path.');
      return;
    }

    setPathStartError(null);
    try {
      // Find the selected path info to get the name
      const selectedPathInfo = availablePaths[selectedProvider]?.find(
        path => path.id === selectedPath
      );
      
      if (!selectedPathInfo) {
        throw new Error('Selected path information not found');
      }
      
      console.log('[HomeScreen] Starting learning path:', {
        providerId: selectedProvider,
        pathId: selectedPath,
        pathName: selectedPathInfo.name
      });
      
      await startNewPath(selectedProvider, selectedPath);
      console.log('[HomeScreen] Path started, navigating to MainApp');
      navigation.navigate('MainApp', {
        provider: selectedProvider,
        path: selectedPath,
      });
    } catch (err: any) {
      console.error('[HomeScreen] Error starting path:', {
        message: err.message,
        response: err.response?.data,
      });
      const errorMessage = handleError(err, setPathStartError) || 'Failed to start learning path.';
      setPathStartError(errorMessage);
    }
  };

  const handleShowPathSelector = () => {
    console.log('[HomeScreen] Showing path selector');
    setShowPathSelector(true);
    setSelectedProvider(null);
    setSelectedPath(null);
    setPathStartError(null);
  };

  // --- Render Selection Card (works with both Provider and PathResponse types) ---
  const renderSelectionCard = (
    item: Provider | PathResponse,
    isSelected: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      key={item.id}
      style={[
        homeStyles.selectionCard,
        {
          backgroundColor: colors.surface,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : isDarkMode ? 1 : 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDarkMode ? 0.1 : 0.05,
          shadowRadius: 4,
          elevation: 3,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {item.logoUrl && (
        <Image 
          source={{ uri: item.logoUrl }} 
          style={homeStyles.logo} 
          resizeMode="contain" 
        />
      )}
      <Text style={[homeStyles.cardText, { color: colors.text }]}>{item.name}</Text>
    </TouchableOpacity>
  );

  // --- Existing Paths View ---
  if (hasActivePath && !showPathSelector) {
    return (
      <SafeAreaView style={[homeStyles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={homeStyles.scrollContent}>
          <HeaderSection />
          <Animated.View entering={FadeIn.duration(500)} style={homeStyles.welcomeSection}>
            <Text style={[homeStyles.welcomeTitle, { color: colors.text }]}>Your Learning Paths</Text>
            <Text style={[homeStyles.welcomeText, { color: colors.textSecondary }]}>
              Continue your existing path or start a new one.
            </Text>
          </Animated.View>
          <Animated.View entering={FadeIn.duration(500).delay(200)} style={homeStyles.section}>
            <Text style={[homeStyles.sectionTitle, { color: colors.text }]}>Current Paths</Text>
            {allLearningPaths.map((path, index) => {
              const provider = availableProviders.find((p) => p.id === path.providerId);
              const pathInfo = availablePaths[path.providerId]?.find((p) => p.id === path.pathId);

              if (!provider) {
                console.warn(
                  `[HomeScreen] Missing provider info: providerId=${path.providerId}`
                );
                return null;
              }

              const isActive =
                activeLearningPath?.providerId === path.providerId &&
                activeLearningPath?.pathId === path.pathId;
              
              // Use path.name as fallback if pathInfo is not available
              const pathName = pathInfo?.name || path.name || `Path ${path.pathId}`;

              return (
                <TouchableOpacity
                  key={`${path.providerId}-${path.pathId}-${index}`}
                  style={[
                    homeStyles.pathCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isActive ? colors.primary : colors.border,
                      borderWidth: isActive ? 2 : isDarkMode ? 1 : 0,
                    },
                  ]}
                  onPress={() => {
                    console.log('[HomeScreen] Navigating to path:', {
                      providerId: path.providerId,
                      pathId: path.pathId,
                    });
                    navigation.navigate('MainApp', {
                      provider: path.providerId,
                      path: path.pathId,
                    });
                  }}
                >
                  <View style={homeStyles.pathCardContent}>
                    {provider.logoUrl && (
                      <Image
                        source={{ uri: provider.logoUrl }}
                        style={homeStyles.smallLogo}
                        resizeMode="contain"
                      />
                    )}
                    <View style={homeStyles.pathInfo}>
                      <Text style={[homeStyles.pathName, { color: colors.text }]}>{pathName}</Text>
                      <Text style={[homeStyles.providerName, { color: colors.textSecondary }]}>
                        {provider.name}
                      </Text>
                      <View style={homeStyles.progressBar}>
                        <View
                          style={[
                            homeStyles.progressFill,
                            {
                              width: `${path.progress.completionPercentage}%`,
                              backgroundColor: colors.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[homeStyles.progressText, { color: colors.textSecondary }]}>
                        {path.progress.completionPercentage}% complete
                      </Text>
                    </View>
                  </View>
                  {isActive && (
                    <View style={[homeStyles.activeBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[homeStyles.activeBadgeText, { color: colors.buttonText }]}>
                        Active
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </Animated.View>
          <Animated.View entering={FadeIn.duration(500).delay(400)}>
            <Button
              mode="contained"
              onPress={handleShowPathSelector}
              style={[homeStyles.button, { backgroundColor: colors.primary }]}
              contentStyle={homeStyles.buttonContent}
              labelStyle={[homeStyles.buttonText, { color: colors.buttonText }]}
              icon="plus-circle-outline"
            >
              Start New Learning Path
            </Button>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // --- Path Selection View ---
  return (
    <SafeAreaView style={[homeStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={homeStyles.scrollContent}>
        <HeaderSection />
        <Animated.View entering={FadeIn.duration(500)} style={homeStyles.welcomeSection}>
          <Text style={[homeStyles.welcomeTitle, { color: colors.text }]}>
            {hasActivePath ? 'Start a New Learning Path' : 'Welcome to Cloud Explorer'}
          </Text>
          <Text style={[homeStyles.welcomeText, { color: colors.textSecondary }]}>
            {hasActivePath
              ? 'Select a cloud provider and certification path to begin learning.'
              : "Let's set up your learning journey."}
          </Text>
        </Animated.View>
        <Animated.View entering={FadeIn.duration(500).delay(200)} style={homeStyles.section}>
          <Text style={[homeStyles.sectionTitle, { color: colors.text }]}>1. Choose Cloud Provider</Text>
          {availableProviders.length > 0 ? (
            availableProviders.map((provider) =>
              renderSelectionCard(
                provider,
                selectedProvider === provider.id,
                () => handleProviderSelect(provider.id)
              )
            )
          ) : (
            <Text style={{ color: colors.textSecondary }}>No providers available.</Text>
          )}
        </Animated.View>
        {selectedProvider && availablePaths[selectedProvider] && (
          <Animated.View entering={FadeIn.duration(500).delay(400)} style={homeStyles.section}>
            <Text style={[homeStyles.sectionTitle, { color: colors.text }]}>2. Choose Learning Path</Text>
            {availablePaths[selectedProvider].length > 0 ? (
              availablePaths[selectedProvider].map((path) =>
                renderSelectionCard(
                  path,
                  selectedPath === path.id,
                  () => handlePathSelect(path.id)
                )
              )
            ) : (
              <Text style={{ color: colors.textSecondary }}>No paths available for this provider.</Text>
            )}
          </Animated.View>
        )}
        {selectedPath && (
          <Animated.View entering={FadeIn.duration(500).delay(600)} exiting={FadeOut.duration(200)}>
            <Button
              mode="contained"
              onPress={handleStartLearning}
              style={[homeStyles.button, { backgroundColor: colors.primary }]}
              contentStyle={homeStyles.buttonContent}
              labelStyle={[homeStyles.buttonText, { color: colors.buttonText }]}
              icon="arrow-right-circle-outline"
            >
              Start Learning
            </Button>
          </Animated.View>
        )}
        {hasActivePath && (
          <Animated.View entering={FadeIn.duration(500).delay(700)}>
            <Button
              mode="text"
              onPress={() => {
                console.log('[HomeScreen] Cancel path selector');
                setShowPathSelector(false);
              }}
              style={homeStyles.cancelButton}
              labelStyle={{ color: colors.textSecondary }}
            >
              Cancel
            </Button>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;