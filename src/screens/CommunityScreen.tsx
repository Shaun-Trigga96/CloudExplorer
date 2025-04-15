import React, { FC, useEffect, useState } from 'react';
import { View, Text, FlatList, ScrollView, StyleSheet, ActivityIndicator, Platform, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Feather';
import { REACT_APP_BASE_URL } from '@env';
import { useCustomTheme } from '../context/ThemeContext';
import PostItem from '../components/community/PostItem';
import MemberItem from '../components/community/MemberItem';
import EventCard from '../components/community/EventCard';
import TopicButton from '../components/community/TopicButton';
import SearchBar from '../components/community/SearchBar';
import TabBar from '../components/community/TabBar';
import FAB from '../components/community/FAB';
import { CommunityPost, Topic, CommunityMember } from '../types/community';

const BASE_URL = REACT_APP_BASE_URL;

// Mock data (can be moved to a separate file if needed)
const MOCK_TOPICS: Topic[] = [
  { id: '1', name: 'GCP', count: 120 },
  { id: '2', name: 'AWS', count: 95 },
  { id: '3', name: 'Azure', count: 80 },
];

const CommunityScreen: FC<{ navigation: any }> = ({ navigation }) => {
  const { isDarkMode } = useCustomTheme();
  const { colors } = useCustomTheme().theme;
  const [loading, setLoading] = useState<boolean>(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('feed');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [postsLastId, setPostsLastId] = useState<string | null>(null);
  const [membersLastId, setMembersLastId] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState<boolean>(true);
  const [hasMoreMembers, setHasMoreMembers] = useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);

  const handleTopicSelect = (topicName: string) => {
    setSelectedTopic(prev => (prev === topicName ? null : topicName));
  };

  const handleLikePost = async (postId: string) => {
    const originalPosts = [...posts];
    setPosts(prev =>
      prev.map(post =>
        post.id === postId
          ? { ...post, likes: post.isLiked ? post.likes - 1 : post.likes + 1, isLiked: !post.isLiked }
          : post
      )
    );

    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) throw new Error('User not logged in');
      const post = originalPosts.find(p => p.id === postId);
      if (!post) return;
      const url = `${BASE_URL}/api/v1/community/posts/${postId}/${post.isLiked ? 'unlike' : 'like'}`;
      await axios.post(url, { userId });
    } catch (error) {
      console.error('Error liking/unliking post:', error);
      setPosts(originalPosts);
      Alert.alert('Error', 'Could not update like status.');
    }
  };

  const fetchCommunityData = async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      setPostsLastId(null);
      setMembersLastId(null);
      setHasMorePosts(true);
      setHasMoreMembers(true);
    } else {
      setLoading(true);
    }

    try {
      const postsParams = { limit: 10, lastId: refresh ? undefined : postsLastId };
      const postsResponse = await axios.get(`${BASE_URL}/api/v1/community/posts`, { params: postsParams });
      const newPosts = postsResponse.data.posts || [];
      setPosts(prev => (refresh ? newPosts : [...prev, ...newPosts]));
      setPostsLastId(postsResponse.data.lastId);
      setHasMorePosts(postsResponse.data.hasMore);

      if (refresh || members.length === 0) {
        const membersParams = { limit: 15, lastId: refresh ? undefined : membersLastId };
        const membersResponse = await axios.get(`${BASE_URL}/api/v1/community/members`, { params: membersParams });
        const newMembers = membersResponse.data.members || [];
        setMembers(prev => (refresh ? newMembers : [...prev, ...newMembers]));
        setMembersLastId(membersResponse.data.lastId);
        setHasMoreMembers(membersResponse.data.hasMore);
      }

      if (refresh || topics.length === 0) {
        setTopics(MOCK_TOPICS);
      }
    } catch (error) {
      console.error('Error fetching community data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const handleLoadMorePosts = () => {
    if (!isFetchingMore && hasMorePosts) {
      setIsFetchingMore(true);
      fetchCommunityData();
    }
  };

  const handleLoadMoreMembers = () => {
    if (!isFetchingMore && hasMoreMembers) {
      setIsFetchingMore(true);
      fetchCommunityData();
    }
  };

  const filteredPosts = selectedTopic ? posts.filter(post => post.topic === selectedTopic) : posts;

  if (loading && posts.length === 0 && members.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Community</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Icon name="bell" size={24} color={colors.text} />
          <View style={[styles.notificationBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.notificationCount}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <TabBar selectedTab={selectedTab} onSelect={setSelectedTab} />

      {selectedTab === 'feed' && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topicsScroll}>
            {topics.map(topic => (
              <TopicButton
                key={topic.id}
                topic={topic}
                isSelected={selectedTopic === topic.name}
                onPress={handleTopicSelect}
              />
            ))}
          </ScrollView>
          <FlatList
            data={filteredPosts}
            renderItem={({ item }) => <PostItem post={item} onLike={handleLikePost} />}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.feedContainer}
            showsVerticalScrollIndicator={false}
            onRefresh={() => fetchCommunityData(true)}
            refreshing={refreshing}
            onEndReached={handleLoadMorePosts}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="inbox" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {selectedTopic ? 'No posts found in this topic' : 'No posts yet. Start a discussion!'}
                </Text>
              </View>
            }
            ListFooterComponent={
              isFetchingMore ? (
                <ActivityIndicator style={{ marginVertical: 20 }} size="small" color={colors.primary} />
              ) : !hasMorePosts && posts.length > 0 ? (
                <Text style={[styles.endListText, { color: colors.textSecondary }]}>No more posts</Text>
              ) : null
            }
          />
          <FAB />
        </>
      )}

      {selectedTab === 'members' && (
        <FlatList
          data={members}
          renderItem={({ item }) => <MemberItem member={item} />}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.membersContainer}
          showsVerticalScrollIndicator={false}
          onRefresh={() => fetchCommunityData(true)}
          refreshing={refreshing}
          onEndReached={handleLoadMoreMembers}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <View style={styles.membersHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Cloud Experts Community</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Connect with {members.length}+ cloud professionals
              </Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="users" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No members found.</Text>
            </View>
          }
          ListFooterComponent={
            isFetchingMore ? (
              <ActivityIndicator style={{ marginVertical: 20 }} size="small" color={colors.primary} />
            ) : !hasMoreMembers && members.length > 0 ? (
              <Text style={[styles.endListText, { color: colors.textSecondary }]}>No more members</Text>
            ) : null
          }
        />
      )}

      {selectedTab === 'events' && (
        <ScrollView style={styles.eventsContainer} contentContainerStyle={styles.eventsContent}>
          <EventCard
            event={{
              id: 1,
              title: 'GCP Certifications Roadmap Webinar',
              date: 'Apr 15, 2025',
              time: '2:00 PM - 3:30 PM EST',
              description:
                'Join Google Cloud experts as they discuss the latest GCP certification paths, exam preparation strategies, and career opportunities for certified professionals.',
              attending: 34,
              interested: 12,
              speakers: 5,
              daysLeft: 1,
              isUpcoming: true,
            }}
          />
          <Text style={[styles.pastEventsTitle, { color: colors.text }]}>Past Events</Text>
          {[
            { id: 2, title: 'Machine Learning on GCP Workshop', date: 'Mar 28, 2025' },
            { id: 3, title: 'Cloud Security Best Practices Panel', date: 'Mar 15, 2025' },
            { id: 4, title: 'Kubernetes for Beginners', date: 'Feb 22, 2025' },
          ].map((event, index) => (
            <EventCard key={event.id} event={event} index={index} />
          ))}
          <TouchableOpacity style={[styles.allEventsButton, { borderColor: colors.border }]}>
            <Text style={[styles.allEventsText, { color: colors.primary }]}>View All Past Events</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 0,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  topicsScroll: {
    maxHeight: 40,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  feedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  membersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  membersHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 15,
  },
  eventsContainer: {
    flex: 1,
  },
  eventsContent: {
    padding: 16,
    paddingBottom: 80,
  },
  pastEventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  allEventsButton: {
    paddingVertical: 14,
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 16,
  },
  allEventsText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  endListText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
});

export default CommunityScreen;