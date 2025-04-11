// c:\Users\thabi\Desktop\CloudExplorer\src\screens\ModuleDetailScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Text, Animated, TouchableOpacity } from 'react-native';
import axios from 'axios';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, ActivityIndicator } from 'react-native-paper'; // Added ActivityIndicator
import iconMap from '../utils/iconMap';
import {REACT_APP_BASE_URL} from '@env';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { useNavigation } from '@react-navigation/native';
import { useTheme as useCustomTheme } from '../context/ThemeContext'; // Import your custom theme hook

const BASE_URL = REACT_APP_BASE_URL;

type QuizzesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'QuizzesDetail'>;

// --- Define Theme Colors (Matching other screens) ---
const lightColors = {
  background: '#F0F2F5',
  surface: '#FFFFFF',
  primary: '#007AFF',
  text: '#1C1C1E',
  textSecondary: '#6E6E73',
  border: '#D1D1D6',
  error: '#FF3B30',
  success: '#34C759', // Green for read section border
  disabledButtonBackground: '#A0A0A0', // Grey for disabled button
  buttonText: '#FFFFFF',
  markdownCodeBackground: '#f5f5f5',
  markAsReadBackground: '#e8f0fe',
  markAsReadText: '#1a73e8',
  bottomBarBackground: 'rgba(255, 255, 255, 0.9)',
};

const darkColors = {
  background: '#000000',
  surface: '#1C1C1E',
  primary: '#0A84FF',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#3A3A3C',
  error: '#FF453A',
  success: '#32D74B', // Brighter green
  disabledButtonBackground: '#555555', // Darker grey for disabled button
  buttonText: '#FFFFFF',
  markdownCodeBackground: '#2C2C2E',
  markAsReadBackground: '#2C2C2E', // Use a dark background
  markAsReadText: '#0A84FF', // Use primary blue text
  bottomBarBackground: 'rgba(26, 26, 26, 0.9)', // Dark translucent
};
// --- End Theme Colors ---

interface Answer {
  letter: string;
  answer: string;
  uniqueKey: string;
}

interface QuestionType {
  question: string;
  answers: Answer[];
  correctAnswer: string;
  explanation: string;
}

interface Quiz extends QuestionType {
  id: number;
}

const useIsContentRead = (sectionRefs: React.RefObject<View>[]) => {
  const [sectionsRead, setSectionsRead] = useState<boolean[]>([]);
  const [allContentRead, setAllContentRead] = useState(false);

  useEffect(() => {
    if (sectionRefs.length > 0 && sectionsRead.length === 0) {
      setSectionsRead(new Array(sectionRefs.length).fill(false));
    }
  }, [sectionRefs.length, sectionsRead.length]);

  const markSectionAsRead = (index: number) => {
    setSectionsRead(prev => {
      const updated = [...prev];
      updated[index] = true;
      return updated;
    });
  };

  useEffect(() => {
    if (sectionsRead.length > 0 && sectionsRead.every(read => read)) {
      setAllContentRead(true);
    }
  }, [sectionsRead]);

  return { sectionsRead, markSectionAsRead, allContentRead };
};

// Function to create dynamic markdown styles
const createMarkdownStyles = (colors: typeof lightColors | typeof darkColors) => StyleSheet.create({
  body: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    fontFamily: 'System',
  },
  heading1: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 20,
    marginBottom: 10,
    fontFamily: 'System',
  },
  heading2: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 15,
    marginBottom: 8,
    fontFamily: 'System',
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 6,
    fontFamily: 'System',
  },
  paragraph: {
    marginBottom: 16,
    lineHeight: 24, // Keep line height consistent
    color: colors.text, // Ensure paragraph text uses theme color
  },
  list_item: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    color: colors.text, // Ensure list item text uses theme color
  },
  bullet_list: {
    marginBottom: 16,
    paddingLeft: 10,
  },
  code_block: {
    backgroundColor: colors.markdownCodeBackground,
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, // Shadow might need adjustment for dark mode
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    marginRight: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  iconFallback: {
    fontSize: 14,
    color: colors.error,
    marginVertical: 8,
    fontFamily: 'System',
  },
  text: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    fontFamily: 'System',
  },
});

const preprocessMarkdownWithIcons = (content: string, colors: typeof lightColors | typeof darkColors) => {
  const iconRegex = /!\[icon:([a-zA-Z0-9-_]+)\]/g;
  let modifiedContent = content;
  const replacements: { placeholder: string; component: JSX.Element }[] = [];
  const themedMarkdownStyles = createMarkdownStyles(colors); // Use themed styles

  let match;
  let index = 0;
  while ((match = iconRegex.exec(content)) !== null) {
    const iconName = match[1];
    const placeholder = `__ICON_${index}__`;
    const IconComponent = iconMap[iconName];
    if (IconComponent) {
      replacements.push({
        placeholder,
        component: (
          <View key={placeholder} style={themedMarkdownStyles.iconContainer}>
            <IconComponent width={80} height={80} fill={colors.primary} /> {/* Use theme primary color */}
          </View>
        ),
      });
    } else {
      replacements.push({
        placeholder,
        component: (
          <Text key={placeholder} style={themedMarkdownStyles.iconFallback}>
            [Icon not found: {iconName}]
          </Text>
        ),
      });
    }
    modifiedContent = modifiedContent.replace(match[0], placeholder);
    index++;
  }

  return { modifiedContent, replacements };
};

const ModuleDetailScreen = ({ route }: { route: any, navigation: any }) => {
  const navigation = useNavigation<QuizzesScreenNavigationProp>();
  const { isDarkMode } = useCustomTheme(); // Use your custom theme hook
  const colors = isDarkMode ? darkColors : lightColors; // Select color palette

  const { moduleId } = route.params;
  const [module, setModule] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true); // Added state for initial fetch loading

  const sectionRefs = useRef<React.RefObject<View>[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [, setVisibleSections] = useState<Set<number>>(new Set());

  const { sectionsRead, markSectionAsRead, allContentRead } = useIsContentRead(sectionRefs.current);

  useEffect(() => {
    const loadUserId = async () => {
      const id = await AsyncStorage.getItem('userId');
      setUserId(id);
    };
    loadUserId();
  }, []);

  console.log(`ModuleDetailScreen initialized with moduleId: ${moduleId}`);

  useEffect(() => {
    const fetchModuleData = async () => {
      setIsFetching(true); // Start fetching
      try {
        const moduleUrl = `${BASE_URL}/api/v1/modules/${moduleId}`; // Corrected URL
        console.log(`Attempting to fetch module from: ${moduleUrl}`);
        const moduleResponse = await axios.get(moduleUrl, { timeout: 10000 });
        setModule(moduleResponse.data);
      } catch (err) {
        console.error('Fetch module error:', err);
        setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    const fetchSections = async () => {
      try {
        const sectionsUrl = `${BASE_URL}/api/v1/modules/${moduleId}/sections`; // Corrected URL
        console.log(`Attempting to fetch sections from: ${sectionsUrl}`);
        const sectionsResponse = await axios.get(sectionsUrl, { timeout: 10000 });
        setSections(sectionsResponse.data);

        sectionRefs.current = sectionsResponse.data.map(() => React.createRef<View>());
      } catch (error) {
        console.error('Fetch sections error:', error);
        setError(`Failed to load sections: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    fetchModuleData();
    fetchSections();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      setIsFetching(false); // Stop fetching animation after fade-in
    });
  }, [moduleId, fadeAnim]);

  const handleScroll = ({ nativeEvent }: { nativeEvent: any }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 20;

    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      console.log('User has scrolled to the bottom of content');
      sectionRefs.current.forEach((_, index) => markSectionAsRead(index));
    }

    const visibleStart = contentOffset.y;
    const visibleEnd = visibleStart + layoutMeasurement.height;
    const newVisibleSections = new Set<number>();

    sections.forEach((section, index) => {
      const approximateSectionHeight = contentSize.height / sections.length;
      const sectionStart = index * approximateSectionHeight;
      const sectionEnd = sectionStart + approximateSectionHeight;

      if (
        (sectionStart >= visibleStart && sectionStart <= visibleEnd) ||
        (sectionEnd >= visibleStart && sectionEnd <= visibleEnd)
      ) {
        newVisibleSections.add(index);
        markSectionAsRead(index);
      }
    });

    setVisibleSections(newVisibleSections);
  };

  const handleModuleCompletion = async () => {
    if (!userId) {
      console.log('User not logged in');
      return;
    }

    setIsLoading(true);

    try {
      await axios.post(`${BASE_URL}/api/v1/users/${userId}/progress`, { // Corrected URL
        resourceType: 'module',
        resourceId: moduleId,
        action: 'complete',
        timestamp: new Date().toISOString(),
      });

      navigation.navigate('QuizzesDetail', { moduleId });
    } catch (error) {
      console.error('Failed to mark module as complete:', error);
      setError('Failed to save progress. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Loading and Error States ---
  if (isFetching) { // Show loading indicator during initial fetch
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading Module...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        {/* Optional: Add a retry button */}
      </View>
    );
  }

  // --- Main Content ---
  // Create dynamic markdown styles based on theme
  const themedMarkdownStyles = createMarkdownStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim, backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>{module?.title || 'No title'}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{module?.description || 'No description'}</Text>
        </Animated.View>

        {sections && sections.length > 0 ? (
          sections.map((section, sectionIndex) => {
            const { modifiedContent, replacements } = preprocessMarkdownWithIcons(
              section.content || 'No content available',
              colors // Pass colors to the preprocessor
            );

            const segments = modifiedContent.split(/(?:__ICON_\d+__)/g);
            const renderedContent: JSX.Element[] = [];
            let replacementIndex = 0;

            segments.forEach((segment, i) => {
              if (segment) {
                renderedContent.push(
                  <Markdown key={`text-${i}`} style={themedMarkdownStyles}>
                    {segment}
                  </Markdown>
                );
              }
              if (replacementIndex < replacements.length) {
                const replacement = replacements[replacementIndex];
                // Check if the placeholder exists in the original modified content before adding
                if (modifiedContent.includes(replacement.placeholder)) {
                    renderedContent.push(replacement.component);
                    replacementIndex++;
                }
              }
            });

            const sectionStyle = [
              styles.sectionCard,
              {
                opacity: fadeAnim,
                backgroundColor: colors.surface,
                borderColor: colors.border, // Add border color
                borderWidth: isDarkMode ? 1 : 0, // Add border in dark mode
              },
              sectionsRead[sectionIndex] ? [styles.readSection, { borderLeftColor: colors.success }] : {},
            ];

            return (
              <Animated.View
                key={section.id}
                style={sectionStyle}
                ref={sectionRefs.current[sectionIndex]}>
                {renderedContent}
              </Animated.View>
            );
          })
        ) : (
          <Animated.View style={[styles.sectionCard, { opacity: fadeAnim, backgroundColor: colors.surface }]}>
            <Text style={[styles.noContent, { color: colors.textSecondary }]}>No content available</Text>
          </Animated.View>
        )}
      </ScrollView>

      <View style={[
          styles.completeButtonContainer,
          { backgroundColor: colors.bottomBarBackground, borderTopColor: colors.border }
      ]}>
        <Button
          textColor={colors.buttonText} // Ensure text color contrasts with button background
          mode="contained"
          onPress={handleModuleCompletion}
          loading={isLoading}
          disabled={!allContentRead || isLoading}
          style={allContentRead ? styles.completeButton : styles.disabledButton}
          buttonColor={allContentRead ? colors.primary : colors.disabledButtonBackground} // Use theme colors for button background
        >
          {isLoading
            ? 'Saving...'
            : allContentRead
            ? 'Complete & Continue to Quiz'
            : 'Please read all content'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor applied dynamically
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 80, // Space for the bottom button
  },
  header: {
    // backgroundColor applied dynamically
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    // color applied dynamically
    marginBottom: 10,
    fontFamily: 'System',
  },
  description: {
    fontSize: 16,
    // color applied dynamically
    lineHeight: 22,
    fontFamily: 'System',
  },
  sectionCard: {
    // backgroundColor applied dynamically
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    // borderColor and borderWidth applied dynamically
  },
  readSection: {
    borderLeftWidth: 4,
    // borderLeftColor applied dynamically
  },
  noContent: {
    fontSize: 16,
    // color applied dynamically
    textAlign: 'center',
    padding: 20,
    fontFamily: 'System',
  },
  loadingText: {
    fontSize: 18,
    // color applied dynamically
    textAlign: 'center',
    padding: 20,
    fontFamily: 'System',
  },
  errorText: {
    fontSize: 16,
    // color applied dynamically
    textAlign: 'center',
    padding: 20,
    fontFamily: 'System',
  },
  markAsReadButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    // backgroundColor applied dynamically
    borderRadius: 20,
    marginTop: 10,
  },
  markAsReadText: {
    fontSize: 14,
    // color applied dynamically
    fontWeight: '500',
  },
  completeButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // backgroundColor applied dynamically
    padding: 15,
    borderTopWidth: 1,
    // borderTopColor applied dynamically
  },
  completeButton: {
    // backgroundColor applied dynamically via buttonColor prop
  },
  disabledButton: {
    // backgroundColor applied dynamically via buttonColor prop
  },
  loadingContainer: { // Added for initial fetch loading
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor applied dynamically
  },
});

// Markdown styles are now created dynamically by createMarkdownStyles function

export default ModuleDetailScreen;
