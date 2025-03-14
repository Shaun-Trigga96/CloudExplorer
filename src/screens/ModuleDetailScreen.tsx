/* eslint-disable no-catch-shadow */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import axios from 'axios';
import Markdown from 'react-native-markdown-display';
import iconMap from '../utils/iconMap'; // Ensure this file exports SVG components

const BASE_URL: string = 'http://10.0.2.2:5000'; // Android Emulator

// Preprocess Markdown content to replace icon syntax with custom components
const preprocessMarkdownWithIcons = (content: string) => {
  const iconRegex = /!\[icon:([a-zA-Z0-9-_]+)\]/g; // Updated regex to handle underscores
  let modifiedContent = content;
  const replacements: { placeholder: string; component: JSX.Element }[] = [];

  // Extract all icon references and replace with a unique identifier
  let match;
  let index = 0;
  while ((match = iconRegex.exec(content)) !== null) {
    const iconName = match[1]; // e.g., "compute_engine"
    const placeholder = `__ICON_${index}__`;
    const IconComponent = iconMap[iconName];
    if (IconComponent) {
      replacements.push({
        placeholder,
        component: (
          <View key={placeholder} style={markdownStyles.iconContainer}>
            <IconComponent width={100} height={100} fill="#000" />
          </View>
        ),
      });
    } else {
      replacements.push({
        placeholder,
        component: (
          <Text key={placeholder} style={markdownStyles.iconContainer}>
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
      // eslint-disable-next-line @typescript-eslint/no-shadow
      } catch (error) {
        console.error('Fetch sections error:', error);
        setError(`Failed to load sections: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    fetchModuleData();
    fetchSections();
  }, [moduleId]);

  if (error) {
    return <Text style={styles.error}>{error}</Text>;
  }

  if (!module) {
    return <Text style={styles.loading}>Loading...</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{module.title || 'No title'}</Text>
      <Text style={styles.description}>{module.description || 'No description'}</Text>
      {sections && sections.length > 0 ? (
        sections.map((section) => {
          const { modifiedContent, replacements } = preprocessMarkdownWithIcons(
            section.content || 'No content available'
          );

          // Split content into segments based on placeholders
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
            <View key={section.id} style={styles.markdownContainer}>
              {renderedContent}
            </View>
          );
        })
      ) : (
        <Text style={styles.noSections}>No content available</Text>
      )}
    </ScrollView>
  );
};

// Styles for the component
const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    lineHeight: 24,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 8,
    color: '#444',
  },
  markdownContainer: {
    marginBottom: 20,
  },
  noSections: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  loading: {
    padding: 16,
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  error: {
    padding: 16,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});

// Styles for markdown content
const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#222',
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  heading3: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#444',
  },
  paragraph: {
    marginBottom: 16,
    lineHeight: 24,
  },
  list_item: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bullet_list: {
    marginBottom: 16,
  },
  code_block: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 4,
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 8,
    marginVertical: 4,
  },
  text: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
});

export default ModuleDetailScreen;