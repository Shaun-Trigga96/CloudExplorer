import React, { FC, useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Feather';
import { REACT_APP_BASE_URL } from '@env';
import { useCustomTheme } from '../context/ThemeContext';
import PostItem from '../components/community/PostItem';
import MemberItem from '../components/community/MemberItem';
import EventCard from '../components/community/EventCard';
import NotificationCard from '../components/community/NotificationCard';
import TopicButton from '../components/community/TopicButton';
import SearchBar from '../components/community/SearchBar';
import TabBar from '../components/community/TabBar';
import FAB from '../components/community/FAB';
import { CommunityPost, Topic, CommunityMember, CommunityEvent, CommunityUser } from '../types/community';
import { debounce } from '../utils/debounce';
import { handleApiError } from '../utils/errorHandler';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { RootStackParamList } from '../navigation/RootNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { communityStyles } from '../styles/communityStyles';
import Animated, { FadeIn } from 'react-native-reanimated';

const BASE_URL = REACT_APP_BASE_URL;

interface CommunityScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DashboardScreen'>;
}

const CommunityScreen: FC<CommunityScreenProps> = ({ navigation }) => {
  const { theme: { colors } } = useCustomTheme();
  const [loading, setLoading] = useState<boolean>(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [selectedTab, setSelectedTab] = useState<string>('feed');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [postsLastId, setPostsLastId] = useState<string | null>(null);
  const [membersLastId, setMembersLastId] = useState<string | null>(null);
  const [eventsLastId, setEventsLastId] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState<boolean>(true);
  const [hasMoreMembers, setHasMoreMembers] = useState<boolean>(true);
  const [hasMoreEvents, setHasMoreEvents] = useState<boolean>(true);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastVisiblePostTimestamp, setLastVisiblePostTimestamp] = useState<FirebaseFirestoreTypes.Timestamp | null>(null);

  const handleTopicSelect = useCallback((topicName: string) => {
    setSelectedTopic(prev => (prev === topicName ? null : topicName));
  }, []);

  const handleLikePost = useCallback(async (postId: string) => {
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
      setPosts(originalPosts);
      handleApiError(error, 'Could not update like status.');
    }
  }, [posts]);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      const storedUserId = await AsyncStorage.getItem('userId');
      setUserId(storedUserId);
      await fetchCommunityData(true, storedUserId);
      setLoading(false);
    };
    loadInitialData();

    let unsubscribePosts: (() => void) | null = null;
    if (posts.length > 0 && lastVisiblePostTimestamp) {
      const postsQuery = firestore()
        .collection('posts')
        .orderBy('timestamp', 'desc')
        .where('timestamp', '>', lastVisiblePostTimestamp);
      unsubscribePosts = postsQuery.onSnapshot(
        (querySnapshot) => {
          const newPosts: CommunityPost[] = [];
          querySnapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const postData = change.doc.data();
              const postId = change.doc.id;
              const userDetails = await fetchUserDetailsForPost(postData.userId);
              newPosts.push({
                id: postId,
                user: userDetails || { id: postData.userId, name: 'Loading...', avatar: null, level: '' },
                content: postData.content || '',
                topic: postData.topic || 'General',
                likes: postData.likes || 0,
                comments: postData.comments || 0,
                timestamp: postData.timestamp?.toDate()?.toISOString() || new Date().toISOString(),
                isLiked: false,
              });
            }
          });
          if (newPosts.length > 0) {
            setPosts(prevPosts => [...newPosts, ...prevPosts]);
          }
        },
        (error) => {
          console.error("Error listening to posts:", error);
        }
      );
    }
    return () => {
      if (unsubscribePosts) unsubscribePosts();
    };
  }, [lastVisiblePostTimestamp]);

  const fetchUserDetailsForPost = async (userId: string): Promise<CommunityUser | null> => {
    try {
      const userDoc = await firestore().collection('users').doc(userId).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        return {
          id: userId,
          name: data?.displayName || 'Unknown',
          avatar: data?.photoURL || null,
          level: data?.level || 'Beginner',
        };
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch user details for post:", error);
      return null;
    }
  };

  const fetchCommunityData = async (refresh = false, currentUserId: string | null) => {
    if (refresh) {
      setRefreshing(true);
      setPostsLastId(null);
      setMembersLastId(null);
      setEventsLastId(null);
      setHasMorePosts(true);
      setHasMoreMembers(true);
      setHasMoreEvents(true);
    } else if (!isFetchingMore) {
      setIsFetchingMore(true);
    }
    try {
      if ((refresh || selectedTab === 'feed') && hasMorePosts) {
        try {
          const postsParams = { limit: 10, lastId: refresh ? undefined : postsLastId };
          const postsResponse = await axios.get(`${BASE_URL}/api/v1/community/posts`, { params: postsParams });
          const newPosts = postsResponse.data.posts || [];
          if (!refresh) {
            setPosts(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const trulyNewPosts = newPosts.filter((p: { id: string; }) => !existingIds.has(p.id));
              return [...prev, ...trulyNewPosts];
            });
          } else {
            setPosts(newPosts);
            if (newPosts.length > 0) {
              const firstPostTimestamp = newPosts[0].timestamp;
              setLastVisiblePostTimestamp(firestore.Timestamp.fromDate(new Date(firstPostTimestamp)));
            } else {
              setLastVisiblePostTimestamp(null);
            }
          }
          setPostsLastId(postsResponse.data.lastId);
          setHasMorePosts(postsResponse.data.hasMore);
        } catch (error) {
          console.error('Error fetching posts:', error);
          setHasMorePosts(false);
        }
      }

      if ((refresh || selectedTab === 'members') && hasMoreMembers) {
        try {
          const membersParams = { limit: 15, lastId: refresh ? undefined : membersLastId };
          const membersResponse = await axios.get(`${BASE_URL}/api/v1/community/members`, { params: membersParams });
          const newMembers = membersResponse.data.members || [];
          if (!refresh) {
            setMembers(prev => {
              const existingIds = new Set(prev.map(m => m.id));
              const trulyNewMembers = newMembers.filter((member: CommunityMember) => !existingIds.has(member.id));
              return [...prev, ...trulyNewMembers];
            });
          } else {
            setMembers(newMembers);
          }
          setMembersLastId(membersResponse.data.lastId);
          setHasMoreMembers(membersResponse.data.hasMore);
        } catch (error) {
          console.error('Error fetching members:', error);
          setHasMoreMembers(false);
        }
      }

      if ((refresh || selectedTab === 'events') && hasMoreEvents) {
        try {
          const eventsParams: { limit: number; userId?: string | null; lastId?: string | null } = {
            limit: 10,
            userId: currentUserId,
            lastId: refresh ? undefined : eventsLastId
          };
          const eventsResponse = await axios.get(`${BASE_URL}/api/v1/community/events`, { params: eventsParams });
          const newEvents = eventsResponse.data.events || [];
          if (!refresh) {
            setEvents(prev => {
              const existingIds = new Set(prev.map(e => e.id));
              const trulyNewEvents = newEvents.filter((event: CommunityEvent) => !existingIds.has(event.id));
              return [...prev, ...trulyNewEvents];
            });
          } else {
            setEvents(newEvents);
          }
          setEventsLastId(eventsResponse.data.lastId);
          setHasMoreEvents(eventsResponse.data.hasMore);
        } catch (error) {
          console.error('Error fetching events:', error);
          setHasMoreEvents(false);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetchingMore(false);
    }
  };

  const handleLoadMorePosts = useCallback(() => {
    if (!isFetchingMore && hasMorePosts) {
      fetchCommunityData(false, userId);
    }
  }, [isFetchingMore, hasMorePosts, userId]);

  const handleLoadMoreMembers = useCallback(() => {
    if (!isFetchingMore && hasMoreMembers) {
      fetchCommunityData(false, userId);
    }
  }, [isFetchingMore, hasMoreMembers, userId]);

  const handleLoadMoreEvents = useCallback(() => {
    if (!isFetchingMore && hasMoreEvents) {
      fetchCommunityData(false, userId);
    }
  }, [isFetchingMore, hasMoreEvents, userId]);

  const debouncedSearch = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  const filteredPosts = useMemo(
    () => selectedTopic ? posts.filter(post => post.topic === selectedTopic) : posts,
    [posts, selectedTopic]
  );

  const renderFeed = () => (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={communityStyles.topicsScroll}>
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
          renderItem={({ item }) => (
            <PostItem post={item} onLike={handleLikePost} />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={communityStyles.feedContainer}
          showsVerticalScrollIndicator={false}
          onRefresh={() => fetchCommunityData(true, userId)}
          refreshing={refreshing}
          onEndReached={handleLoadMorePosts}
          onEndReachedThreshold={0.5}
          disableVirtualization={false}
          ListEmptyComponent={
            <View style={communityStyles.emptyContainer}>
              <Icon name="inbox" size={48} color={colors.textSecondary} />
              <Text style={[communityStyles.emptyText, { color: colors.textSecondary }]}>
                {selectedTopic ? 'No posts found in this topic' : 'No posts yet. Start a discussion!'}
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetchingMore ? (
              <ActivityIndicator style={{ marginVertical: 20 }} size="small" color={colors.primary} />
            ) : !hasMorePosts && posts.length > 0 ? (
              <Text style={[communityStyles.endListText, { color: colors.textSecondary }]}>No more posts</Text>
            ) : null
          }
        />
        <FAB onPress={() => navigation.navigate('CreatePostScreen')} />
      </>
    );

  const renderMembers = () => (
    <FlatList
      data={members}
      renderItem={({ item }) => <MemberItem member={item} />}
      keyExtractor={item => item.id}
      contentContainerStyle={communityStyles.membersContainer}
      showsVerticalScrollIndicator={false}
      onRefresh={() => fetchCommunityData(true, userId)}
      refreshing={refreshing}
      onEndReached={handleLoadMoreMembers}
      onEndReachedThreshold={0.5}
      ListHeaderComponent={
        <View style={communityStyles.membersHeader}>
          <Text style={[communityStyles.sectionTitle, { color: colors.text }]}>Cloud Experts Community</Text>
          <Text style={[communityStyles.sectionSubtitle, { color: colors.textSecondary }]}>
            Connect with {members.length}+ cloud professionals
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={communityStyles.emptyContainer}>
          <Icon name="users" size={48} color={colors.textSecondary} />
          <Text style={[communityStyles.emptyText, { color: colors.textSecondary }]}>No members found.</Text>
        </View>
      }
      ListFooterComponent={
        isFetchingMore ? (
          <ActivityIndicator style={{ marginVertical: 20 }} size="small" color={colors.primary} />
        ) : !hasMoreMembers && members.length > 0 ? (
          <Text style={[communityStyles.endListText, { color: colors.textSecondary }]}>No more members</Text>
        ) : null
      }
    />
  );

  const renderEvents = () => (
    <FlatList
      data={events}
      renderItem={({ item }) => <EventCard event={item} userId={userId} />}
      keyExtractor={item => item.id.toString()}
      contentContainerStyle={communityStyles.eventsContent}
      showsVerticalScrollIndicator={false}
      onRefresh={() => fetchCommunityData(true, userId)}
      refreshing={refreshing}
      onEndReached={handleLoadMoreEvents}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <View style={communityStyles.emptyContainer}>
          <Icon name="calendar" size={48} color={colors.textSecondary} />
          <Text style={[communityStyles.emptyText, { color: colors.textSecondary }]}>No events found.</Text>
        </View>
      }
      ListFooterComponent={
        isFetchingMore ? (
          <ActivityIndicator style={{ marginVertical: 20 }} size="small" color={colors.primary} />
        ) : !hasMoreEvents && events.length > 0 ? (
          <Text style={[communityStyles.endListText, { color: colors.textSecondary }]}>No more events</Text>
        ) : null
      }
    />
  );

  if (loading && posts.length === 0 && members.length === 0 && events.length === 0) {
    return (
      <View style={[communityStyles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[communityStyles.container, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeIn.duration(300)} style={communityStyles.header}>
        <Text style={[communityStyles.title, { color: colors.text }]}>Community Hub</Text>
      </Animated.View>
      <SearchBar value={searchQuery} onChange={debouncedSearch} />
      <TabBar selectedTab={selectedTab} onSelect={setSelectedTab} />
      {selectedTab === 'feed' && renderFeed()}
      {selectedTab === 'members' && renderMembers()}
      {selectedTab === 'events' && renderEvents()}
    </SafeAreaView>
  );
};

export default CommunityScreen;