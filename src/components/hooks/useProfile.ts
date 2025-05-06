// src/hooks/useProfile.ts
import { useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'react-native-image-picker';
import { handleAxiosError } from '../../utils/errorHandler';
import { REACT_APP_BASE_URL } from '@env';

const BASE_URL = REACT_APP_BASE_URL;

interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string | null;
  bio: string;
  uid: string;
}

export const useProfile = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile>({
    displayName: '',
    email: '',
    photoURL: null,
    bio: '',
    uid: '',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const user = auth().currentUser;
        const storedUserId = await AsyncStorage.getItem('userId');
        console.log('Stored User ID:', storedUserId);
        console.log('Firebase User:', user?.uid, user?.displayName, user?.photoURL);

        if (!user || !storedUserId) {
          throw new Error('No authenticated user or stored user ID');
        }

        const profileUrl = `${BASE_URL}/api/v1/users/${storedUserId}/profile`;
        let profile: UserProfile;

        try {
          const response = await axios.get(profileUrl);
          profile = {
            ...response.data.profile,
            photoURL: user.photoURL || response.data.profile.photoURL || null,
            uid: storedUserId,
            email: user.email || response.data.profile.email || '',
          };
        } catch (error) {
          console.warn('Backend fetch failed, using Firebase data:', error);
          profile = {
            displayName: user.displayName || 'Unknown User',
            email: user.email || '',
            photoURL: user.photoURL || null,
            bio: '',
            uid: storedUserId,
          };
        }

        setUserProfile(profile);
        setEditedProfile(profile);
      } catch (error) {
        handleAxiosError(error, 'Profile fetch');
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleImagePicker = async () => {
    const options: ImagePicker.ImageLibraryOptions = {
      mediaType: 'photo',
      quality: 0.8,
      includeBase64: false,
    };

    ImagePicker.launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('Image picker cancelled');
      } else if (response.errorCode) {
        console.error('Image picker error:', response.errorMessage);
        handleAxiosError(new Error(response.errorMessage), 'Image selection');
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
      handleAxiosError(new Error('No authenticated user'), 'Image upload');
      setUploading(false);
      return;
    }

    const filename = `profile_${userId}_${Date.now()}.jpg`;
    const uploadUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;
    const reference = storage().ref(`profile-pictures/${userId}/${filename}`);

    try {
      await reference.putFile(uploadUri);
      const url = await reference.getDownloadURL();
      setEditedProfile((prev) => ({ ...prev, photoURL: url }));
      await updateUserProfile({ ...editedProfile, photoURL: url }, true);
    } catch (error) {
      handleAxiosError(error, 'Image upload');
    } finally {
      setUploading(false);
    }
  };

  const updateUserProfile = async (profileData: UserProfile, isPhotoUpdateOnly: boolean = false) => {
    const user = auth().currentUser;
    if (!user) {
      handleAxiosError(new Error('No authenticated user'), 'Profile update');
      return;
    }

    setLoading(true);
    try {
      const authUpdates: { displayName?: string; photoURL?: string | null } = {};
      if (!isPhotoUpdateOnly && profileData.displayName !== user.displayName) {
        authUpdates.displayName = profileData.displayName;
      }
      if (profileData.photoURL !== user.photoURL) {
        authUpdates.photoURL = profileData.photoURL;
      }
      if (Object.keys(authUpdates).length > 0) {
        await user.updateProfile(authUpdates);
      }

      const backendPayload = {
        displayName: profileData.displayName,
        bio: profileData.bio,
        photoURL: profileData.photoURL,
      };
      await axios.put(`${BASE_URL}/api/v1/users/${user.uid}/profile-image`, backendPayload);

      const updatedProfile: UserProfile = {
        displayName: profileData.displayName,
        bio: profileData.bio,
        photoURL: profileData.photoURL,
        email: user.email || '',
        uid: user.uid,
      };

      setUserProfile(updatedProfile);
      setEditedProfile(updatedProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      handleAxiosError(error, 'Profile update');
      if (userProfile) setEditedProfile(userProfile);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = () => {
    if (!editedProfile.displayName.trim()) {
      Alert.alert('Error', 'Display name is required.');
      return;
    }
    updateUserProfile(editedProfile);
  };

  return {
    userProfile,
    editedProfile,
    setEditedProfile,  // Exposing this setter function
    loading,
    uploading,
    isEditing,
    setIsEditing,
    handleImagePicker,
    handleSaveProfile,
    cancelEdit: () => {
      setIsEditing(false);
      if (userProfile) setEditedProfile(userProfile);
    },
  };
};