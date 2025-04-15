export interface User {
    id: string;
    name: string;
    avatar: string;
    level: string;
    certifications: string[];
  }
  
  export interface CommunityPost {
    id: string;
    userId: string;
    user: User;
    content: string;
    likes: number;
    comments: number;
    timestamp: string;
    isLiked?: boolean;
    topic: string;
  }
  
  export interface Topic {
    id: string;
    name: string;
    count: number;
  }
  
  export interface CommunityMember {
    id: string;
    name: string;
    avatar: string;
    level: string;
    lastActive: string;
    isOnline: boolean;
  }