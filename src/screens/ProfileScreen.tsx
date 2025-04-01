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
  Dimensions, // Import Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext'; // Assuming you have this
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator'; // Assuming you have this
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError } from 'axios';
import auth from '@react-native-firebase/auth';
import { REACT_APP_BASE_URL } from '@env'; // Assuming you have this
import * as ImagePicker from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import Icon from 'react-native-vector-icons/Feather'; // Using Feather icons

const BASE_URL = REACT_APP_BASE_URL;

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

// --- Define Theme Colors (Adjust these to your actual theme) ---
const lightColors = {
  background: '#F0F2F5', // Lighter grey background
  surface: '#FFFFFF', // Card background
  primary: '#007AFF', // Example primary blue
  text: '#1C1C1E', // Dark text
  textSecondary: '#6E6E73', // Grey text
  border: '#D1D1D6',
  error: '#FF3B30',
  success: '#34C759',
  buttonSecondaryBackground: '#E5E5EA',
};

const darkColors = {
  background: '#000000', // Black background
  surface: '#1C1C1E', // Dark grey card background
  primary: '#0A84FF', // Brighter blue for dark mode
  text: '#FFFFFF', // White text
  textSecondary: '#8E8E93', // Lighter grey text
  border: '#3A3A3C',
  error: '#FF453A',
  success: '#32D74B',
  buttonSecondaryBackground: '#2C2C2E',
};
// --- End Theme Colors ---


const ProfileScreen: FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? darkColors : lightColors; // Use theme colors

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

  // --- useEffect and Handlers (Keep your existing logic) ---
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const user = auth().currentUser;
        const storedUserId = await AsyncStorage.getItem('userId');
        // console.log('Stored User ID:', storedUserId);
        // console.log('Firebase User:', user?.uid, user?.displayName, user?.photoURL);

        if (!user || !storedUserId) {
          throw new Error('No authenticated user or stored user ID');
        }

        const profileUrl = `${BASE_URL}/api/v1/users/${storedUserId}/profile`;
        // console.log('Fetching profile from:', profileUrl);
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
          profile = {
            displayName: user.displayName || 'Unknown User',
            email: user.email || '',
            photoURL: user.photoURL || null,
            bio: '', // Assuming bio isn't in Firebase auth
            uid: storedUserId,
          };
        }

        // console.log('Fetched profile:', profile);
        // console.log('Final photoURL:', profile.photoURL);
        setUserProfile(profile);
        setEditedProfile(profile); // Initialize edit form
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
      // Your existing error handling logic...
      console.error('Full error object:', error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>; // Added type argument
        console.log('Axios Error Details:', { /* ... */ });
        if (!axiosError.response) {
          Alert.alert('Network Error', 'Could not connect to the server. Check if the backend is running.');
        } else if (axiosError.response.status === 404) {
          Alert.alert('Not Found', 'User profile not found on the server. Using local data.');
        } else if (axiosError.response.status === 401) {
          Alert.alert('Unauthorized', 'You are not authorized to view this profile.');
        } else {
            // Try to get a meaningful message from backend response data
            const errorData = axiosError.response.data;
            const message = errorData?.message || errorData?.error || 'Unknown server error';
            Alert.alert(
              'Server Error',
              `Code: ${axiosError.response.status}. ${message}`
            );
        }
      } else {
        Alert.alert('Unexpected Error', `An unexpected error occurred: ${(error as Error)?.message || 'Unknown'}`);
      }
  };

  const handleImagePicker = async () => {
      const options: ImagePicker.ImageLibraryOptions = {
        mediaType: 'photo',
        quality: 0.8, // Slightly reduce quality for faster uploads
        includeBase64: false,
      };

      ImagePicker.launchImageLibrary(options, async (response) => {
        if (response.didCancel) { /* ... */ }
        else if (response.errorCode) { /* ... */ }
        else if (response.assets && response.assets.length > 0) {
          const source = response.assets[0].uri;
          if (source) { await uploadImage(source); }
        }
      });
  };

  const uploadImage = async (uri: string) => {
      setUploading(true);
      const userId = auth().currentUser?.uid;
      if (!userId) { /* ... */ return; }

      // Consider more unique filenames if needed
      const filename = `profile_${userId}_${Date.now()}.jpg`;
      const uploadUri = Platform.OS === 'ios' ? uri.replace('file://', '') : uri;
      const reference = storage().ref(`profile-pictures/${userId}/${filename}`);
      const task = reference.putFile(uploadUri);

      try {
        await task;
        const url = await reference.getDownloadURL();
        // Update UI immediately for better UX
        setEditedProfile((prev) => ({ ...prev, photoURL: url }));
        // Then trigger the backend update
        await updateUserProfile({ ...editedProfile, photoURL: url }, true); // Pass flag to indicate only photo changed initially
      } catch (e) {
        console.error('Error uploading image:', e);
        Alert.alert('Error', 'Failed to upload image.');
      } finally {
        setUploading(false);
      }
  };

    // Modified to handle partial updates (like just photo)
  const updateUserProfile = async (profileData: UserProfile, isPhotoUpdateOnly: boolean = false) => {
      const user = auth().currentUser;
      if (!user) { /* ... */ return; }

      setLoading(true); // Show loading indicator during save

      try {
          // Update Firebase Auth Profile (Display Name & Photo URL)
          const authUpdates: { displayName?: string; photoURL?: string | null } = {};
          if (profileData.displayName !== user.displayName) {
              authUpdates.displayName = profileData.displayName;
          }
          if (profileData.photoURL !== user.photoURL) {
              authUpdates.photoURL = profileData.photoURL;
          }
          if (Object.keys(authUpdates).length > 0) {
              await user.updateProfile(authUpdates);
          }

          // Update Backend Profile (adjust endpoint/payload as needed)
          // Example: Sending only changed fields
          const backendPayload = {
              displayName: profileData.displayName,
              bio: profileData.bio,
              photoURL: profileData.photoURL, // Send updated photoURL
          };
          // Use PUT or PATCH depending on your API design
          const response = await axios.put(`${BASE_URL}/api/v1/users/${user.uid}/profile`, backendPayload);

          // Update local state with combined data
          const updatedProfile: UserProfile = {
            displayName: profileData.displayName, // Use data sent
            bio: profileData.bio,               // Use data sent
            photoURL: profileData.photoURL,     // Use data sent
            email: user.email || '',            // Get email from auth user
            uid: user.uid,
          };

          setUserProfile(updatedProfile);
          setEditedProfile(updatedProfile); // Sync edited state
          setIsEditing(false); // Exit editing mode on success
          Alert.alert('Success', 'Profile updated successfully.');

      } catch (error) {
          console.error('Error updating user profile:', error);
          handleAxiosError(error);
          // Optional: Revert editedProfile state on error?
          // if (userProfile) setEditedProfile(userProfile);
      } finally {
          setLoading(false);
      }
  };

  const handleSaveProfile = () => {
      if (!editedProfile.displayName.trim()) { /* ... */ return; }
      // console.log('Saving profile:', editedProfile);
      updateUserProfile(editedProfile); // Pass the entire edited profile
  };
 // --- End Handlers ---


  // --- Render Loading State ---
  if (loading && !userProfile) { // Show full screen loader only on initial load
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // --- Render Empty State ---
  if (!userProfile && !loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
         <View style={styles.loadingContainer}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Could not load profile data.
            </Text>
            {/* Optional: Add a retry button */}
         </View>
      </SafeAreaView>
    );
  }

  // Fallback image if photoURL is invalid or null
  const placeholderImage = 'https://via.placeholder.com/150/CCCCCC/FFFFFF?text=User'; // Placeholder URL
  const imageUri = editedProfile.photoURL && editedProfile.photoURL.startsWith('https')
                      ? editedProfile.photoURL
                      : (userProfile?.photoURL && userProfile.photoURL.startsWith('https')
                         ? userProfile.photoURL
                         : placeholderImage);


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100} // Adjust offset if needed
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false} // Hide scrollbar for cleaner look
        >
          {/* --- Header --- */}
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Profile
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Manage your profile information
            </Text>
          </Animated.View>

          {/* --- Profile Card --- */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(100)}
            style={[styles.profileCard, { backgroundColor: colors.surface }]}
          >
            {/* --- Image Picker and Display --- */}
            <TouchableOpacity
                onPress={isEditing ? handleImagePicker : undefined} // Only allow picker in edit mode
                disabled={uploading || !isEditing}
                style={styles.imageContainer}
            >
                <Image
                    source={{ uri: imageUri }}
                    style={styles.profileImage}
                    onError={() => { console.log('Image failed to load, showing placeholder logic might be needed'); }}
                />
                {uploading && (
                    <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#FFF" />
                    </View>
                )}
                {isEditing && !uploading && ( // Show edit icon only in edit mode and when not uploading
                    <View style={[styles.editIconOverlay, { backgroundColor: colors.primary }]}>
                    <Icon name="camera" size={18} color="#FFFFFF" />
                    </View>
                )}
            </TouchableOpacity>

            {/* --- Edit Mode --- */}
            {isEditing ? (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.formContainer}>
                {/* Display Name Input */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Display Name</Text>
                    <TextInput
                        style={[
                            styles.input,
                            { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }
                        ]}
                        placeholder="Enter your display name"
                        placeholderTextColor={colors.textSecondary}
                        value={editedProfile.displayName}
                        onChangeText={(text) => setEditedProfile((prev) => ({ ...prev, displayName: text }))}
                    />
                </View>

                {/* Bio Input */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Bio</Text>
                    <TextInput
                        style={[
                            styles.input, styles.textArea, // Added textArea style
                            { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }
                        ]}
                        placeholder="Tell us a bit about yourself (optional)"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        numberOfLines={4}
                        value={editedProfile.bio}
                        onChangeText={(text) => setEditedProfile((prev) => ({ ...prev, bio: text }))}
                        textAlignVertical="top" // Align text top for multiline
                    />
                 </View>

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.buttonSecondaryBackground }]}
                        onPress={() => {
                            setIsEditing(false);
                            if (userProfile) setEditedProfile(userProfile); // Reset changes
                        }}
                        disabled={loading} // Disable while saving
                    >
                        <Text style={[styles.actionButtonText, { color: colors.text }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                        onPress={handleSaveProfile}
                        disabled={loading} // Disable while saving
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                           <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Save Changes</Text>
                        )}
                    </TouchableOpacity>
                </View>
              </Animated.View>

            /* --- View Mode --- */
            ) : (
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {userProfile?.displayName}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                  {userProfile?.email}
                </Text>
                {userProfile?.bio ? (
                  <Text style={[styles.profileBio, { color: colors.textSecondary }]}>
                    {userProfile.bio}
                  </Text>
                ) : (
                    <Text style={[styles.profileBio, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                       No bio added yet.
                    </Text>
                )}
                 {/* Edit Button - Moved below info for better flow */}
                <TouchableOpacity
                    style={[styles.editButton, { backgroundColor: colors.primary }]}
                    onPress={() => setIsEditing(true)}
                >
                    <Icon name="edit-2" size={16} color="#FFFFFF" style={{marginRight: 5}} />
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

           {/* --- Optional: Add other sections like Settings, Logout etc. --- */}
           {/*
           <Animated.View entering={FadeInUp.duration(600).delay(200)}>
             <TouchableOpacity style={[styles.listItem, { backgroundColor: colors.surface }]}>
               <Icon name="settings" size={20} color={colors.textSecondary} />
               <Text style={[styles.listItemText, { color: colors.text }]}>Account Settings</Text>
               <Icon name="chevron-right" size={20} color={colors.textSecondary} />
             </TouchableOpacity>
             <TouchableOpacity style={[styles.listItem, { backgroundColor: colors.surface }]}>
               <Icon name="log-out" size={20} color={colors.error} />
               <Text style={[styles.listItemText, { color: colors.error }]}>Logout</Text>
             </TouchableOpacity>
           </Animated.View>
           */}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};


// --- Updated Styles ---
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20, // Consistent horizontal padding
    paddingVertical: 24, // Top/bottom padding for scroll view content
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  header: {
    marginBottom: 32, // More space below header
  },
  headerTitle: {
    fontSize: 34, // Slightly larger
    fontWeight: 'bold', // Keep bold
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 17, // Slightly larger subtitle
  },
  profileCard: {
    borderRadius: 18, // Slightly more rounded corners
    padding: 24,
    marginBottom: 32, // Space below card
    alignItems: 'center',
    // Use subtle shadow for light mode, maybe border for dark
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1, // Softer shadow
    shadowRadius: 15,
    elevation: 8,
  },
  imageContainer: {
    position: 'relative', // For overlay positioning
    marginBottom: 24, // Space below image
  },
  profileImage: {
    width: 130, // Slightly larger image
    height: 130,
    borderRadius: 65, // Half of width/height
    borderWidth: 3, // Optional: Add border
    borderColor: '#FFFFFF', // White border often looks good
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 65,
  },
  editIconOverlay: { // For the camera icon in edit mode
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF', // White border around icon background
  },
  profileInfo: { // Container for text below image in view mode
    alignItems: 'center',
    width: '100%',
  },
  profileName: {
    fontSize: 26, // Larger name
    fontWeight: '600', // Semi-bold
    marginBottom: 6,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 16,
    marginBottom: 12, // Space below email
  },
  profileBio: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22, // Better readability for multi-line bio
    marginBottom: 24, // Space below bio
  },
  editButton: { // Button shown in view mode
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25, // Pill shape
    marginTop: 16, // Space above button
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // --- Edit Mode Styles ---
  formContainer: {
    width: '100%', // Ensure form elements take full width
    marginTop: 16,
  },
  inputGroup: {
    marginBottom: 20, // Space between input fields
  },
  inputLabel: {
      fontSize: 14,
      fontWeight: '500',
      marginBottom: 8, // Space between label and input
  },
  input: {
    width: '100%',
    borderWidth: 1, // Use border instead of just bottom border
    borderRadius: 12, // Rounded inputs
    paddingHorizontal: 16,
    paddingVertical: 14, // More vertical padding
    fontSize: 16,
  },
  textArea: {
    height: 100, // Fixed height for bio input
  },
  buttonRow: { // For Save/Cancel buttons
    flexDirection: 'row',
    justifyContent: 'space-between', // Space out buttons
    marginTop: 24, // Space above buttons
  },
  actionButton: {
    flex: 1, // Make buttons share width equally
    paddingVertical: 14, // Consistent padding
    borderRadius: 12, // Match input rounding
    alignItems: 'center',
    marginHorizontal: 6, // Add slight space between buttons
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // --- Loading/Info States ---
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoText: {
      fontSize: 16,
      textAlign: 'center',
  },
  // --- Optional List Item Styles ---
  /*
  listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 12,
      // Add shadow/border similar to profileCard based on theme
  },
  listItemText: {
      flex: 1,
      marginLeft: 16,
      fontSize: 17,
  },
  */
});

export default ProfileScreen;