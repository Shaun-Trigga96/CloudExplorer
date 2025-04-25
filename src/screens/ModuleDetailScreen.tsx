// c:\Users\thabi\Desktop\CloudExplorer\src\screens\ModuleDetailScreen.tsx
import React, { FC, useEffect, useState, useRef, useCallback } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
  Alert,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import iconMap from '../utils/iconMap';
import { REACT_APP_BASE_URL } from '@env';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import HeaderCard from '../components/moduleDetail/HeaderCard';
import SectionCard from '../components/moduleDetail/SectionCard';
import CompleteButton from '../components/moduleDetail/CompleteButton';
import { ErrorView, LoadingView } from '../components/common';
import { useIsContentRead } from '../components/hooks/useIsContentRead';
import { Module, Section } from '../types/moduleDetail';
import { useCustomTheme } from '../context/ThemeContext';
import { handleError } from '../utils/handleError';
import { createMarkdownStyles } from '../utils/createMarkdownStyles';
import { lightColors, darkColors } from '../styles/colors';
import { useActiveLearningPath } from '../context/ActiveLearningPathContext'; // Import context hook

const BASE_URL = REACT_APP_BASE_URL;

type ModuleDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ModuleDetail'>
type ModuleDetailScreenRouteProp = RouteProp<RootStackParamList, 'ModuleDetail'>;

interface ModuleDetailScreenProps {
  route: ModuleDetailScreenRouteProp;
  navigation: ModuleDetailScreenNavigationProp;
}

// --- preprocessMarkdownWithIcons function (with logging) ---
const preprocessMarkdownWithIcons = (
  content: string,
  colors: typeof lightColors | typeof darkColors
): JSX.Element[] => {
  // --- ADD LOGGING ---
  console.log('[preprocessMarkdown] Received content length:', content?.length || 0);
  if (!content || !content.trim()) { // Check if content is empty or just whitespace
    console.log('[preprocessMarkdown] Content is empty or whitespace, returning fallback.');
    return [
      <Text
        key="no-content-processed" // Use a different key
        style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', fontFamily: 'System', paddingVertical: 20 }}
      >
        No content available for this section.
      </Text>,
    ];
  }
  // --- END LOGGING ---

  const iconRegex = /!\[icon:([a-zA-Z0-9-_]+)\]/g;
  let modifiedContent = content;
  const replacements: { placeholder: string; component: JSX.Element }[] = [];
  const themedMarkdownStyles = createMarkdownStyles(colors);
  // --- ADD LOGGING ---
  console.log('[preprocessMarkdown] Text color from styles:', themedMarkdownStyles?.text?.color);
  // --- END LOGGING ---

  let match;
  let index = 0;
  while ((match = iconRegex.exec(content)) !== null) {
    const iconName = match[1];
    const placeholder = `__ICON_${index}__`;
    const IconComponent = iconMap[iconName] as React.FC<{ width: number; height: number; fill: string }> | undefined;

    replacements.push({
      placeholder,
      component: IconComponent ? (
        <View key={`icon-${iconName}-${index}`} style={themedMarkdownStyles.iconContainer}>
          <IconComponent width={80} height={80} fill={colors.primary} />
        </View>
      ) : (
        <Text key={`icon-fallback-${iconName}-${index}`} style={themedMarkdownStyles.iconFallback}>
          [Icon not found: {iconName}]
        </Text>
      ),
    });

    modifiedContent = modifiedContent.replace(match[0], placeholder);
    index++;
  }

  const segments = modifiedContent.split(/(__ICON_\d+__)/g);
  const renderedContent: JSX.Element[] = [];
  let replacementIndex = 0;

  segments.forEach((segment, i) => {
    if (segment.match(/__ICON_\d+__/)) {
      if (replacementIndex < replacements.length && replacements[replacementIndex].placeholder === segment) {
        renderedContent.push(replacements[replacementIndex].component);
        replacementIndex++;
      }
    } else if (segment.trim()) { // This check is important
      // --- ADD LOGGING ---
      console.log(`[preprocessMarkdown] Adding Markdown segment ${i}, length: ${segment.length}`);
      // --- END LOGGING ---
      renderedContent.push(
        <Markdown key={`markdown-${i}`} style={themedMarkdownStyles}>
          {segment}
        </Markdown>
      );
    } else {
      // --- ADD LOGGING ---
      console.log(`[preprocessMarkdown] Skipping empty/whitespace segment ${i}`);
      // --- END LOGGING ---
    }
  });

  // --- ADD LOGGING ---
  console.log('[preprocessMarkdown] Final renderedContent array length:', renderedContent.length);
  // --- END LOGGING ---

  // Return fallback if renderedContent is still empty after processing
  return renderedContent.length > 0
    ? renderedContent
    : [
      <Text
        key="no-content-after-processing" // Different key again
        style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', fontFamily: 'System', paddingVertical: 20 }}
      >
        Content processed but resulted in no displayable elements.
      </Text>,
    ];
};
// --- End of preprocessMarkdownWithIcons ---


const ModuleDetailScreen: FC<ModuleDetailScreenProps> = ({ route, navigation }) => {
  const { colors } = useCustomTheme().theme;
  const [module, setModule] = useState<Module | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For completion action
  const [isFetching, setIsFetching] = useState(true); // For initial data load

  // Track last scroll position to detect when user reaches bottom
  const [lastScrollY, setLastScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const { moduleId } = route.params; // Get IDs from route

  // --- Use context hook (though values aren't directly used in fetch here, good to have) ---
  const { activeProviderId, activePathId } = useActiveLearningPath();

  const fadeAnim = useSharedValue(0);

  const sectionRefs = useRef<React.RefObject<View>[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const { sectionsRead, markSectionAsRead, markAllSectionsAsRead, allContentRead } = useIsContentRead(sectionRefs.current);

  // Load user ID on mount
  useEffect(() => {
    const loadUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      setUserId(id);
      console.log('[ModuleDetailScreen] Loaded userId:', id);
    };
    loadUserId();
  }, []);

  // Fetch module data and sections
  const fetchData = useCallback(async () => {
    console.log(`[ModuleDetailScreen] useEffect triggered. ModuleId: ${moduleId}. Fetching data...`); // <-- ADD THIS
    setIsFetching(true);
    setError(null);
    setSections([]); // Clear previous sections
    setModule(null);  // Clear previous module
    fadeAnim.value = 0;
    console.log(`[ModuleDetailScreen] Fetching data for module: ${moduleId}`);

    try {
      // Fetch module details
      const moduleResponse = await axios.get<{ data: Module }>( // Assuming backend wraps in { data: ... }
        `${BASE_URL}/api/v1/modules/${moduleId}`,
        { timeout: 10000 }
      );
      console.log('[ModuleDetailScreen] Fetched Module Response:', JSON.stringify(moduleResponse.data, null, 2));
      // Adjust based on actual response structure
      const fetchedModule = moduleResponse.data.data || moduleResponse.data;
      if (!fetchedModule || typeof fetchedModule !== 'object') {
        throw new Error("Invalid module data format received.");
      }
      setModule(fetchedModule);

      // Fetch sections
      // Define expected response structure
      interface SectionsResponse {
        status: string;
        data: Section[]; // This interface correctly matches the API response
      }
      const sectionsResponse = await axios.get<SectionsResponse>(
        `${BASE_URL}/api/v1/modules/${moduleId}/sections`,
        { timeout: 10000 }
      );
      console.log(`[ModuleDetailScreen] Fetched Sections Response for module ${moduleId}:`, JSON.stringify(sectionsResponse.data, null, 2));

      // --- Adjust data access based on actual API response ---
      // Example: If response is { status: 'success', data: [...] }
      //const fetchedSections = sectionsResponse.data?.data || []; // <--- Commented out, good
      // Example: If response is { status: 'success', data: { sections: [...] } }
      // Change this:
      // const fetchedSections = sectionsResponse.data?.data || []; // INCORRECT

      // To this:
      const fetchedSections = sectionsResponse.data?.data || []; // CORRECT for { status: '...', data: [...] }

      if (!Array.isArray(fetchedSections)) {
        console.error("[ModuleDetailScreen] Fetched sections data is not an array:", fetchedSections);
        setError("Invalid data format received for sections."); // <--- THIS IS BEING TRIGGERED
        setSections([]); // Set to empty array on invalid format
      } else {
        sectionRefs.current = fetchedSections.map(() => React.createRef<View>());
        setSections(fetchedSections);
        console.log(`[ModuleDetailScreen] Sections state updated. Count: ${fetchedSections.length}`);
        if (fetchedSections.length > 0) {
          console.log("[ModuleDetailScreen] First section content snippet:", fetchedSections[0]?.content?.substring(0, 100) || 'N/A');
        }
      }

      // Start animation after data is set
      fadeAnim.value = withTiming(1, { duration: 600 });

    } catch (err) {
      console.error(`[ModuleDetailScreen] Error during fetch for module ${moduleId}:`, err);
      handleError(err, setError);
    } finally {
      // Use setTimeout to ensure loading state changes after animation starts
      setTimeout(() => setIsFetching(false), 100); // Short delay
      console.log('[ModuleDetailScreen] Fetching complete.');
    }
  }, [moduleId, fadeAnim]); // Dependency: only refetch if moduleId changes

  useEffect(() => {
    console.log(`[ModuleDetailScreen] useEffect triggered by moduleId change. ModuleId: ${moduleId}. Fetching data...`);
    fetchData();
    // }, [fetchData]); // OLD DEPENDENCY

  }, [moduleId]); // NEW DEPENDENCY - Directly depend on moduleId

  // Simple and reliable approach - mark sections read based on time and scroll position
  const [sectionTimeTracking, setSectionTimeTracking] = useState<{ [key: number]: number }>({});

  // Called when a section becomes visible
  const startTrackingSection = (index: number) => {
    if (!sectionTimeTracking[index]) {
      console.log(`[ModuleDetailScreen] Start tracking section ${index}`);
      setSectionTimeTracking(prev => ({
        ...prev,
        [index]: Date.now()
      }));
    }
  };

  // On scroll, check what sections are now visible
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;

    // Update scroll position state variables
    setLastScrollY(contentOffset.y);
    setContentHeight(contentSize.height);
    setViewportHeight(layoutMeasurement.height);

    // Check if we've scrolled to bottom (mark all read)
    const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50; // 50px threshold
    if (isNearBottom && contentSize.height > layoutMeasurement.height) { // Ensure content is scrollable
      console.log('[ModuleDetailScreen] Reached near bottom, marking all as read.');
      markAllSectionsAsRead();
      return; // No need to check individual sections if bottom is reached
    }

    // Simplified approach: as user scrolls, assume they're reading sections in order
    // Estimate which section is currently visible based on scroll position
    // This is approximate and might need refinement based on actual section heights
    const scrollProgress = contentOffset.y / (contentSize.height - layoutMeasurement.height || 1); // Avoid division by zero
    const estimatedSectionIndex = Math.floor(scrollProgress * sections.length);

    // Mark current and previous sections as being viewed
    for (let i = 0; i <= Math.min(estimatedSectionIndex + 1, sections.length - 1); i++) { // Track current and next one
      startTrackingSection(i);
    }
  };

  // Check every second if sections have been viewed long enough to mark as read
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const readThreshold = 2000; // 2 seconds of viewing time to mark as read

      Object.entries(sectionTimeTracking).forEach(([indexStr, startTime]) => {
        const index = parseInt(indexStr);
        if (now - startTime > readThreshold && !sectionsRead[index]) {
          console.log(`[ModuleDetailScreen] Marking section ${index} as read (time threshold met).`);
          markSectionAsRead(index);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sectionTimeTracking, sectionsRead, markSectionAsRead]);

  // Handle scroll end event for better detection
  const handleScrollEnd = () => {
    // Additional check when scrolling ends
    const isAtBottom = lastScrollY + viewportHeight >= contentHeight - 50; // 50px threshold

    if (isAtBottom && contentHeight > viewportHeight) { // Ensure content is scrollable
      console.log('[ModuleDetailScreen] Scroll ended at bottom, marking all as read.');
      markAllSectionsAsRead();
    }

    // Check if the user has scrolled through at least 90% of content
    const scrollPercentage = (lastScrollY + viewportHeight) / (contentHeight || 1); // Avoid division by zero
    if (scrollPercentage > 0.9) {
      console.log('[ModuleDetailScreen] Scrolled > 90%, marking all as read.');
      markAllSectionsAsRead();
    }
  };

  // Handle module completion
  const handleModuleCompletion = async () => {
    console.log('[ModuleDetailScreen] handleModuleCompletion called.');
    if (!userId) {
      setError('User not logged in');
      Alert.alert('Error', 'You must be logged in to complete a module.');
      console.error('[ModuleDetailScreen] Completion failed: User not logged in.');
      return;
    }
    // Additional check to prevent false positives
    if (!allContentRead) {
      console.log('[ModuleDetailScreen] Completion blocked: Not all content marked as read.');
      Alert.alert(
        "Not Finished",
        "Please scroll through all the content before completing.",
        [
          {
            text: "Keep Reading",
            style: "cancel"
          },
          {
            text: "Mark All Read",
            onPress: () => {
              console.log('[ModuleDetailScreen] User chose to Mark All Read.');
              markAllSectionsAsRead();
              // Optionally, immediately try completing again or let user press button again
              // handleModuleCompletion(); // Be careful with recursion
            }
          }
        ]
      );
      return;
    }

    setIsLoading(true); // Start loading indicator for completion action
    console.log('[ModuleDetailScreen] Attempting to post module completion...');
    try {
      const payload = {
        resourceType: 'module',
        resourceId: moduleId,
        action: 'complete',
        timestamp: new Date().toISOString(),
      };
      console.log('[ModuleDetailScreen] Completion Payload:', payload);

      await axios.post(`${BASE_URL}/api/v1/users/${userId}/progress`, payload);

      console.log('[ModuleDetailScreen] Module completed successfully. Navigating back.');
      // Navigate back to the previous screen (likely ModulesScreen or DashboardScreen)
      navigation.goBack();
    } catch (err) {
      console.error('[ModuleDetailScreen] Error completing module:', err);
      handleError(err, setError);
    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  // Force mark all content as read (debug/accessibility feature)
  const forceMarkAllAsRead = () => {
    console.log('[ModuleDetailScreen] Force marking all as read.');
    markAllSectionsAsRead();
    Alert.alert("Success", "All content marked as read.");
  };

  // Handle retry on error
  const handleRetry = () => {
    console.log('[ModuleDetailScreen] Retrying fetch...');
    fetchData(); // Call the main fetch function again
  };

  // --- Render loading state ---
  if (isFetching) {
    console.log('[ModuleDetailScreen] Rendering LoadingView.');
    return <LoadingView message="Loading module content..." />;
  }

  // --- Render error state ---
  if (error) {
    console.log('[ModuleDetailScreen] Rendering ErrorView:', error);
    return <ErrorView message={error} onRetry={handleRetry} />;
  }

  // --- Render main content ---
  console.log(`[ModuleDetailScreen] Rendering main content. Sections count: ${sections.length}`);
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd} // Check on drag release
        onMomentumScrollEnd={handleScrollEnd} // Check after momentum scroll finishes
        scrollEventThrottle={100} // Adjust frequency as needed (lower means more frequent)
        showsVerticalScrollIndicator={true}
      >
        {/* Header Card */}
        <HeaderCard
          title={module?.title || 'Module Title'}
          description={module?.description || 'Module description.'}
          fadeAnim={fadeAnim} // Pass the shared value directly
        />

        {/* Debug info (remove in production) */}
        <View style={styles.readStatusContainer}>
          <Text style={{ color: colors.primary }}>
            Read progress: {sectionsRead.filter(Boolean).length}/{sectionsRead.length}
          </Text>
          <TouchableOpacity
            style={styles.debugButton}
            onPress={forceMarkAllAsRead}
          >
            <Text style={styles.debugButtonText}>Mark All Read</Text>
          </TouchableOpacity>
        </View>

        {/* Section Cards */}
        {sections.length > 0 ? (
          sections.map((section, index) => {
            // --- ADD LOGGING INSIDE MAP ---
            console.log(`[ModuleDetailScreen] Rendering SectionCard ${index}, Title: ${section.title}, Has Content: ${!!section.content}`);
            // --- END LOGGING ---
            return (
              <SectionCard
                key={section.id || `section-${index}`} // Use section.id if available
                title={section.title || `Section ${index + 1}`}
                // Pass content, ensuring it's not null/undefined before processing
                content={preprocessMarkdownWithIcons(section.content || '', colors)}
                isRead={sectionsRead[index] || false}
                fadeAnim={fadeAnim} // Pass the shared value directly
                innerRef={sectionRefs.current[index]}
              />
            );
          })
        ) : (
          // Fallback if sections array is empty after fetch
          <SectionCard
            title="No Content Available"
            content={[
              <Text
                key="no-sections-found"
                style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 16, fontFamily: 'System' }}
              >
                No sections were found for this module.
              </Text>,
            ]}
            isRead={false}
            fadeAnim={fadeAnim} // Pass the shared value directly
            innerRef={React.createRef()}
          />
        )}
      </ScrollView>

      {/* Complete Button */}
      <CompleteButton
        isLoading={isLoading} // Use isLoading for the completion action
        allContentRead={allContentRead}
        onPress={handleModuleCompletion}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90, // Ensure space for the CompleteButton
  },
  readStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  debugButton: {
    backgroundColor: '#006699', // A distinct color for debug
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 14,
  }
});

export default ModuleDetailScreen;
