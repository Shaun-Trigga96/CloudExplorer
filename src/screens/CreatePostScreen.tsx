// src/screens/CreatePostScreen.tsx
import React, { useState, useEffect, useCallback, FC } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { REACT_APP_BASE_URL } from '@env';
import { useCustomTheme } from '../context/ThemeContext';
//import { Picker } from '@react-native-picker/picker';
import { RootStackParamList } from '../navigation/RootNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const BASE_URL = REACT_APP_BASE_URL;

// Define common topics or fetch them from backend if dynamic
const POST_TOPICS = ['General', 'GCP', 'AWS', 'Azure', 'Career', 'Q&A'];
const MAX_CONTENT_LENGTH = 1000;

interface CreatePostScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreatePostScreen'>; // Add specific navigation type if using React Navigation strongly typed
}

const CreatePostScreen: FC<CreatePostScreenProps> = ({ navigation }) => {
  const { theme } = useCustomTheme();
  const { colors } = theme;
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>(POST_TOPICS[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch userId when component mounts
    const fetchUserId = async () => {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) {
        Alert.alert('Error', 'You must be logged in to create a post.');
        navigation.goBack();
      } else {
        setUserId(storedUserId);
      }
    };
    fetchUserId();
  }, [navigation]);

  const validateContent = (text: string) => {
      setContent(text);
      if (text.trim().length === 0) {
          setContentError('Post content cannot be empty.');
      } else if (text.length > MAX_CONTENT_LENGTH) {
          setContentError(`Post cannot exceed ${MAX_CONTENT_LENGTH} characters.`);
      } else {
          setContentError(null);
      }
  };

  const handlePostSubmit = useCallback(async () => {
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please log in again.');
      return;
    }
    if (contentError || content.trim().length === 0) {
        Alert.alert('Invalid Input', contentError || 'Post content cannot be empty.');
        return;
    }
    if (!selectedTopic) {
        Alert.alert('Invalid Input', 'Please select a topic.');
        return;
    }

    setIsLoading(true);
    try {
      const payload = {
        userId: userId, // IMPORTANT: Backend MUST verify this against the auth token
        content: content.trim(),
        topic: selectedTopic,
      };
      // Assuming your backend expects userId in the body for now,
      // but ideally, it should get it from the authenticated request context.
      const response = await axios.post(`${BASE_URL}/api/v1/community/posts`, payload, {
          // Add headers like Authorization: Bearer <token> if needed
      });

      if (response.status === 201) {
        Alert.alert('Success', 'Post created successfully!');
        // Optionally pass back the new post data or trigger a refresh
        navigation.goBack();
      } else {
        throw new Error(response.data.message || 'Failed to create post');
      }
    } catch (error: any) {
      console.error('Error creating post:', error);
      const message = error.response?.data?.message || error.message || 'An unexpected error occurred.';
      Alert.alert('Error', `Failed to create post: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, [userId, content, selectedTopic, navigation, contentError]);

  // Set the Post button in the header
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handlePostSubmit}
          disabled={isLoading || !!contentError || content.trim().length === 0}
          style={styles.headerButton}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.headerButtonText, { color: (!!contentError || content.trim().length === 0) ? colors.textSecondary : colors.primary }]}>
              Post
            </Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, handlePostSubmit, isLoading, colors, contentError, content]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0} // Adjust offset if needed
      >
          <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, { color: colors.text }]}>Topic</Text>
              {/* Simple Topic Selector using Buttons */}
              <View style={styles.topicSelector}>
                  {POST_TOPICS.map(topic => (
                      <TouchableOpacity
                          key={topic}
                          style={[
                              styles.topicButton,
                              selectedTopic === topic ? { backgroundColor: colors.primary } : { backgroundColor: colors.primary, borderColor: colors.border },
                              selectedTopic !== topic && { borderWidth: 1 }
                          ]}
                          onPress={() => setSelectedTopic(topic)}
                      >
                          <Text style={[styles.topicButtonText, selectedTopic === topic ? { color: colors.primary } : { color: colors.text }]}>
                              {topic}
                          </Text>
                      </TouchableOpacity>
                  ))}
              </View>
              {/* <View style={[styles.pickerContainer, { backgroundColor: colors.primary, borderColor: colors.border }]}>
                  <Picker
                      selectedValue={selectedTopic}
                      onValueChange={(itemValue: React.SetStateAction<string>) => setSelectedTopic(itemValue)}
                      style={[styles.picker, { color: colors.text }]}
                      dropdownIconColor={colors.textSecondary}
                  >
                      {POST_TOPICS.map(topic => (
                          <Picker.Item key={topic} label={topic} value={topic} />
                      ))}
                  </Picker>
              </View>
               */}

              <Text style={[styles.label, { color: colors.text }]}>What's on your mind?</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.primary, borderColor: contentError ? colors.error : colors.border }]}>
                <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Share your thoughts, ask questions..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    value={content}
                    onChangeText={validateContent}
                    maxLength={MAX_CONTENT_LENGTH + 50} // Allow slight overtyping before showing error rigidly
                    textAlignVertical="top" // Android specific
                />
              </View>
                <Text style={[styles.charCount, { color: contentError ? colors.error : colors.textSecondary }]}>
                    {content.length}/{MAX_CONTENT_LENGTH}
                </Text>
                {contentError && <Text style={[styles.errorText, { color: colors.error }]}>{contentError}</Text>}

          </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
      borderWidth: 1,
      borderRadius: 8,
      minHeight: 150, // Start with a decent height
      paddingHorizontal: 12,
      paddingTop: 12, // Ensure padding for multiline start
      paddingBottom: 12,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1, // Take remaining space if needed
    height: '100%', // Ensure it fills the container vertically
  },
  topicSelector: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 16,
  },
  topicButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      marginBottom: 8,
  },
  topicButtonText: {
      fontSize: 13,
      fontWeight: '500',
  },
  pickerContainer: {
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 16,
      justifyContent: 'center', // Center picker content vertically
      height: 50, // Fixed height for standard picker appearance
  },
  picker: {
      width: '100%',
  },
  headerButton: {
    marginRight: Platform.OS === 'ios' ? 0 : 16, // Adjust spacing for Android
    paddingHorizontal: 8, // Add padding for easier tapping
    paddingVertical: 4,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
   charCount: {
      fontSize: 12,
      textAlign: 'right',
      marginTop: 4,
      marginRight: 4,
  },
  errorText: {
      fontSize: 12,
      marginTop: 4,
      marginLeft: 4,
  }
});

export default CreatePostScreen;