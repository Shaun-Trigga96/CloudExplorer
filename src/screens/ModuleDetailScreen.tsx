/* eslint-disable react/no-unstable-nested-components */
import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import axios from 'axios';
import Markdown from 'react-native-markdown-display';
import iconMap from '../utils/iconMap';
import { SvgProps } from 'react-native-svg';

const BASE_URL: string = 'http://10.0.2.2:5000'; // Android Emulator

// Define a type for the icon components
type IconComponent = React.ComponentType<SvgProps>;

const ModuleDetailScreen = ({ route }: { route: any }) => {
  const { moduleId } = route.params;
  const [module, setModule] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  console.log(`ModuleDetailScreen initialized with moduleId: ${moduleId}`);

  // Custom renderer for Markdown to handle SVG icons
  const renderMarkdownWithIcons = (content: string) => {
    // Replace ![icon:name] with a placeholder that we can render as a component
    const iconRegex = /!\[icon:([a-zA-Z0-9_-]+)\]/g; // Adjusted regex to allow underscores and hyphens
    let modifiedContent = content;
    const icons: { placeholder: string; iconName: string }[] = [];

    // Extract all icon references
    let match;
    let index = 0;
    while ((match = iconRegex.exec(content)) !== null) {
      const iconName = match[1]; // e.g., "compute_engine"
      const placeholder = `__ICON_${index}__`;
      icons.push({ placeholder, iconName });
      modifiedContent = modifiedContent.replace(match[0], placeholder);
      index++;
    }

    // Custom renderer for Markdown
    const renderer: any = {
      text: (node: any, _children: any, _parent: any, styles: any) => {
        const text = node.content;
        const iconMatch = icons.find((icon) => text.includes(icon.placeholder));
        if (iconMatch) {
          const IconComponent: IconComponent | undefined = iconMap[iconMatch.iconName as keyof typeof iconMap];
          if (IconComponent) {
            return (
              <View key={node.key} style={markdownStyles.iconContainer}>
                <IconComponent width={24} height={24} fill="#000" />
              </View>
            );
          } else {
            console.warn(`Icon component for "${iconMatch.iconName}" not found.`);
            return (
              <Text key={node.key} style={styles.text}>{`[Icon ${iconMatch.iconName} not found]`}</Text>
            );
          }
        }
        return <Text key={node.key} style={styles.text}>{text}</Text>;
      },
    };

    return (
      <Markdown style={markdownStyles} renderer={renderer}>
        {modifiedContent}
      </Markdown>
    );
  };

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
        console.error('Fetch module error:', err instanceof Error ? err.message : 'Unknown error');
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
      // eslint-disable-next-line no-catch-shadow, @typescript-eslint/no-shadow
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

      {/* Display section content as markdown */}
      <Text style={styles.contentTitle}>Module Notes:</Text>

      {sections && sections.length > 0 ? (
        <>
          {sections.map((section) => (
            <View key={section.id} style={styles.markdownContainer}>
              {renderMarkdownWithIcons(section.content || 'No content available')}
            </View>
          ))}
        </>
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
  // ... (rest of your styles)
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
  sectionsContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#444',
  },
  sectionItem: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  sectionItemOrder: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  }
});

export default ModuleDetailScreen;
