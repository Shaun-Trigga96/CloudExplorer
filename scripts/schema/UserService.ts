import { firestoreService } from './FirestoreService';
import { User } from '../../src/types/types';

class UserService {
  async createOrUpdateUser(user: User): Promise<void> {
    const service = await firestoreService;
    const { uid } = user;
    console.log(`Overwriting user: ${uid}`);
    await service.getCollection('users').doc(uid).set(user, { merge: false });
  }

  async createProgress(id: string, progressData: any): Promise<void> {
    const service = await firestoreService;
    console.log(`Overwriting progress entry: ${id}`);
    await service.getCollection('users').doc(progressData.userId).collection('progress').doc(id).set(progressData, { merge: false });
  }
}

export const userService = new UserService();