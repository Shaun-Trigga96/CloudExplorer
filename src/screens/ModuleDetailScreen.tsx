import React, { useEffect, useState, useRef } from 'react';
import { View, ScrollView, StyleSheet, Text, Animated, TouchableOpacity } from 'react-native';
import axios from 'axios';
import Markdown from 'react-native-markdown-display';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from 'react-native-paper';
import iconMap from '../utils/iconMap';
import {REACT_APP_BASE_URL} from '@env';

const BASE_URL = REACT_APP_BASE_URL; 

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

const preprocessMarkdownWithIcons = (content: string) => {
  const iconRegex = /!\[icon:([a-zA-Z0-9-_]+)\]/g;
  let modifiedContent = content;
  const replacements: { placeholder: string; component: JSX.Element }[] = [];

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
          <View key={placeholder} style={markdownStyles.iconContainer}>
            <IconComponent width={80} height={80} fill="#1a73e8" />
          </View>
        ),
      });
    } else {
      replacements.push({
        placeholder,
        component: (
          <Text key={placeholder} style={markdownStyles.iconFallback}>
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

const ModuleDetailScreen = ({ route, navigation }: { route: any, navigation: any }) => {
  const { moduleId } = route.params;
  const [module, setModule] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    }).start();
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

      navigation.navigate('QuizzesScreen', { moduleId });
    } catch (error) {
      console.error('Failed to mark module as complete:', error);
      setError('Failed to save progress. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!module) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        ref={scrollViewRef}
        onScroll={handleScroll}
        scrollEventThrottle={400}
      >
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <Text style={styles.title}>{module.title || 'No title'}</Text>
          <Text style={styles.description}>{module.description || 'No description'}</Text>
        </Animated.View>

        {sections && sections.length > 0 ? (
          sections.map((section, sectionIndex) => {
            const { modifiedContent, replacements } = preprocessMarkdownWithIcons(
              section.content || 'No content available'
            );

            const segments = modifiedContent.split(/(?:__ICON_\d+__)/g);
            const renderedContent: JSX.Element[] = [];
            let replacementIndex = 0;

            segments.forEach((segment, i) => {
              if (segment) {
                renderedContent.push(
                  <Markdown key={`text-${i}`} style={markdownStyles}>
                    {segment}
                  </Markdown>
                );
              }
              if (replacementIndex < replacements.length) {
                const replacement = replacements[replacementIndex];
                if (modifiedContent.includes(replacement.placeholder)) {
                  renderedContent.push(replacement.component);
                  replacementIndex++;
                }
              }
            });

            const sectionStyle = [
              styles.sectionCard,
              { opacity: fadeAnim },
              sectionsRead[sectionIndex] ? styles.readSection : {},
            ];

            return (
              <Animated.View
                key={section.id}
                style={sectionStyle}
                ref={sectionRefs.current[sectionIndex]}
              >
                {renderedContent}
                {!sectionsRead[sectionIndex] && (
                  <TouchableOpacity
                    style={styles.markAsReadButton}
                    onPress={() => markSectionAsRead(sectionIndex)}
                  >
                    <Text style={styles.markAsReadText}>Mark as read</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            );
          })
        ) : (
          <Animated.View style={[styles.sectionCard, { opacity: fadeAnim }]}>
            <Text style={styles.noContent}>No content available</Text>
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.completeButtonContainer}>
        <Button
          mode="contained"
          onPress={handleModuleCompletion}
          loading={isLoading}
          disabled={!allContentRead || isLoading}
          style={allContentRead ? styles.completeButton : styles.disabledButton}
        >
          {allContentRead ? 'Complete & Continue to Quiz' : 'Please read all content'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 80,
  },
  header: {
    backgroundColor: '#ffffff',
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
    color: '#202124',
    marginBottom: 10,
    fontFamily: 'System',
  },
  description: {
    fontSize: 16,
    color: '#5f6368',
    lineHeight: 22,
    fontFamily: 'System',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  readSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#34a853',
  },
  noContent: {
    fontSize: 16,
    color: '#5f6368',
    textAlign: 'center',
    padding: 20,
    fontFamily: 'System',
  },
  loadingText: {
    fontSize: 18,
    color: '#5f6368',
    textAlign: 'center',
    padding: 20,
    fontFamily: 'System',
  },
  errorText: {
    fontSize: 16,
    color: '#d93025',
    textAlign: 'center',
    padding: 20,
    fontFamily: 'System',
  },
  markAsReadButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e8f0fe',
    borderRadius: 20,
    marginTop: 10,
  },
  markAsReadText: {
    color: '#1a73e8',
    fontSize: 14,
    fontWeight: '500',
  },
  completeButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  completeButton: {
    backgroundColor: '#1a73e8',
  },
  disabledButton: {
    backgroundColor: '#9aa0a6',
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: '#202124',
    lineHeight: 24,
    fontFamily: 'System',
  },
  heading1: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a73e8',
    marginTop: 20,
    marginBottom: 10,
    fontFamily: 'System',
  },
  heading2: {
    fontSize: 20,
    fontWeight: '600',
    color: '#202124',
    marginTop: 15,
    marginBottom: 8,
    fontFamily: 'System',
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5f6368',
    marginTop: 12,
    marginBottom: 6,
    fontFamily: 'System',
  },
  paragraph: {
    marginBottom: 16,
    lineHeight: 24,
  },
  list_item: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet_list: {
    marginBottom: 16,
    paddingLeft: 10,
  },
  code_block: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    fontFamily: 'monospace',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
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
    color: '#d93025',
    marginVertical: 8,
    fontFamily: 'System',
  },
  text: {
    fontSize: 16,
    color: '#202124',
    lineHeight: 24,
    fontFamily: 'System',
  },
});

export default ModuleDetailScreen;
