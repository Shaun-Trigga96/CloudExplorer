import axios from 'axios';
import { Linking } from 'react-native';
import { REACT_APP_BASE_URL,
CREDLY_CLIENT_ID, 
CREDLY_CLIENT_SECRET, 
CREDLY_REDIRECT_URI}
 from '@env';

// Define your types
interface CredlyBadge {
  id: string;
  badge: {
    name: string;
    description: string;
  };
  issuer: {
    name: string;
  };
  issued_at: string;
  expires_at: string | null;
  image_url: string;
  badge_url: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

class CredlyService {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  
  constructor() {
    // Load from environment variables
    this.baseUrl = REACT_APP_BASE_URL;
    this.clientId = CREDLY_CLIENT_ID;
    this.clientSecret = CREDLY_CLIENT_SECRET;
    this.redirectUri = CREDLY_REDIRECT_URI;
  }
  
  // Get OAuth authorization URL
  getAuthUrl(): string {
    const scope = encodeURIComponent('read:badges');
    return `https://www.credly.com/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${scope}`;
  }
  
  // Start OAuth flow
  startOAuthFlow(): Promise<void> {
    return Linking.openURL(this.getAuthUrl());
  }
  
  // Exchange code for token
  async getAccessToken(code: string): Promise<TokenResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/credly/get-token`, {
        code,
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        redirectUri: this.redirectUri
      });
      
      return response.data.data;
    } catch (error) {
      console.error('Error getting Credly access token:', error);
      throw new Error('Failed to get access token');
    }
  }
  
  // Get user badges using access token
  async getUserBadges(token: string): Promise<CredlyBadge[]> {
    try {
      const response = await axios.post(`${this.baseUrl}/credly/get-badges`, {
        token
      });
      
      return response.data.data.data;
    } catch (error) {
      console.error('Error fetching badges:', error);
      throw new Error('Failed to fetch badges from Credly');
    }
  }
  
  // Import badges to user profile
  async importBadges(userId: string, badges: CredlyBadge[]): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/credly/import-badges`, {
        userId,
        badges
      });
    } catch (error) {
      console.error('Error importing badges:', error);
      throw new Error('Failed to import badges');
    }
  }
}

export const credlyService = new CredlyService();
export default credlyService;