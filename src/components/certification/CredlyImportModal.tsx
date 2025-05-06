import React, { FC, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useCustomTheme } from '../../context/ThemeContext';
import strings from '../../localization/strings'; // Assuming this is your strings import
import axios from 'axios';

interface CredlyBadge {
  id: string;
  name: string;
  image_url: string;
  issuer: { name: string };
  issued_at: string;
  expires_at: string | null;
  description: string;
  public_url: string;
}

interface CredlyImportModalProps {
  isModalVisible: boolean;
  onClose: () => void;
  onImport: (badges: CredlyBadge[]) => void;
  baseUrl: string;
}

const CredlyImportModal: FC<CredlyImportModalProps> = ({
  isModalVisible,
  onClose,
  onImport,
  baseUrl,
}) => {
  const { isDarkMode } = useCustomTheme();
  const [credlyUsername, setCredlyUsername] = useState<string>('');
  const [isFetchingCredly, setIsFetchingCredly] = useState<boolean>(false);
  const [credlyBadges, setCredlyBadges] = useState<CredlyBadge[]>([]);
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);

  const fetchCredlyBadges = async () => {
    if (!credlyUsername.trim()) {
      Alert.alert('Error', 'Please enter your Credly username');
      return;
    }

    setIsFetchingCredly(true);
    try {
      const response = await axios.get(
        `${baseUrl}/api/v1/credly/badges/${credlyUsername}`,
      );
      setCredlyBadges(response.data.badges || []);
    } catch (error) {
      console.error('Error fetching Credly badges:', error);
      Alert.alert(
        'Error',
        'Could not fetch badges from Credly. Please check your username and try again.',
      );
    } finally {
      setIsFetchingCredly(false);
    }
  };

  const toggleBadgeSelection = (badgeId: string) => {
    setSelectedBadges((prev) =>
      prev.includes(badgeId)
        ? prev.filter((id) => id !== badgeId)
        : [...prev, badgeId],
    );
  };

  const handleImport = () => {
    const selectedBadgeData = credlyBadges.filter((badge) =>
      selectedBadges.includes(badge.id),
    );
    onImport(selectedBadgeData);
    setSelectedBadges([]);
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
            { backgroundColor: isDarkMode ? '#2A2A2A' : '#FFFFFF' }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text
              style={[
                styles.modalTitle,
                { color: isDarkMode ? '#FFF' : '#1A1A1A' },
              ]}
            >
              Import from Credly
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcon
                name="close"
                size={24}
                color={isDarkMode ? '#FFF' : '#1A1A1A'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.credlyForm}>
            <TextInput
              style={[styles.input, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
              placeholder="Your Credly Username"
              placeholderTextColor="#888"
              value={credlyUsername}
              onChangeText={setCredlyUsername}
            />
            <Text style={[styles.helpText, { color: isDarkMode ? '#A0A0A0' : '#666' }]}>
              {strings.credlyUsernameHelpText}
            </Text>

            <TouchableOpacity
              style={[
                styles.credlyButton,
                { opacity: isFetchingCredly ? 0.7 : 1 },
              ]}
              onPress={fetchCredlyBadges}
              disabled={isFetchingCredly}
            >
              {isFetchingCredly ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.credlyButtonText}>Fetch My Badges</Text>
              )}
            </TouchableOpacity>
          </View>

          {credlyBadges.length > 0 && (
            <>
              <Text
                style={[
                  styles.badgesHeader,
                  { color: isDarkMode ? '#FFF' : '#1A1A1A' },
                ]}
              >
                Select badges to import
              </Text>

              <ScrollView style={styles.badgesList}>
                {credlyBadges.map((badge) => (
                  <TouchableOpacity
                    key={badge.id}
                    style={[
                      styles.badgeItem,
                      { backgroundColor: isDarkMode ? '#3A3A3A' : '#F0F0F0' },
                      selectedBadges.includes(badge.id) && styles.selectedBadge,
                    ]}
                    onPress={() => toggleBadgeSelection(badge.id)}
                  >
                    <Image
                      source={{ uri: badge.image_url }}
                      style={styles.badgeItemImage}
                    />
                    <View style={styles.badgeItemInfo}>
                      <Text
                        style={[
                          styles.badgeItemTitle,
                          { color: isDarkMode ? '#FFF' : '#1A1A1A' },
                        ]}
                        numberOfLines={2}
                      >
                        {badge.name}
                      </Text>
                      <Text
                        style={[
                          styles.badgeItemIssuer,
                          { color: isDarkMode ? '#A0A0A0' : '#666' },
                        ]}
                        numberOfLines={1}
                      >
                        {badge.issuer.name}
                      </Text>
                    </View>
                    {selectedBadges.includes(badge.id) && (
                      <MaterialIcon
                        name="check-circle"
                        size={24}
                        color="#007BFF"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.importSelectedButton,
                  { opacity: selectedBadges.length > 0 ? 1 : 0.5 },
                ]}
                onPress={handleImport}
                disabled={selectedBadges.length === 0}
              >
                <Text style={styles.importSelectedText}>
                  Import {selectedBadges.length} Selected Badge
                  {selectedBadges.length !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            </>
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

  // --- Credly Import Modal Specific ---
  credlyForm: {
    marginBottom: 20,
  },
  credlyButton: {
    backgroundColor: '#ff6b00', // Credly Orange
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    // opacity handled dynamically
  },
  credlyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  badgesHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 15,
    // color handled dynamically based on isDarkMode
  },
  badgesList: {
    maxHeight: 250, // Constrain the scrollable area height
    marginBottom: 15,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1, // Base border width
    borderColor: 'transparent', // Base border color (transparent)
    // backgroundColor handled dynamically based on isDarkMode
  },
  selectedBadge: {
    borderColor: '#007BFF', // Blue border for selected items
    borderWidth: 2, // Thicker border for selected items
  },
  badgeItemImage: {
    width: 40,
    height: 40,
    borderRadius: 5,
    marginRight: 10,
    resizeMode: 'contain',
  },
  badgeItemInfo: {
    flex: 1, // Takes up remaining space in the row
    marginRight: 10, // Space before the check icon (if visible)
  },
  badgeItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
    // color handled dynamically based on isDarkMode
  },
  badgeItemIssuer: {
    fontSize: 12,
    // color handled dynamically based on isDarkMode
  },
  importSelectedButton: {
    backgroundColor: '#28a745', // Green
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    // opacity handled dynamically
  },
  importSelectedText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  helpText: {
    fontSize: 12,
    marginBottom: 10,
  },
});

export default CredlyImportModal;
