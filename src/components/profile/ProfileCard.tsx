// src/components/profile/ProfileCard.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, TextInput, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import { useCustomTheme } from '../../context/ThemeContext';
import { darkColors, lightColors } from '../../styles/colors';

// Define UserProfile interface to match the one in useProfile
interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string | null;
  bio: string;
  uid: string;
}

interface ProfileCardProps {
  userProfile: UserProfile | null;
  editedProfile: UserProfile;
  isEditing: boolean;
  uploading: boolean;
  setEditedProfile: React.Dispatch<React.SetStateAction<UserProfile>>;
  handleImagePicker: () => void;
  handleSaveProfile: () => void;
  cancelEdit: () => void;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  userProfile,
  editedProfile,
  isEditing,
  uploading,
  setEditedProfile,
  handleImagePicker,
  handleSaveProfile,
  cancelEdit,
  setIsEditing,
}) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;
  const placeholderImage = 'https://via.placeholder.com/150/CCCCCC/FFFFFF?text=User';
  const imageUri =
    editedProfile.photoURL && editedProfile.photoURL.startsWith('https')
      ? editedProfile.photoURL
      : userProfile?.photoURL && userProfile.photoURL.startsWith('https')
      ? userProfile.photoURL
      : placeholderImage;

  return (
    <Animated.View
      entering={FadeInUp.duration(600).delay(100)}
      style={[styles.profileCard, { backgroundColor: colors.surface }]}
    >
      <TouchableOpacity
        onPress={isEditing ? handleImagePicker : undefined}
        disabled={uploading || !isEditing}
        style={styles.imageContainer}
      >
        <Image source={{ uri: imageUri }} style={styles.profileImage} />
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="small" color="#FFF" />
          </View>
        )}
        {isEditing && !uploading && (
          <View style={[styles.editIconOverlay, { backgroundColor: colors.primary }]}>
            <Icon name="camera" size={18} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      {isEditing ? (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Display Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter your display name"
              placeholderTextColor={colors.textSecondary}
              value={editedProfile.displayName}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, displayName: text }))}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Bio</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
              ]}
              placeholder="Tell us a bit about yourself (optional)"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={editedProfile.bio}
              onChangeText={(text) => setEditedProfile(prev => ({ ...prev, bio: text }))}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.buttonSecondaryBackground }]}
              onPress={cancelEdit}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveProfile}
            >
              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.primary }]}
            onPress={() => setIsEditing(true)}
          >
            <Icon name="edit-2" size={16} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  profileCard: {
    borderRadius: 18,
    padding: 24,
    marginBottom: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 65,
  },
  editIconOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  profileName: {
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 16,
    marginBottom: 12,
  },
  profileBio: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 16,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  formContainer: {
    width: '100%',
    marginTop: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  textArea: {
    height: 100,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileCard;