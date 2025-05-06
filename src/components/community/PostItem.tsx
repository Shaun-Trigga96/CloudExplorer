import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';
import { Chip, Avatar } from 'react-native-paper';
import { CommunityPost } from '../../types/community';
import { formatRelativeTime } from '../../utils/formatTime';
import { useCustomTheme } from '../../context/ThemeContext';

interface PostItemProps {
  post: CommunityPost;
  onLike: (postId: string) => void;
}

const PostItem: FC<PostItemProps> = ({ post, onLike }) => {
  const { theme: { colors, cardStyle } } = useCustomTheme();
  const avatarUri = post.user?.avatar || null;

  return (
    <View style={[styles.container, { marginBottom: cardStyle.marginBottom, marginHorizontal: 16 }]}>
      <Animated.View
        entering={FadeIn.duration(500)}
        style={[
          styles.animatedContainer,
          {
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            borderRadius: cardStyle.borderRadius,
            borderWidth: cardStyle.borderWidth,
            shadowColor: cardStyle.shadowColor,
            shadowOffset: cardStyle.shadowOffset,
            shadowOpacity: cardStyle.shadowOpacity,
            shadowRadius: cardStyle.shadowRadius,
            elevation: cardStyle.elevation,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Avatar.Image
              source={avatarUri ? { uri: avatarUri } : require('../../assets/images/icons8-user-96.png')}
              size={48}
              style={styles.avatar}
            />
            <View style={styles.userText}>
              <Text style={[styles.userName, { color: colors.text }]}>{post.user?.name || 'Unknown User'}</Text>
              <Text style={[styles.userRole, { color: colors.textSecondary }]}>{post.user?.level || 'Member'}</Text>
            </View>
          </View>
          <Text style={[styles.postTime, { color: colors.textSecondary }]}>{formatRelativeTime(post.timestamp.toString())}</Text>
        </View>

        <Text style={[styles.content, { color: colors.text }]}>{post.content}</Text>

        <View style={styles.footer}>
          <Chip
            style={[styles.topicChip, { backgroundColor: colors.chipBackground }]}
            textStyle={[styles.topicChipText, { color: colors.primary }]}
            mode="flat"
          >
            {post.topic}
          </Chip>
          <View style={styles.actions}>
            <Animated.View entering={ZoomIn.duration(300)}>
              <TouchableOpacity style={styles.actionButton} onPress={() => onLike(post.id)}>
                <Icon
                  name={post.isLiked ? 'heart' : 'heart'}
                  size={20}
                  color={post.isLiked ? colors.error : colors.textSecondary}
                />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.likes}</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View entering={ZoomIn.duration(300).delay(100)}>
              <TouchableOpacity style={styles.actionButton}>
                <Icon name="message-circle" size={20} color={colors.textSecondary} />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>{post.comments}</Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View entering={ZoomIn.duration(300).delay(200)}>
              <TouchableOpacity style={styles.actionButton}>
                <Icon name="share-2" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  animatedContainer: {
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
    marginRight: 12,
    backgroundColor: '#E6F0FA',
  },
  userText: {
    flexShrink: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userRole: {
    fontSize: 13,
    fontWeight: '500',
  },
  postTime: {
    fontSize: 13,
    fontWeight: '500',
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
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  actionText: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '600',
  },
});

export default PostItem;