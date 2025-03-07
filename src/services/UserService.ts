import auth from '@react-native-firebase/auth';
import { UserSettings } from '../types/types';
import { FirestoreClient, firestoreClient } from './FirestoreClient';

export class UserService {
  private firestore: FirestoreClient;

  constructor(firestore: FirestoreClient = firestoreClient) {
    this.firestore = firestore;
  }

  getCurrentUser() {
    return auth().currentUser;
  }

  async updateUserSettings(userId: string, settings: UserSettings): Promise<boolean> {
    try {
      await this.firestore.getCollection('users').doc(userId).update({ settings });
      return true;
    } catch (error) {
      console.error('Error updating user settings:', error);
      throw error;
    }
  }

  async getUserProgress(userId: string): Promise<any> {
    try {
      const userDoc = await this.firestore.getCollection('users').doc(userId).get();
      return userDoc.exists ? userDoc.data()?.learningProgress : null;
    } catch (error) {
      console.error('Error fetching user progress:', error);
      throw error;
    }
  }
}

export const userService = new UserService();