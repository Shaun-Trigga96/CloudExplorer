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
  const [userId, setUserId] = useState<string | null>(null); // Get userId
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
      await fetchCommunityData(true, storedUserId); // Pass userId to initial fetch
      setLoading(false);
    };
    loadInitialData();
    // --- Real-time Listener Setup ---
    // Listen for NEW posts added after the initial load
    let unsubscribePosts: (() => void) | null = null;

    if (posts.length > 0 && lastVisiblePostTimestamp) {
      // Only attach listener if initial posts are loaded and we have a timestamp
      const postsQuery = firestore()
        .collection('posts')
        .orderBy('timestamp', 'desc')
        .where('timestamp', '>', lastVisiblePostTimestamp); // Listen for posts newer than the last one fetched initially

      unsubscribePosts = postsQuery.onSnapshot(
        (querySnapshot) => {
          const newPosts: CommunityPost[] = [];
          querySnapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
              const postData = change.doc.data();
              const postId = change.doc.id;
              // Need to fetch user details for the new post
              // This part needs refinement - fetching user details inside listener isn't ideal performance-wise
              // A better approach might involve Cloud Functions triggering updates or denormalizing user data
              // For simplicity here, we'll just add it with basic info or trigger a separate fetch later
              const userDetails = await fetchUserDetailsForPost(postData.userId); // Placeholder function

              newPosts.push({
                id: postId,
                user: userDetails || { id: postData.userId, name: 'Loading...', avatar: null, level: '' },
                content: postData.content || '',
                topic: postData.topic || 'General',
                likes: postData.likes || 0,
                comments: postData.comments || 0,
                timestamp: postData.timestamp?.toDate()?.toISOString() || new Date().toISOString(),
                isLiked: false, // Determine this based on current user later
              });
            }
            // Handle 'modified' (e.g., like count) and 'removed' if needed
          });

          if (newPosts.length > 0) {
            setPosts(prevPosts => [...newPosts, ...prevPosts]); // Add new posts to the top
          }
        },
        (error) => {
          console.error("Error listening to posts:", error);
        }
      );
    }

    // Cleanup listener on unmount
    return () => {
      if (unsubscribePosts) {
        unsubscribePosts();
      }
      // Unsubscribe from other listeners (members, events) if added
    };
    // Re-run effect if lastVisiblePostTimestamp changes (after initial fetch)
  }, [lastVisiblePostTimestamp]); // Dependency array might need refinement
  // --- Helper function (placeholder) ---

  const fetchUserDetailsForPost = async (userId: string): Promise<CommunityUser | null> => {
    // Implement actual fetching logic, perhaps caching results
    try {
      // Example: Use the backend's user detail fetching logic if exposed, or direct Firestore read
      // const response = await axios.get(`<span class="math-inline">\{BASE\_URL\}/api/v1/users/</span>{userId}/details`);
      // return response.data;
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
    } else if (!isFetchingMore) { // Prevent multiple simultaneous fetches
      setIsFetchingMore(true);
    }
    try {
      // Fetch Posts
      if ((refresh || selectedTab === 'feed') && hasMorePosts) {
        try {
          const postsParams = { limit: 10, lastId: refresh ? undefined : postsLastId };
          const postsResponse = await axios.get(`${BASE_URL}/api/v1/community/posts`, { params: postsParams });
          const newPosts = postsResponse.data.posts || [];
          if (!refresh) {
            // Filter out posts that already exist in the current state before adding
            setPosts(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const trulyNewPosts = newPosts.filter((p: { id: string; }) => !existingIds.has(p.id));
              // Optional: Log if duplicates were filtered
              if (trulyNewPosts.length < newPosts.length) {
                console.log(`Filtered out ${newPosts.length - trulyNewPosts.length} duplicate posts during load more.`);
              }
              return [...prev, ...trulyNewPosts];
            });
          } else {
            // Refresh logic replaces the array, usually safe unless API returns duplicates
            setPosts(newPosts);
            // Update timestamp for listener after refresh
            if (newPosts.length > 0) {
              const firstPostTimestamp = newPosts[0].timestamp; // Assuming sorted desc
              setLastVisiblePostTimestamp(firestore.Timestamp.fromDate(new Date(firstPostTimestamp)));
            } else {
              setLastVisiblePostTimestamp(null); // Reset if no posts
            }
          }
          setPostsLastId(postsResponse.data.lastId);
          setHasMorePosts(postsResponse.data.hasMore);
        } catch (error) {
          console.error('Error fetching posts:', error);
          setHasMorePosts(false);
        }
      }

   // Fetch Members
if ((refresh || selectedTab === 'members') && hasMoreMembers) {
  try {
    const membersParams = { limit: 15, lastId: refresh ? undefined : membersLastId };
    const membersResponse = await axios.get(`${BASE_URL}/api/v1/community/members`, { params: membersParams });
    const newMembers = membersResponse.data.members || [];

    if (!refresh) {
      // Filter out members that already exist in the current state before adding
      setMembers(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        // Ensure newMembers is typed correctly if needed, assuming it's CommunityMember[]
        const trulyNewMembers = newMembers.filter((member: CommunityMember) => !existingIds.has(member.id));
        // Optional: Log if duplicates were filtered
        // if (trulyNewMembers.length < newMembers.length) {
        //   console.log(`Filtered out ${newMembers.length - trulyNewMembers.length} duplicate members during load more.`);
        // }
        return [...prev, ...trulyNewMembers];
      });
    } else {
      // Refresh logic replaces the array
      setMembers(newMembers);
    }

    setMembersLastId(membersResponse.data.lastId);
    setHasMoreMembers(membersResponse.data.hasMore);
  } catch (error) {
    console.error('Error fetching members:', error);
    setHasMoreMembers(false); // Stop trying to load more if an error occurs
  }
}


      // Fetch Events - Fix 2: Fix indentation and structure
      if ((refresh || selectedTab === 'events') && hasMoreEvents) {
        try {
          const eventsParams: { limit: number; userId?: string | null; lastId?: string | null } = {
            limit: 10,
            userId: currentUserId, // Use the passed currentUserId
            lastId: refresh ? undefined : eventsLastId
          };
          const eventsResponse = await axios.get(`${BASE_URL}/api/v1/community/events`, { params: eventsParams });
          const newEvents = eventsResponse.data.events || [];

          if (!refresh) {
            setEvents(prev => {
              const existingIds = new Set(prev.map(e => e.id));
              // Ensure newEvents is typed correctly if needed, assuming it's CommunityEvent[]
              const trulyNewEvents = newEvents.filter((event: CommunityEvent) => !existingIds.has(event.id));
              // Optional: Log if duplicates were filtered
              if (trulyNewEvents.length < newEvents.length) {
                console.log(`Filtered out ${newEvents.length - trulyNewEvents.length} duplicate events during load more.`);
              }
              return [...prev, ...trulyNewEvents];
            });
          } else {
            // Refresh logic replaces the array
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
      // Fix 3: Make sure these state updates happen regardless of success/failure
      setLoading(false);
      setRefreshing(false);
      setIsFetchingMore(false);
    }
  };

  // Fix 4: Update these callbacks to use the proper function reference
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
        renderItem={({ item }) => <PostItem post={item} onLike={handleLikePost} />}
        keyExtractor={item => item.id}
        contentContainerStyle={communityStyles.feedContainer}
        showsVerticalScrollIndicator={false}
        onRefresh={() => fetchCommunityData(true, userId)} // Pass userId
        refreshing={refreshing}
        onEndReached={handleLoadMorePosts}
        onEndReachedThreshold={0.5}
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
      onRefresh={() => fetchCommunityData(true, userId)} // Pass userId
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
      renderItem={({ item }) => <EventCard event={item} userId={userId} />} // Pass userId
      keyExtractor={item => item.id.toString()}
      contentContainerStyle={communityStyles.eventsContent}
      showsVerticalScrollIndicator={false}
      onRefresh={() => fetchCommunityData(true, userId)} // Pass userId
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
      <View style={communityStyles.header}>
        <Text style={[communityStyles.title, { color: colors.text }]}>Community</Text>
        <TouchableOpacity style={communityStyles.notificationButton}>
          <Icon name="bell" size={24} color={colors.text} />
          <View style={[communityStyles.notificationBadge, { backgroundColor: colors.primary }]}>
            <Text style={communityStyles.notificationCount}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      <SearchBar value={searchQuery} onChange={debouncedSearch} />
      <TabBar selectedTab={selectedTab} onSelect={setSelectedTab} />

      {selectedTab === 'feed' && renderFeed()}
      {selectedTab === 'members' && renderMembers()}
      {selectedTab === 'events' && renderEvents()}
    </SafeAreaView>
  );
};



export default CommunityScreen;