// c:\Users\thabi\Desktop\CloudExplorer\src\screens\HomeScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Button, ActivityIndicator } from 'react-native-paper';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import axios from 'axios';
import { REACT_APP_BASE_URL } from '@env';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useCustomTheme } from '../context/ThemeContext';
import { useActiveLearningPath } from '../context/ActiveLearningPathContext';
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

interface Props {
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

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

  // --- Active Learning Path Context ---
  const { setActivePath } = useActiveLearningPath();

  // --- Component State ---
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [showPathSelector, setShowPathSelector] = useState<boolean>(!hasActivePath);
  const [pathStartError, setPathStartError] = useState<string | null>(null);
  // Track which path was explicitly selected by the user
  const [userSelectedPath, setUserSelectedPath] = useState<{providerId: string, pathId: string} | null>(null);

  // --- Fetch Available Providers and Paths ---
  const fetchOptions = useCallback(async () => {
    console.log('[HomeScreen] Fetching options...');
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const [providersResponse, pathsResponse] = await Promise.all([
        axios.get<ProvidersResponse>(`${BASE_URL}/api/v1/providers`),
        axios.get<PathsResponse>(`${BASE_URL}/api/v1/paths/all`)
      ]);

      console.log('[HomeScreen] Providers response:', providersResponse.data);
      console.log('[HomeScreen] Paths response:', pathsResponse.data);

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
      console.log('[HomeScreen] Finished fetching options.');
    }
  }, []); // Empty dependency array, fetchOptions doesn't depend on component state

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]); // fetchOptions is stable due to useCallback

  // --- Update showPathSelector based on hasActivePath after initial load ---
  useEffect(() => {
    if (!loadingSelections && !optionsLoading) {
      setShowPathSelector(!hasActivePath);
    }
  }, [hasActivePath, loadingSelections, optionsLoading]);

  // --- Log State for Debugging ---
  useEffect(() => {
    console.log('[HomeScreen] Learning paths state updated:', {
      activeLearningPath,
      allLearningPaths,
      hasActivePath,
    });
  }, [activeLearningPath, allLearningPaths, hasActivePath]);

  // --- Combined Loading and Error States ---
  const isLoading = loadingSelections || optionsLoading;
  const error = optionsError || selectionsError || pathStartError;

  // --- Event Handlers (Wrapped in useCallback) ---
  const handleProviderSelect = useCallback((providerId: string) => {
    console.log('[HomeScreen] Selected provider:', providerId);
    setSelectedProvider(providerId);
    setSelectedPath(null); // Reset path when provider changes
    setPathStartError(null); // Clear previous errors
    setUserSelectedPath(null); // Reset user selection when provider changes
  }, [setSelectedProvider, setSelectedPath, setPathStartError, setUserSelectedPath]);

  const handlePathSelect = useCallback((pathId: string, providerId: string) => {
    console.log('[HomeScreen] Selected path:', pathId, 'for provider:', providerId);
    setSelectedPath(pathId);
    setPathStartError(null); // Clear previous errors
    // Store the user's explicit selection
    setUserSelectedPath({ providerId, pathId });
  }, [setSelectedPath, setPathStartError, setUserSelectedPath]);

  const navigateToMainApp = useCallback((providerId: string, pathId: string) => {
    console.log(`[HomeScreen] Setting active path context: Provider=${providerId}, Path=${pathId}`);
    setActivePath(providerId, pathId); // Set context *before* navigating

    console.log(`[HomeScreen] Navigating to MainApp with params:`, { provider: providerId, path: pathId });

    // Navigate to 'MainApp' and pass the selected provider and path IDs
    navigation.navigate('MainApp', { provider: providerId, path: pathId });
  }, [navigation, setActivePath]);

  const handleStartLearning = useCallback(async () => {
    // Use user's explicit selection if available, otherwise fallback to selected values
    const pathToStart = userSelectedPath || 
                      (selectedProvider && selectedPath ? 
                       { providerId: selectedProvider, pathId: selectedPath } : 
                       null);
    
    if (!pathToStart) {
      console.warn('[HomeScreen] Missing provider or path');
      setPathStartError('Please select both a provider and a learning path.');
      return;
    }

    setPathStartError(null); // Clear previous errors
    try {
      const selectedPathInfo = availablePaths[pathToStart.providerId]?.find(
        path => path.id === pathToStart.pathId
      );
      if (!selectedPathInfo) throw new Error('Selected path information not found');

      console.log('[HomeScreen] Starting new learning path via hook:', {
        providerId: pathToStart.providerId,
        pathId: pathToStart.pathId,
        pathName: selectedPathInfo.name
      });

      await startNewPath(pathToStart.providerId, pathToStart.pathId);

      console.log('[HomeScreen] New path started, navigating to MainApp');
      // Use the explicit user selection
      navigateToMainApp(pathToStart.providerId, pathToStart.pathId);

    } catch (err: any) {
      console.error('[HomeScreen] Error starting path:', {
        message: err.message,
        response: err.response?.data,
      });
      const errorMessage = handleError(err, setPathStartError) || 'Failed to start learning path.';
      setPathStartError(errorMessage);
    }
  }, [userSelectedPath, selectedProvider, selectedPath, availablePaths, startNewPath, navigateToMainApp, setPathStartError]);

  const handleContinuePath = useCallback((providerId: string, pathId: string) => {
    console.log('[HomeScreen] Continuing existing path:', { providerId, pathId });
    // Store the user's explicit selection
    setUserSelectedPath({ providerId, pathId });
    // Directly use the path the user clicked on, not the active path
    navigateToMainApp(providerId, pathId);
  }, [navigateToMainApp, setUserSelectedPath]);

  const handleShowPathSelector = useCallback(() => {
    console.log('[HomeScreen] Showing path selector');
    setShowPathSelector(true);
    setSelectedProvider(null); // Reset selections when showing selector
    setSelectedPath(null);
    setPathStartError(null);
    setUserSelectedPath(null); // Reset user selection when showing selector
  }, [setShowPathSelector, setSelectedProvider, setSelectedPath, setPathStartError, setUserSelectedPath]);

  const handleRetry = useCallback(() => {
    console.log('[HomeScreen] Retrying on error');
    setOptionsError(null);
    setPathStartError(null);
    // Decide what to refresh based on the error type
    if (selectionsError) {
      console.log('[HomeScreen] Retrying: Refreshing selections');
      refreshSelections();
    }
    if (optionsError) {
      console.log('[HomeScreen] Retrying: Fetching options');
      fetchOptions(); // Call the stable fetchOptions function
    }
  }, [selectionsError, optionsError, refreshSelections, fetchOptions, setOptionsError, setPathStartError]);

  // --- Render Selection Card (Wrapped in useCallback) ---
  const renderSelectionCard = useCallback((
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
  ), [colors, isDarkMode]);

  // --- Loading View ---
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

  // --- Error View ---
  if (error) {
    return (
      <SafeAreaView style={[homeStyles.container, { backgroundColor: colors.background }]}>
        <View style={homeStyles.errorContainer}>
          <Text style={[homeStyles.errorText, { color: colors.error }]}>{error}</Text>
          <Button
            mode="contained"
            onPress={handleRetry} // Use the useCallback wrapped handler
            style={[homeStyles.retryButton, { backgroundColor: colors.primary }]}
            labelStyle={{ color: colors.buttonText }}
          >
            Retry
          </Button>
        </View>
      </SafeAreaView>
    );
  }

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
                console.warn(`[HomeScreen] Missing provider info: providerId=${path.providerId}`);
                return null; // Don't render if provider info is missing
              }

              const isActive =
                activeLearningPath?.providerId === path.providerId &&
                activeLearningPath?.pathId === path.pathId;

              const pathName = pathInfo?.name || path.name || `Path ${path.pathId}`; // Fallback name

              return (
                <TouchableOpacity
                  key={`${path.providerId}-${path.pathId}-${index}`} // More robust key
                  style={[
                    homeStyles.pathCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isActive ? colors.primary : colors.border,
                      borderWidth: isActive ? 2 : isDarkMode ? 1 : 0,
                    },
                  ]}
                  onPress={() => handleContinuePath(path.providerId, path.pathId)} // Pass the specific path
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
              onPress={handleShowPathSelector} // Use handler
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

        {/* Provider Selection */}
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

        {/* Path Selection (Conditional) */}
        {selectedProvider && availablePaths[selectedProvider] && (
          <Animated.View entering={FadeIn.duration(500).delay(400)} style={homeStyles.section}>
            <Text style={[homeStyles.sectionTitle, { color: colors.text }]}>2. Choose Learning Path</Text>
            {availablePaths[selectedProvider].length > 0 ? (
              availablePaths[selectedProvider].map((path) =>
                renderSelectionCard(
                  path,
                  // Check against user's explicit selection if available, otherwise use selectedPath
                  (userSelectedPath && 
                   userSelectedPath.providerId === selectedProvider && 
                   userSelectedPath.pathId === path.id) || 
                  selectedPath === path.id,
                  () => handlePathSelect(path.id, selectedProvider) // Pass both path and provider
                )
              )
            ) : (
              <Text style={{ color: colors.textSecondary }}>No paths available for this provider.</Text>
            )}
          </Animated.View>
        )}

        {/* Start Button (Conditional) */}
        {(selectedPath || userSelectedPath) && (
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

        {/* Cancel Button (Conditional) */}
        {hasActivePath && showPathSelector && (
          <Animated.View entering={FadeIn.duration(500).delay(700)}>
            <Button
              mode="text"
              onPress={() => {
                console.log('[HomeScreen] Cancel path selector');
                setShowPathSelector(false); // Go back to showing existing paths
                setUserSelectedPath(null); // Reset user selection when canceling
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