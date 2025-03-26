import React, { FC, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { REACT_APP_BASE_URL } from '@env';
import Icon from 'react-native-vector-icons/Feather';

const BASE_URL = REACT_APP_BASE_URL;

interface Certification {
  id?: string;
  title: string;
  dateEarned: string | { _seconds: number; _nanoseconds: number }; // Handle both string and Timestamp
  issuer?: string;
  description?: string;
}

const CertificationsScreen: FC = () => {
  const { isDarkMode } = useTheme();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [newCertification, setNewCertification] = useState<Certification>({
    title: '',
    dateEarned: '',
    issuer: '',
    description: '',
  });

  useEffect(() => {
    fetchCertifications();
  }, []);

  const fetchCertifications = async () => {
    setLoading(true);
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      console.log('Stored User ID:', storedUserId);
      if (!storedUserId) {
        Alert.alert('Error', 'No user ID found in storage.');
        return;
      }

      const response = await axios.get(`${BASE_URL}/user/${storedUserId}/certifications`);
      const rawCertifications = response.data.certifications || [];

      // Convert Timestamp to string
      const formattedCertifications = rawCertifications.map((cert: Certification) => ({
        ...cert,
        dateEarned:
          typeof cert.dateEarned === 'object' && '_seconds' in cert.dateEarned
            ? new Date(cert.dateEarned._seconds * 1000).toISOString().split('T')[0] // Convert to YYYY-MM-DD
            : cert.dateEarned || '',
      }));

      console.log('Formatted Certifications:', formattedCertifications);
      setCertifications(formattedCertifications);
    } catch (error) {
      console.error('Error fetching certifications:', error);
      handleAxiosError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAxiosError = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (!axiosError.response) {
        Alert.alert('Network Error', 'Could not connect to the server.');
      } else if (axiosError.response.status === 404) {
        Alert.alert('Not Found', 'No certifications found for this user.');
      } else {
        Alert.alert('Server Error', `Server error: ${axiosError.response.status}`);
      }
    } else {
      Alert.alert('Unexpected Error', 'An unexpected error occurred.');
    }
  };

  const handleAddCertification = async () => {
    if (!newCertification.title.trim()) {
      Alert.alert('Validation Error', 'Certification title is required.');
      return;
    }
    if (typeof newCertification.dateEarned === 'string' && !newCertification.dateEarned.match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert('Validation Error', 'Date must be in YYYY-MM-DD format.');
      return;
    }

    try {
      const userId = auth().currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const response = await axios.post(
        `${BASE_URL}/user/${userId}/certifications`,
        newCertification,
      );

      setCertifications((prev) => [...prev, response.data.certification]);
      setNewCertification({
        title: '',
        dateEarned: '',
        issuer: '',
        description: '',
      });
      setIsAddModalVisible(false);
      Alert.alert('Success', 'Certification added successfully.');
    } catch (error) {
      console.error('Error adding certification:', error);
      handleAxiosError(error);
    }
  };

  const renderAddCertificationModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isAddModalVisible}
      onRequestClose={() => setIsAddModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[
            styles.modalContainer,
            { backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF' },
          ]}
        >
          <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}>
            Add Certification
          </Text>

          <TextInput
            style={[styles.input, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
            placeholder="Certification Title"
            placeholderTextColor="#888"
            value={newCertification.title}
            onChangeText={(text) =>
              setNewCertification((prev) => ({ ...prev, title: text }))
            }
          />

          <TextInput
            style={[styles.input, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
            placeholder="Date Earned (YYYY-MM-DD)"
            placeholderTextColor="#888"
            value={newCertification.dateEarned.toString()} // Convert to string
            onChangeText={(text) =>
              setNewCertification((prev) => ({ ...prev, dateEarned: text }))
            }
          />

          <TextInput
            style={[styles.input, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
            placeholder="Issuer (Optional)"
            placeholderTextColor="#888"
            value={newCertification.issuer}
            onChangeText={(text) =>
              setNewCertification((prev) => ({ ...prev, issuer: text }))
            }
          />

          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              { color: isDarkMode ? '#FFF' : '#1A1A1A' },
            ]}
            placeholder="Description (Optional)"
            placeholderTextColor="#888"
            multiline
            numberOfLines={3}
            value={newCertification.description}
            onChangeText={(text) =>
              setNewCertification((prev) => ({ ...prev, description: text }))
            }
          />

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setIsAddModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleAddCertification}
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F6F8FF' }]}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}>
            Certifications
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#A0A0A0' : '#666' }]}>
            Access your earned certificates
          </Text>
        </Animated.View>

        {certifications.length > 0 ? (
          certifications.map((certification) => (
            <Animated.View
              key={certification.id}
              style={styles.certificationCard}
              entering={FadeInUp.duration(400)}
            >
              <View style={styles.certificationHeader}>
                <Text
                  style={[styles.certificationTitle, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
                >
                  {certification.title}
                </Text>
                {certification.issuer && (
                  <Text
                    style={[styles.certificationIssuer, { color: isDarkMode ? '#A0A0A0' : '#666' }]}
                  >
                    {certification.issuer}
                  </Text>
                )}
              </View>
              <Text style={[styles.certificationDate, { color: isDarkMode ? '#A0A0A0' : '#666' }]}>
                Earned on: {String(certification.dateEarned)}
              </Text>
              {certification.description && (
                <Text
                  style={[
                    styles.certificationDescription,
                    { color: isDarkMode ? '#A0A0A0' : '#666' },
                  ]}
                >
                  {certification.description}
                </Text>
              )}
            </Animated.View>
          ))
        ) : (
          <Text style={[styles.noDataText, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}>
            No certifications earned yet.
          </Text>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setIsAddModalVisible(true)}
      >
        <Icon name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {renderAddCertificationModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 80 },
  header: { marginBottom: 24, paddingHorizontal: 4 },
  headerTitle: { fontSize: 32, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 16 },
  certificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  certificationHeader: { marginBottom: 8 },
  certificationTitle: { fontSize: 18, fontWeight: '600' },
  certificationIssuer: { fontSize: 14, marginTop: 4 },
  certificationDate: { fontSize: 14 },
  certificationDescription: { fontSize: 14, marginTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noDataText: { fontSize: 16, textAlign: 'center', marginTop: 20 },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007BFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '90%',
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
    marginBottom: 16,
    fontSize: 16,
  },
  multilineInput: { height: 80, textAlignVertical: 'top' },
  modalButtonContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: { backgroundColor: '#E0E0E0' },
  saveButton: { backgroundColor: '#007BFF' },
  modalButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default CertificationsScreen;