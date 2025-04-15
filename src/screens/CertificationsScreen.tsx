import React, { FC, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCustomTheme } from '../context/ThemeContext';
import Animated, { FadeInUp } from 'react-native-reanimated';
import axios, { AxiosError } from 'axios';
import auth from '@react-native-firebase/auth';
import { REACT_APP_BASE_URL } from '@env';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import CertificationCard   from '../components/certification/CertificationCard';
import AddCertificationModal from '../components/certification/AddCertificationModal';
import CredlyImportModal from '../components/certification/CredlyImportModal';
import Filters from '../components/certification/Filters';
import { Alert } from 'react-native';


const BASE_URL = REACT_APP_BASE_URL;

// --- Interfaces & Types ---
interface Certification {
  id?: string;
  title: string;
  issuedDate: string;
  expiryDate?: string | null;
  issuingOrganization: string;
  url?: string;
  badgeUrl?: string;
  credlyId?: string;
  cloudProvider?: string;
  credentialId?: string;
  description?: string;
}

interface CloudProvider {
  label: string;
  value: string;
  icon: string;
}

// --- Constants ---
const cloudProviders: CloudProvider[] = [
  { label: 'Google Cloud', value: 'gcp', icon: 'google-cloud' },
  { label: 'Microsoft Azure', value: 'azure', icon: 'microsoft-azure' },
  { label: 'Amazon Web Services', value: 'aws', icon: 'aws' },
  { label: 'IBM Cloud', value: 'ibm', icon: 'ibm' },
  { label: 'Oracle Cloud', value: 'oracle', icon: 'database' },
  { label: 'Alibaba Cloud', value: 'alibaba', icon: 'alpha-a-circle' },
  { label: 'DigitalOcean', value: 'digitalocean', icon: 'digital-ocean' },
  { label: 'Salesforce', value: 'salesforce', icon: 'salesforce' },
  { label: 'Red Hat', value: 'redhat', icon: 'redhat' },
  { label: 'VMware', value: 'vmware', icon: 'vmware' },
  { label: 'Other', value: 'other', icon: 'cloud' },
];

const initialCertification: Certification = {
  title: '',
  issuedDate: new Date().toISOString().split('T')[0],
  expiryDate: null,
  issuingOrganization: '',
  cloudProvider: '',
  url: '',
  badgeUrl: '',
  credentialId: '',
  description: '',
};

// --- Utility Functions ---
const formatDate = (date: string | { _seconds: number; _nanoseconds: number }): string => {
    if (typeof date === 'object' && '_seconds' in date) {
      return new Date(date._seconds * 1000).toISOString().split('T')[0];
    }
    return date;
  };

const handleAxiosError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (!axiosError.response) {
      Alert.alert('Network Error', 'Could not connect to the server.');
    } else if (axiosError.response.status === 404) {
      Alert.alert('Not Found', 'The requested resource was not found.');
    } else {
      Alert.alert('Server Error', `An error occurred: ${axiosError.response.status}`);
    }
  } else {
    Alert.alert('Unexpected Error', 'An unexpected error occurred.');
  }
};

const determineCloudProvider = (title: string, issuer: string): string => {
  const titleLower = title.toLowerCase();
  const issuerLower = issuer.toLowerCase();

  if (titleLower.includes('aws') || issuerLower.includes('amazon')) return 'aws';
  if (titleLower.includes('azure') || issuerLower.includes('microsoft')) return 'azure';
  if (titleLower.includes('gcp') || titleLower.includes('google cloud') || issuerLower.includes('google')) return 'gcp';
  if (titleLower.includes('ibm') || issuerLower.includes('ibm')) return 'ibm';
  if (titleLower.includes('oracle') || issuerLower.includes('oracle')) return 'oracle';
  if (titleLower.includes('alibaba') || issuerLower.includes('alibaba')) return 'alibaba';
  if (titleLower.includes('digital ocean') || issuerLower.includes('digitalocean')) return 'digitalocean';
  if (titleLower.includes('salesforce') || issuerLower.includes('salesforce')) return 'salesforce';
  if (titleLower.includes('red hat') || issuerLower.includes('redhat')) return 'redhat';
  if (titleLower.includes('vmware') || issuerLower.includes('vmware')) return 'vmware';

  return 'other';
};

// --- Main Component ---
const CertificationsScreen = () => {
  const { isDarkMode } = useCustomTheme();
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [isCredlyModalVisible, setIsCredlyModalVisible] = useState<boolean>(false);
  const [newCertification, setNewCertification] = useState<Certification>(initialCertification);
  // Filter states
  const [filterProvider, setFilterProvider] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'provider'>('date');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // --- Data Fetching ---
  const fetchCertifications = useCallback(async () => {
    setLoading(true);
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const response = await axios.get(`${BASE_URL}/api/v1/users/${userId}/certifications`);
      const rawCertifications = response.data.certifications || [];
      const formattedCertifications = rawCertifications.map((cert: Certification) => ({
        ...cert,
        issuedDate: formatDate(cert.issuedDate),
        expiryDate: cert.expiryDate ? formatDate(cert.expiryDate) : null,
      }));

      setCertifications(formattedCertifications);
    } catch (error) {
      console.error('Error fetching certifications:', error);
      handleAxiosError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertifications();
  }, [fetchCertifications]);

  // --- Data Manipulation ---
  const addCertification = useCallback(async (certData: Certification) => {
    try {
      const userId = auth().currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');

      const response = await axios.post(`${BASE_URL}/api/v1/users/${userId}/certifications`, certData);
      return response.data.certification;
    } catch (error) {
      console.error('Error adding certification:', error);
      handleAxiosError(error);
      throw error; // Re-throw to handle in caller
    }
  }, []);

  const handleAddCertification = async () => {
    if (!newCertification.title.trim()) {
      Alert.alert('Validation Error', 'Certification title is required.');
      return;
    }
    if (!newCertification.issuingOrganization.trim()) {
      Alert.alert('Validation Error', 'Issuing organization is required.');
      return;
    }
    try {
      const certToAdd = {
        ...newCertification,
        issuedDate: newCertification.issuedDate ? new Date(String(newCertification.issuedDate)): null,
        expiryDate: newCertification.expiryDate ? new Date(String(newCertification.expiryDate)) : null,
      };
      //const addedCert = await addCertification(certToAdd);
    //  setCertifications((prev) => [...prev, addedCert]);
      resetNewCertification();
      setIsAddModalVisible(false);
      Alert.alert('Success', 'Certification added successfully.');
    } catch (error) {
      // Error already handled in addCertification
    }
  };

  const handleImportFromCredly = async (badges: any[]) => {
    try {
      for (const badge of badges) {
        const certData = {
          title: badge.name,
          issuedDate: new Date(badge.issued_at).toISOString().split('T')[0],
          expiryDate: badge.expires_at ? new Date(badge.expires_at).toISOString().split('T')[0] : null,
          issuingOrganization: badge.issuer.name,
          url: badge.public_url,
          badgeUrl: badge.image_url,
          credlyId: badge.id,
          cloudProvider: determineCloudProvider(badge.name, badge.issuer.name),
          description: badge.description,
        };

        await addCertification(certData);
      }

      setIsCredlyModalVisible(false);
      Alert.alert('Success', 'Badges imported successfully.');
      fetchCertifications(); // Refresh the list
    } catch (error) {
      console.error('Error importing Credly badges:', error);
    }
  };

  const resetNewCertification = () => {
    setNewCertification(initialCertification);
  };

  // --- UI Handlers ---

  const getFilteredCertifications = () => {
    let filtered = [...certifications];
    if (filterProvider) {
      filtered = filtered.filter(cert => cert.cloudProvider === filterProvider);
    }
    if (searchText) {
      const query = searchText.toLowerCase();
      filtered = filtered.filter(cert =>
        cert.title.toLowerCase().includes(query) ||
        cert.issuingOrganization.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime();
      } else {
        return (a.issuingOrganization || '').localeCompare(b.issuingOrganization || '');
      }
    });

    return filtered;
  };

  // --- Rendering ---
  const renderCertificationCard = (certification: Certification) => {
    return <CertificationCard certification={certification} />;
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F6F8FF' }]}
    >
      <View style={styles.container}>
        {/* --- Header --- */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}>
            Certifications
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDarkMode ? '#A0A0A0' : '#666' }]}>
            Manage your certifications
          </Text>
        </View>

        {/* --- Filters --- */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <MaterialIcon
            name={showFilters ? 'filter-remove' : 'filter-variant'}
            size={24}
            color={isDarkMode ? '#FFF' : '#1A1A1A'}
          />
        </TouchableOpacity>
        {showFilters && (
          <Filters
            searchText={searchText}
            setSearchText={setSearchText}
            filterProvider={filterProvider}
            setFilterProvider={setFilterProvider}
            sortBy={sortBy}
            setSortBy={setSortBy}
            cloudProviders={cloudProviders}
          />
        )}

        {/* --- Certifications List --- */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDarkMode ? '#FFF' : '#1A1A1A'} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            {getFilteredCertifications().map(renderCertificationCard)}
          </ScrollView>
        )}

        {/* --- Add Certification Button --- */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddModalVisible(true)}
        >
          <MaterialIcon name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* --- Import from Credly Button --- */}
        <TouchableOpacity
          style={styles.credlyButton}
          onPress={() => setIsCredlyModalVisible(true)}
        >
          <MaterialIcon name="cloud-download" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* --- Modals --- */}
        <AddCertificationModal
          isModalVisible={isAddModalVisible}
          onClose={() => setIsAddModalVisible(false)}
          onSave={handleAddCertification}
          newCertification={newCertification}
          setNewCertification={setNewCertification}
        />

        <CredlyImportModal
          isModalVisible={isCredlyModalVisible}
          onClose={() => setIsCredlyModalVisible(false)}
          onImport={handleImportFromCredly}
          baseUrl={BASE_URL}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // --- Main Screen ---
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 15,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollViewContent: {
    paddingBottom: 80, // Space for buttons
  },
  // --- Buttons ---
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007BFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  credlyButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: '#ff6b00',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filterButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
});

export default CertificationsScreen;
