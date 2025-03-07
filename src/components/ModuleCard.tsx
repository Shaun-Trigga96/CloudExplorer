import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ModuleCardProps {
  title: string;
  description: string;
  onPress: () => void;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ title, description, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: { padding: 16, backgroundColor: '#fff', marginBottom: 8, borderRadius: 8 },
  title: { fontSize: 18, fontWeight: 'bold' },
  description: { fontSize: 14, color: '#666' },
});

export default ModuleCard;