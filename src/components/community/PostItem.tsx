import React, { FC } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import { Chip } from 'react-native-paper';
import { CommunityPost } from '../../types/community';
import { formatRelativeTime } from '../../utils/formatTime';
import { useCustomTheme } from '../../context/ThemeContext';

interface PostItemProps {
  post: CommunityPost;
  onLike: (postId: string) => void;
}

const PostItem: FC<PostItemProps> = ({ post, onLike }) => {
  const { isDarkMode } = useCustomTheme();
  const { colors, cardStyle } = useCustomTheme().theme;
  const avatarUri = post.user?.avatar || null;

  return (
    <Animated.View entering={FadeIn.duration(500)} style={[styles.container, cardStyle, { backgroundColor: colors.discussionItemBackground, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={avatarUri ? { uri: avatarUri } : require('../../assets/images/icons8-user-96.png')}
            style={styles.avatar}
          />
          <View style={styles.userText}>
            <Text style={[styles.userName, { color: colors.text }]}>{post.user?.name || 'Unknown User'}</Text>
            <Text style={[styles.userRole, { color: colors.textSecondary }]}>{post.user?.level || 'Member'}</Text>
          </View>
        </View>
        <Text style={[styles.postTime, { color: colors.textSecondary }]}>{formatRelativeTime(post.timestamp)}</Text>
      </View>

      <Text style={[styles.content, { color: colors.text }]}>{post.content}</Text>

      <View style={styles.footer}>
        <Chip style={[styles.topicChip, { backgroundColor: colors.chipBackground }]} textStyle={[styles.topicChipText, { color: colors.primary }]}>
          {post.topic}
        </Chip>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => onLike(post.id)}>
            <Icon name={post.isLiked ? 'heart' : 'heart'} size={18} color={post.isLiked ? colors.error : colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="message-circle" size={18} color={colors.textSecondary} />
            <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Icon name="share-2" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userText: {
    flexShrink: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userRole: {
    fontSize: 13,
  },
  postTime: {
    fontSize: 13,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicChip: {
    height: 28,
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 13,
    marginLeft: 5,
  },
});

export default PostItem;