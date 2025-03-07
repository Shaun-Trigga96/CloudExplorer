// scripts/schema/NotificationService.ts
import { firestoreService } from './FirestoreService';

class NotificationService {
  async createNotification(notification: any): Promise<void> {
    const service = await firestoreService;
    const { notificationId } = notification;
    await service.getCollection('notifications').doc(notificationId).set(notification);
  }
}

export const notificationService = new NotificationService();