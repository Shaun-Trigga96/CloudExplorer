import React, { FC } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { CommunityMember } from '../../types/community';
import  { useCustomTheme }  from '../../context/ThemeContext';

interface MemberItemProps {
  member: CommunityMember;
}

const MemberItem: FC<MemberItemProps> = ({ member }) => {
  const { isDarkMode } = useCustomTheme();
  const { colors, cardStyle } = useCustomTheme().theme;
  const avatarUri = member.avatar || null;

  return (
    <TouchableOpacity style={[styles.container, cardStyle, { backgroundColor: colors.discussionItemBackground, borderColor: colors.border }]}>
      <View style={styles.avatarContainer}>
        <Image
          source={avatarUri ? { uri: avatarUri } : require('../../assets/images/icons8-user-96.png')}
          style={styles.avatar}
        />
        {member.isOnline && <View style={[styles.onlineIndicator, { borderColor: colors.onlineIndicatorBorder }]} />}
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{member.name}</Text>
        <Text style={[styles.level, { color: colors.textSecondary }]}>{member.level}</Text>
      </View>
      <TouchableOpacity style={[styles.connectButton, { backgroundColor: colors.primary }]}>
        <Text style={styles.connectButtonText}>Connect</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34C759',
    borderWidth: 2,
  },
  info: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  level: {
    fontSize: 13,
  },
  connectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default MemberItem;