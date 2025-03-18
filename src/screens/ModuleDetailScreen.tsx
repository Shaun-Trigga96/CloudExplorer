import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Animated } from 'react-native';
import axios from 'axios';
import Markdown from 'react-native-markdown-display';
import iconMap from '../utils/iconMap'; // Ensure this file exports SVG components

const BASE_URL: string = 'http://10.0.2.2:5000'; // Android Emulator

// Preprocess Markdown content to replace icon syntax with custom components
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

const ModuleDetailScreen = ({ route }: { route: any }) => {
  const { moduleId } = route.params;
  const [module, setModule] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  console.log(`ModuleDetailScreen initialized with moduleId: ${moduleId}`);

  useEffect(() => {
    const fetchModuleData = async () => {
      try {
        const moduleUrl = `${BASE_URL}/module/${moduleId}`;
        console.log(`Attempting to fetch module from: ${moduleUrl}`);
        const moduleResponse = await axios.get(moduleUrl, { timeout: 10000 });
        console.log('Module response status:', moduleResponse.status);
        console.log('Module response data:', moduleResponse.data);
        setModule(moduleResponse.data);
      } catch (err) {
        console.error('Fetch module error:', err);
        setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    const fetchSections = async () => {
      try {
        const sectionsUrl = `${BASE_URL}/module/${moduleId}/sections`;
        console.log(`Attempting to fetch sections from: ${sectionsUrl}`);
        const sectionsResponse = await axios.get(sectionsUrl, { timeout: 10000 });
        console.log('Sections response status:', sectionsResponse.status);
        console.log('Sections response data:', sectionsResponse.data);
        setSections(sectionsResponse.data);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.title}>{module.title || 'No title'}</Text>
        <Text style={styles.description}>{module.description || 'No description'}</Text>
      </Animated.View>
      {sections && sections.length > 0 ? (
        sections.map((section) => {
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

          return (
            <Animated.View key={section.id} style={[styles.sectionCard, { opacity: fadeAnim }]}>
              {renderedContent}
            </Animated.View>
          );
        })
      ) : (
        <Animated.View style={[styles.sectionCard, { opacity: fadeAnim }]}>
          <Text style={styles.noContent}>No content available</Text>
        </Animated.View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
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
