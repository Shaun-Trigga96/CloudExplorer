import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { moduleService } from '../services/ModuleService';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
  ModuleList: undefined;
  ModuleDetail: { moduleId: string };
};

type ModuleDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ModuleDetail'>;
type ModuleDetailScreenRouteProp = RouteProp<RootStackParamList, 'ModuleDetail'>;

interface ModuleDetailScreenProps {
  navigation: ModuleDetailScreenNavigationProp;
  route: ModuleDetailScreenRouteProp;
}

const ModuleDetailScreen: React.FC<ModuleDetailScreenProps> = ({ route }) => {
  const { moduleId } = route.params;
  const [module, setModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModule = async () => {
      try {
        const data = await moduleService.getModuleById(moduleId); // Use getModuleDetails for content
        setModule(data);
      } catch (error) {
        console.error('Error fetching module:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchModule();
  }, [moduleId]);

  if (loading) {
    return <ActivityIndicator style={styles.loading} size="large" color="#0000ff" />;
  }

  if (!module) {
    return <Text style={styles.error}>Module not found.</Text>;
  }

  // Convert rawContent to HTML for WebView (simplified)
  const htmlContent = `
    <html>
      <body>
        ${module.rawContent
          .map((element: any) =>
            element.paragraph?.elements
              ?.map((el: any) => el.textRun?.content || '')
              .join('') || ''
          )
          .join('<br/>')}
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{module.title}</Text>
      <Text style={styles.description}>{module.description}</Text>
      <Text style={styles.link} onPress={() => Linking.openURL(module.content)}>
        Open in Google Docs
      </Text>
      <WebView source={{ html: htmlContent }} style={styles.webview} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  description: { fontSize: 16, color: '#666', marginBottom: 16 },
  webview: { flex: 1, marginTop: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { flex: 1, textAlign: 'center', padding: 16, color: '#ff0000' },
  link: { color: '#1a73e8', marginBottom: 16 },
});

export default ModuleDetailScreen;