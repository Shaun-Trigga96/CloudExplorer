export interface CommunityUser {
  id: string;
  name: string;
  avatar: string | null;
  level: string;
}

export interface CommunityPost {
  id: string;
  user: CommunityUser;
  content: string;
  topic: string;
  likes: number;
  comments: number;
  timestamp: string;
  isLiked: boolean;
}

export interface Topic {
  id: string;
  name: string;
  count: number;
}

export interface CommunityMember {
  id: string;
  name: string;
  avatar: string | null;
  level: string;
  isOnline: boolean;
}

export interface CommunityEvent {
  id: number;
  title: string;
  date: string;
  time?: string;
  description?: string;
  attending?: number;
  interested?: number;
  speakers?: number;
  daysLeft?: number;
  isUpcoming: boolean;
  link: string;
  platform: string;
  location: string;
}
