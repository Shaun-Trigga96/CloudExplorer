// src/screens/ProfileScreen.tsx
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useCustomTheme } from '../context/ThemeContext';
import { darkColors, lightColors } from '../styles/colors';
import { useProfile } from '../components/hooks/useProfile';
import { LoadingView } from '../components/common/LoadingView';
import { profileStyles } from '../styles/profileStyles';
import { ProfileCard, ProfileHeader } from '../components/profile';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProfileScreen'>;

interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { isDarkMode } = useCustomTheme();
  const colors = isDarkMode ? darkColors : lightColors;
  const { 
    userProfile, 
    editedProfile, 
    loading, 
    uploading, 
    isEditing, 
    setIsEditing,
    setEditedProfile, // Make sure this is destructured from useProfile
    handleImagePicker, 
    handleSaveProfile, 
    cancelEdit 
  } = useProfile();

  if (loading && !userProfile) {
    return <LoadingView message="Loading profile..." />;
  }

  if (!userProfile && !loading) {
    return (
      <SafeAreaView style={[profileStyles.safeArea, { backgroundColor: colors.background }]}>
        <View style={profileStyles.loadingContainer}>
          <Text style={[profileStyles.infoText, { color: colors.textSecondary }]}>
            Could not load profile data.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[profileStyles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={profileStyles.keyboardAvoidingContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -100}
      >
        <ScrollView
          style={profileStyles.container}
          contentContainerStyle={profileStyles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <ProfileHeader />
          <ProfileCard
            userProfile={userProfile}
            editedProfile={editedProfile}
            isEditing={isEditing}
            uploading={uploading}
            setEditedProfile={setEditedProfile}
            handleImagePicker={handleImagePicker}
            handleSaveProfile={handleSaveProfile}
            cancelEdit={cancelEdit}
            setIsEditing={setIsEditing}
          />
          <TouchableOpacity style={[profileStyles.listItem, { backgroundColor: colors.surface }]}>
            <Icon name="settings" size={20} color={colors.textSecondary} />
            <Text style={[profileStyles.listItemText, { color: colors.text }]}>Account Settings</Text>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={[profileStyles.listItem, { backgroundColor: colors.surface }]}>
            <Icon name="log-out" size={20} color={colors.error} />
            <Text style={[profileStyles.listItemText, { color: colors.error }]}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ProfileScreen;