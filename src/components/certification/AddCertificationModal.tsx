import React, { FC, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useCustomTheme } from '../../context/ThemeContext';
import { Dropdown } from 'react-native-element-dropdown';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Certification {
  id?: string;
  title: string;
  issuedDate: string;
  expiryDate?: string | null;
  issuingOrganization: string;
  url?: string;
  badgeUrl?: string;
  cloudProvider?: string;
  credentialId?: string;
  description?: string;
}

interface CloudProvider {
  label: string;
  value: string;
  icon: string;
}

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

const getCloudProviderIcon = (providerId?: string) => {
  if (!providerId) return 'cloud';
  const provider = cloudProviders.find((p) => p.value === providerId);
  return provider ? provider.icon : 'cloud';
};

interface AddCertificationModalProps {
  isModalVisible: boolean;
  onClose: () => void;
  onSave: (newCertification: Certification) => void;
  newCertification: Certification;
  setNewCertification: React.Dispatch<React.SetStateAction<Certification>>;
}

const AddCertificationModal: FC<AddCertificationModalProps> = ({
  isModalVisible,
  onClose,
  onSave,
  newCertification,
  setNewCertification,
}) => {
  const { isDarkMode } = useCustomTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'issued' | 'expiry'>(
    'issued',
  );

  const handleDateSelect = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setNewCertification((prevCertification: Certification) => ({
        ...prevCertification,
        ...(datePickerMode === 'issued'
          ? { issuedDate: formattedDate }
          : { expiryDate: formattedDate }),
      }));
    }
  };

  const showDatePickerModal = (mode: 'issued' | 'expiry') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const handleSave = () => {
    if (!newCertification.title.trim()) {
      Alert.alert('Validation Error', 'Certification title is required.');
      return;
    }
    if (!newCertification.issuingOrganization.trim()) {
      Alert.alert('Validation Error', 'Issuing organization is required.');
      return;
    }
    onSave(newCertification);
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isModalVisible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[
            styles.modalContainer,
            { backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF' },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text
              style={[
                styles.modalTitle,
                { color: isDarkMode ? '#FFF' : '#1A1A1A' },
              ]}
            >
              Add Certification
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcon
                name="close"
                size={24}
                color={isDarkMode ? '#FFF' : '#1A1A1A'}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView}>
            <TextInput
              style={[styles.input, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
              placeholder="Certification Title"
              placeholderTextColor="#888"
              value={newCertification.title}
              onChangeText={(text) =>
                setNewCertification((prevCertification: Certification) => ({
                  ...prevCertification,
                  title: text,
                }))
              }
            />

            <Dropdown
              style={[
                styles.dropdown,
                { backgroundColor: isDarkMode ? '#3A3A3A' : '#F0F0F0' },
              ]}
              placeholderStyle={{ color: '#888' }}
              selectedTextStyle={{ color: isDarkMode ? '#FFF' : '#1A1A1A' }}
              data={cloudProviders}
              labelField="label"
              valueField="value"
              placeholder="Select Cloud Provider"
              value={newCertification.cloudProvider}
              onChange={(item) => {
                setNewCertification((prevCertification: Certification) => ({
                  ...prevCertification,
                  cloudProvider: item.value,
                }));
              }}
              renderLeftIcon={() => (
                <MaterialIcon
                  name={
                    getCloudProviderIcon(newCertification.cloudProvider) ||
                    'cloud'
                  }
                  size={20}
                  color="#007BFF"
                  style={styles.dropdownIcon}
                />
              )}
            />

            <TextInput
              style={[styles.input, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
              placeholder="Issuing Organization"
              placeholderTextColor="#888"
              value={newCertification.issuingOrganization}
              onChangeText={(text) =>
                setNewCertification((prevCertification: Certification) => ({
                  ...prevCertification,
                  issuingOrganization: text,
                }))
              }
            />

            <TouchableOpacity
              style={[
                styles.datePicker,
                { backgroundColor: isDarkMode ? '#3A3A3A' : '#F0F0F0' },
              ]}
              onPress={() => showDatePickerModal('issued')}
            >
              <Text style={{ color: isDarkMode ? '#FFF' : '#1A1A1A' }}>
                Issued Date: {newCertification.issuedDate || 'Select Date'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.datePicker,
                { backgroundColor: isDarkMode ? '#3A3A3A' : '#F0F0F0' },
              ]}
              onPress={() => showDatePickerModal('expiry')}
            >
              <Text style={{ color: isDarkMode ? '#FFF' : '#1A1A1A' }}>
                Expiry Date: {newCertification.expiryDate || 'No Expiry'}
              </Text>
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
              placeholder="Certification URL (Optional)"
              placeholderTextColor="#888"
              value={newCertification.url}
              onChangeText={(text) =>
                setNewCertification((prevCertification: Certification) => ({
                  ...prevCertification,
                  url: text,
                }))
              }
            />

            <TextInput
              style={[styles.input, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
              placeholder="Badge URL (Optional)"
              placeholderTextColor="#888"
              value={newCertification.badgeUrl}
              onChangeText={(text) =>
                setNewCertification((prevCertification: Certification) => ({
                  ...prevCertification,
                  badgeUrl: text,
                }))
              }
            />

            <TextInput
              style={[styles.input, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
              placeholder="Credential ID (Optional)"
              placeholderTextColor="#888"
              value={newCertification.credentialId}
              onChangeText={(text) =>
                setNewCertification((prevCertification: Certification) => ({
                  ...prevCertification,
                  credentialId: text,
                }))
              }
            />
            <TextInput
              style={[
                styles.input, 
                { color: isDarkMode ? '#FFF' : '#1A1A1A' },
                { textAlignVertical: 'top', minHeight: 100 }
              ]}
              placeholder="Description (Optional)"
              placeholderTextColor="#888"
              value={newCertification.description}
              multiline={true}
              onChangeText={(text) =>
                setNewCertification((prevCertification: Certification) => ({
                  ...prevCertification,
                  description: text,
                }))
              }
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={
                datePickerMode === 'issued' && newCertification.issuedDate
                  ? new Date(newCertification.issuedDate)
                  : datePickerMode === 'expiry' && newCertification.expiryDate
                  ? new Date(newCertification.expiryDate)
                  : new Date()
              }
              mode="date"
              display="spinner"
              onChange={handleDateSelect}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // --- Modals (Add & Credly) ---
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    // backgroundColor handled dynamically based on isDarkMode
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE', // Consider a dark mode variant if needed
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    // color handled dynamically based on isDarkMode
  },
  modalScrollView: {
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#CCC', // Consider a dark mode variant
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    // color handled dynamically based on isDarkMode
  },
  dropdown: {
    height: 50,
    borderWidth: 1,
    borderColor: '#CCC', // Consider a dark mode variant
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  dropdownIcon: {
    marginRight: 10,
  },
  datePicker: {
    height: 50,
    borderWidth: 1,
    borderColor: '#CCC', // Consider a dark mode variant
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    justifyContent: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
  },
  cancelButtonText: {
    color: '#007BFF',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default AddCertificationModal;