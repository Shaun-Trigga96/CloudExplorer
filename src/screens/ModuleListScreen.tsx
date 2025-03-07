import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import ModuleCard from '../components/ModuleCard';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { moduleService } from '../services/ModuleService';

type RootStackParamList = {
  ModuleList: undefined;
  ModuleDetail: { moduleId: string };
};

type ModuleListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ModuleList'>;
type ModuleListScreenRouteProp = RouteProp<RootStackParamList, 'ModuleList'>;

interface ModuleListScreenProps {
  navigation: ModuleListScreenNavigationProp;
  route: ModuleListScreenRouteProp;
}

const ModuleListScreen: React.FC<ModuleListScreenProps> = ({ navigation }) => {
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    const fetchModules = async () => {
      const data = await moduleService.getAllModules();
      setModules(data);
    };
    fetchModules();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <ModuleCard
      title={item.title}
      description={item.description}
      onPress={() => navigation.navigate('ModuleDetail', { moduleId: item.id })}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={modules}
        renderItem={renderItem}
        keyExtractor={item => item.id}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});

export default ModuleListScreen;
