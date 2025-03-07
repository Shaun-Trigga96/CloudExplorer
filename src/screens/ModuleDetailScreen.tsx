import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import axios from 'axios';

const BASE_URL: string = process.env.BASE_URL || 'http://localhost:5000';

const ModuleDetailScreen = ({ route }: { route: any }) => {
  const { moduleId } = route.params;
  const [module, setModule] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  console.log(`ModuleDetailScreen initialized with moduleId: ${moduleId}`);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        console.log(`Attempting to fetch module from ${BASE_URL}/module/${moduleId}`);
        const moduleResponse = await axios.get(`${BASE_URL}/module/${moduleId}`, {
          timeout: 30000,
        });
        console.log('Successfully fetched module data:', moduleResponse.data);
        setModule(moduleResponse.data);

        // Fetch sections
        console.log(`Attempting to fetch sections from ${BASE_URL}/module/${moduleId}/sections`);
        const sectionsResponse = await axios.get(`${BASE_URL}/module/${moduleId}/sections`, {
          timeout: 30000,
        });
        console.log('Successfully fetched sections:', sectionsResponse.data);
        setModule((prev: any) => ({ ...prev, sections: sectionsResponse.data }));
      } catch (err) {
        console.error('Error fetching module or sections:', err);
        setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };
    fetchModule();
  }, [moduleId]);

  if (error) {return <Text style={styles.error}>{error}</Text>;}
  if (!module) {return <Text style={styles.loading}>Loading...</Text>;}

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{module.title}</Text>
      <Text style={styles.description}>{module.description}</Text>
      <Text style={styles.contentUrl}>
        Content URL: <Text style={styles.url}>{module.content}</Text>
      </Text>
      {module.sections && (
        <View style={styles.sectionsContainer}>
          <Text style={styles.sectionTitle}>Sections:</Text>
          {module.sections.map((section: {
            id: React.Key;
            title: string;
            order: number;
          }) => (
            <View key={section.id} style={styles.sectionItem}>
              <Text style={styles.sectionItemTitle}>{section.title}</Text>
              <Text style={styles.sectionItemOrder}>Order: {section.order}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  contentUrl: {
    fontSize: 14,
    marginTop: 10,
  },
  url: {
    color: 'blue',
  },
  sectionsContainer: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionItem: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  sectionItemTitle: {
    fontSize: 16,
  },
  sectionItemOrder: {
    fontSize: 14,
    color: 'gray',
    marginTop: 4,
  },
  loading: {
    padding: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  error: {
    padding: 16,
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
});

export default ModuleDetailScreen;
