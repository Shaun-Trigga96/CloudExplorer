import React, { FC, useEffect, useState, useRef } from 'react';
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

const BASE_URL = REACT_APP_BASE_URL;

type ModuleDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ModuleDetail'>;
type ModuleDetailScreenRouteProp = RouteProp<RootStackParamList, 'ModuleDetail'>;

interface ModuleDetailScreenProps {
  route: ModuleDetailScreenRouteProp;
  navigation: ModuleDetailScreenNavigationProp;
}

// --- preprocessMarkdownWithIcons function remains the same ---
const preprocessMarkdownWithIcons = (
  content: string,
  colors: typeof lightColors | typeof darkColors
): JSX.Element[] => {
  if (!content) {
    return [
      <Text
        key="no-content"
        style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', fontFamily: 'System' }}
      >
        No content available
      </Text>,
    ];
  }

  const iconRegex = /!\[icon:([a-zA-Z0-9-_]+)\]/g;
  let modifiedContent = content;
  const replacements: { placeholder: string; component: JSX.Element }[] = [];
  const themedMarkdownStyles = createMarkdownStyles(colors);

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
    } else if (segment.trim()) {
      renderedContent.push(
        <Markdown key={`markdown-${i}`} style={themedMarkdownStyles}>
          {segment}
        </Markdown>
      );
    }
  });

  return renderedContent.length > 0
    ? renderedContent
    : [
        <Text
          key="no-content"
          style={{ color: colors.textSecondary, fontSize: 16, textAlign: 'center', fontFamily: 'System' }}
        >
          No content available
        </Text>,
      ];
};
// --- End of preprocessMarkdownWithIcons ---


const ModuleDetailScreen: FC<ModuleDetailScreenProps> = ({ route, navigation }) => {
  const { moduleId } = route.params;
  const { colors } = useCustomTheme().theme;
  const [module, setModule] = useState<Module | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  // Track last scroll position to detect when user reaches bottom
  const [lastScrollY, setLastScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);


  const fadeAnim = useSharedValue(0);

  const sectionRefs = useRef<React.RefObject<View>[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  const { sectionsRead, markSectionAsRead, markAllSectionsAsRead, allContentRead } = useIsContentRead(sectionRefs.current);
  
  // Load user ID on mount
  useEffect(() => {
    const loadUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      setUserId(id);
    };
    loadUserId();
  }, []);
  
  // Fetch module data and sections
  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        const moduleResponse = await axios.get<Module>(`${BASE_URL}/api/v1/modules/${moduleId}`, { timeout: 10000 });
        setModule(moduleResponse.data);
      } catch (err) {
        handleError(err, setError);
      }
    };

    const fetchSections = async () => {
      try {
        const sectionsResponse = await axios.get<Section[]>(`${BASE_URL}/api/v1/modules/${moduleId}/sections`, {
          timeout: 10000,
        });
        sectionRefs.current = sectionsResponse.data.map(() => React.createRef<View>());
        setSections(sectionsResponse.data);
      } catch (err) {
        handleError(err, setError);
      }
    };

    setIsFetching(true);
    setError(null);
    fadeAnim.value = 0;

    Promise.all([fetchModuleData(), fetchSections()])
      .then(() => {
        fadeAnim.value = withTiming(1, { duration: 600 });
        setTimeout(() => setIsFetching(false), 600);
      })
      .catch(err => {
        setIsFetching(false);
      });
  }, [moduleId, fadeAnim]);

// Simple and reliable approach - mark sections read based on time and scroll position
const [sectionTimeTracking, setSectionTimeTracking] = useState<{[key: number]: number}>({});

// Called when a section becomes visible
const startTrackingSection = (index: number) => {
  if (!sectionTimeTracking[index]) {
    setSectionTimeTracking(prev => ({
      ...prev,
      [index]: Date.now()
    }));
  }
};

// On scroll, check what sections are now visible
const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
  const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
  
  // Check if we've scrolled to bottom (mark all read)
  const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
  if (isNearBottom) {
    markAllSectionsAsRead();
    return;
  }
  
  // Simplified approach: as user scrolls, assume they're reading sections in order
  // Start with the first section
  const scrollProgress = contentOffset.y / (contentSize.height - layoutMeasurement.height);
  const estimatedSectionIndex = Math.floor(scrollProgress * sections.length);
  
  // Mark current and previous sections as being viewed
  for (let i = 0; i <= Math.min(estimatedSectionIndex, sections.length - 1); i++) {
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
        markSectionAsRead(index);
      }
    });
  }, 1000);
  
  return () => clearInterval(interval);
}, [sectionTimeTracking, sectionsRead, markSectionAsRead]);
  // Handle scroll end event for better detection
  const handleScrollEnd = () => {
    // Additional check when scrolling ends
    const isAtBottom = lastScrollY + viewportHeight >= contentHeight - 50;
    
    if (isAtBottom) {
      markAllSectionsAsRead();
    }
    
    // Check if the user has scrolled through at least 90% of content
    const scrollPercentage = (lastScrollY + viewportHeight) / contentHeight;
    if (scrollPercentage > 0.9) {
      markAllSectionsAsRead();
    }
  };

  // Handle module completion
  const handleModuleCompletion = async () => {
    if (!userId) {
      setError('User not logged in');
      return;
    }
  // Additional check to prevent false positives
  if (!allContentRead) {
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
            markAllSectionsAsRead();
          }
        }
      ]
    );
    return;
  }

  setIsLoading(true);
  try {
    await axios.post(`${BASE_URL}/api/v1/users/${userId}/progress`, {
      resourceType: 'module',
      resourceId: moduleId,
      action: 'complete',
      timestamp: new Date().toISOString(),
    });
    
    // Navigate to quiz after successful completion
    navigation.navigate('QuizzesDetail', { moduleId });
  } catch (err) {
    handleError(err, setError);
    Alert.alert("Error", "Failed to mark module as complete. Please try again.");
  } finally {
    setIsLoading(false);
  }
};

// Force mark all content as read (debug/accessibility feature)
const forceMarkAllAsRead = () => {
  markAllSectionsAsRead();
  Alert.alert("Success", "All content marked as read.");
};

// Render loading state
if (isFetching) {
  return <LoadingView message="Loading module content..." />;
}

// Render error state
if (error) {
  return <ErrorView message={error} onRetry={() => {
    // Reset error and trigger fetch again
    setError(null);
    setIsFetching(true);
  }} />;
}

  // Handle retry on error
  const handleRetry = () => {
    setError(null);
    setIsFetching(true);
    setSections([]);
    setModule(null);
    fadeAnim.value = 0;

    const fetchModuleData = async () => {
      try {
        const moduleResponse = await axios.get<Module>(`${BASE_URL}/api/v1/modules/${moduleId}`, { timeout: 10000 });
        setModule(moduleResponse.data);
      } catch (err) {
        handleError(err, setError);
      }
    };

    const fetchSections = async () => {
      try {
        const sectionsResponse = await axios.get<Section[]>(`${BASE_URL}/api/v1/modules/${moduleId}/sections`, {
          timeout: 10000,
        });
        sectionRefs.current = sectionsResponse.data.map(() => React.createRef<View>());
        setSections(sectionsResponse.data);
      } catch (err) {
        handleError(err, setError);
      }
    };

    Promise.all([fetchModuleData(), fetchSections()])
      .then(() => {
        fadeAnim.value = withTiming(1, { duration: 600 });
        setTimeout(() => setIsFetching(false), 600);
      })
      .catch(err => {
        handleError(err, setError);
        setIsFetching(false);
      });
  };

  // Render loading state
  if (isFetching) {
    return <LoadingView message="Loading module content..." />;
  }

  // Render error state
  if (error) {
    return <ErrorView message={error} onRetry={handleRetry} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={100} // More frequent updates
        showsVerticalScrollIndicator={true}
      >
        {/* Header Card */}
        <HeaderCard
          title={module?.title || 'Module Title'}
          description={module?.description || 'Module description.'}
          fadeAnim={fadeAnim}
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
            return (
              <SectionCard
                key={section.id || `section-${index}`}
                title={section.title || `Section ${index + 1}`}
                content={preprocessMarkdownWithIcons(section.content || '', colors)}
                isRead={sectionsRead[index] || false}
                fadeAnim={fadeAnim}
                innerRef={sectionRefs.current[index]}
              />
            );
          })
        ) : (
          <SectionCard
            title="No Content"
            content={[
              <Text
                key="no-sections"
                style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 16, fontFamily: 'System' }}
              >
                No sections found for this module.
              </Text>,
            ]}
            isRead={false}
            fadeAnim={fadeAnim}
            innerRef={React.createRef()}
          />
        )}
      </ScrollView>

      {/* Complete Button */}
      <CompleteButton
        isLoading={isLoading}
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
    paddingBottom: 90,
  },
  readStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  debugButton: {
    backgroundColor: '#006699',
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