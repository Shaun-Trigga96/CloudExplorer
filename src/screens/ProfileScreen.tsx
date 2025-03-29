import React, { FC, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import auth from '@react-native-firebase/auth';
import { REACT_APP_BASE_URL } from '@env';
import * as ImagePicker from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import Icon from 'react-native-vector-icons/Feather';

const BASE_URL = REACT_APP_BASE_URL;
console.log('BASE_URL:', BASE_URL);

type ProfileScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'ProfileScreen'
>;

interface UserProfile {
  displayName: string;
  email?: string;
  photoURL: string | null;
  bio: string;
  uid?: string;
}

const ProfileScreen: FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { isDarkMode } = useTheme();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile>({
    displayName: '',
    email: '',
    photoURL: null,
    bio: '',
    uid: '',
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const user = auth().currentUser;
        const storedUserId = await AsyncStorage.getItem('userId');
        console.log('Stored User ID:', storedUserId);
        console.log('Firebase User:', user?.uid, user?.displayName, user?.photoURL);

        if (!user || !storedUserId) {
          throw new Error('No authenticated user or stored user ID');
        }

        const profileUrl = `${BASE_URL}/api/v1/users/${storedUserId}/profile`;
        console.log('Fetching profile from:', profileUrl);
        let profile: UserProfile;

        try {
          const response = await axios.get(profileUrl);
          profile = {
            ...response.data.profile,
            photoURL: user.photoURL || response.data.profile.photoURL || null,
            uid: storedUserId,
            email: user.email || response.data.profile.email,
          };
        } catch (error) {
          console.warn('Backend fetch failed, using Firebase data as fallback:', error);
          // Fallback to Firebase data if backend fails
          profile = {
            displayName: user.displayName || 'Unknown User',
            email: user.email || '',
            photoURL: user.photoURL || null,
            bio: '',
            uid: storedUserId,
          };
        }

        console.log('Fetched profile:', profile);
        console.log('Final photoURL:', profile.photoURL);
        setUserProfile(profile);
        setEditedProfile(profile);
      } catch (error) {
        console.error('Fetch error:', error);
        handleAxiosError(error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserProfile();
  }, []);

  const handleAxiosError = (error: unknown) => {
    console.error('Full error object:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      console.log('Axios Error Details:', {
        name: axiosError.name,
        message: axiosError.message,
        code: axiosError.code,
        response: axiosError.response,
      });
      if (!axiosError.response) {
        Alert.alert('Network Error', 'Could not connect to the server. Check if the backend is running.');
      } else if (axiosError.response.status === 404) {
        Alert.alert('Not Found', 'User profile not found on the server. Using local data.');
      } else if (axiosError.response.status === 401) {
        Alert.alert('Unauthorized', 'You are not authorized to view this profile.');
      } else {
        Alert.alert(
          'Server Error',
          `Server error: ${axiosError.response.status} - ${
            axiosError.response.data || 'Unknown error'
          }`,
        );
      }
    } else {
      Alert.alert('Unexpected Error', 'An unexpected error occurred.');
    }
  };

  const handleImagePicker = async () => {
    const options: ImagePicker.ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 1,
      includeBase64: false,
    };

    ImagePicker.launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.error('ImagePicker Error:', response.errorMessage);
        Alert.alert('Error', 'Failed to select image.');
      } else if (response.assets && response.assets.length > 0) {
        const source = response.assets[0].uri;
        if (source) {
          await uploadImage(source);
        }
      }
    });
  };

  const uploadImage = async (uri: string) => {
    setUploading(true);
    const userId = auth().currentUser?.uid;
    if (!userId) {
      Alert.alert('Error', 'User not authenticated.');
      setUploading(false);
      return;
    }

    const filename = `profile_${Date.now()}.jpg`;
    const uploadUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;
    const task = storage().ref(`profile-pictures/${userId}/${filename}`).putFile(uploadUri);

    try {
      await task;
      const url = await storage()
        .ref(`profile-pictures/${userId}/${filename}`)
        .getDownloadURL();
      const updatedProfile = { ...editedProfile, photoURL: url };
      setEditedProfile(updatedProfile);
      await updateUserProfile(updatedProfile);
    } catch (e) {
      console.error('Error uploading image:', e);
      Alert.alert('Error', 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const updateUserProfile = async (profileData: UserProfile) => {
    const user = auth().currentUser;
    if (!user) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }
    try {
      await user.updateProfile({
        displayName: profileData.displayName,
        photoURL: profileData.photoURL,
      });
      const response = await axios.put(`${BASE_URL}/api/v1/users/${user.uid}/profile-image`, profileData);
      const updatedProfile = {
        ...response.data.profile,
        photoURL: profileData.photoURL,
        email: user.email || response.data.profile.email,
        uid: user.uid,
      };
      console.log('Updated profile:', updatedProfile);
      setUserProfile(updatedProfile);
      setEditedProfile(updatedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      console.error('Error updating user profile:', error);
      handleAxiosError(error);
    }
  };

  const handleSaveProfile = () => {
    if (!editedProfile.displayName.trim()) {
      Alert.alert('Validation Error', 'Display name cannot be empty.');
      return;
    }
    console.log('Saving profile:', editedProfile);
    updateUserProfile(editedProfile);
  };

  const renderProfileContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      );
    }

    console.log('Rendering userProfile:', userProfile);
    console.log('Full photoURL:', userProfile?.photoURL);

    if (isEditing) {
      return (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.editProfileContainer}>
          <TouchableOpacity onPress={handleImagePicker} style={styles.imageContainer}>
            <Image
              source={{
                uri: editedProfile.photoURL || 'https://via.placeholder.com/150',
              }}
              style={styles.profileImage}
              onLoad={() => console.log('Edit image loaded')}
              onError={(e) => console.log('Edit image error:', e.nativeEvent.error)}
            />
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            )}
            <View style={styles.editIconContainer}>
              <Icon name="edit-2" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
            placeholder="Display Name"
            placeholderTextColor="#888"
            value={editedProfile.displayName}
            onChangeText={(text) => setEditedProfile((prev) => ({ ...prev, displayName: text }))}
          />

          <TextInput
            style={[styles.input, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
            placeholder="Bio (Optional)"
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
            value={editedProfile.bio}
            onChangeText={(text) => setEditedProfile((prev) => ({ ...prev, bio: text }))}
          />

          <View style={styles.editButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => {
                setIsEditing(false);
                if (userProfile) setEditedProfile(userProfile);
              }}
            >
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSaveProfile}
            >
              <Text style={styles.actionButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      );
    }

    if (!userProfile) {
      return (
        <Text style={[styles.noDataText, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}>
          No profile data available.
        </Text>
      );
    }

    const imageUri = userProfile.photoURL && userProfile.photoURL.startsWith('https')
      ? userProfile.photoURL
      : 'https://via.placeholder.com/150';

    return (
      <Animated.View entering={FadeInUp.duration(600)} style={styles.profileCard}>
        <TouchableOpacity onPress={handleImagePicker}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.profileImage}
              //defaultSource={require('../assets/images/icons8-user-96.png')}
              onError={() => {
                // Optional: Handle image load failure
                console.log('Image failed to load');
              }}
            />
            {uploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="small" color="#FFF" />
              </View>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.profileInfo}>
          <Text
            style={[styles.profileName, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
          >
            {userProfile.displayName}
          </Text>
          <Text
            style={[styles.profileEmail, { color: isDarkMode ? '#A0A0A0' : '#666' }]}
          >
            {userProfile.email}
          </Text>
          {userProfile.bio && (
            <Text
              style={[styles.profileBio, { color: isDarkMode ? '#A0A0A0' : '#666' }]}
            >
              {userProfile.bio}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={() => setIsEditing(true)}
        >
          <Icon name="edit-2" size={20} color="#FFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: isDarkMode ? '#1A1A1A' : '#F6F8FF' }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <Text
              style={[styles.headerTitle, { color: isDarkMode ? '#FFF' : '#1A1A1A' }]}
            >
              Profile
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: isDarkMode ? '#A0A0A0' : '#666' }]}
            >
              Manage your profile and preferences
            </Text>
          </Animated.View>
          {renderProfileContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 30 },
  keyboardAvoidingContainer: { flex: 1 },
  header: { marginBottom: 24, paddingHorizontal: 4 },
  headerTitle: { fontSize: 32, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 16 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
    alignItems: 'center',
    position: 'relative',
  },
  editProfileContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 24,
    alignItems: 'center',
  },
  profileInfo: {
    marginTop: 16,
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 16,
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 12,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007BFF',
    borderRadius: 20,
    padding: 6,
  },
  input: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginBottom: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#007BFF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  editProfileButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#007BFF',
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileScreen;