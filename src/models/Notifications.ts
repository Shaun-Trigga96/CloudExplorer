import { Timestamp } from 'firebase/firestore';
import { NotificationType } from './NotificationType';

export interface Notification {
    notificationId: string; // Unique ID for the notification
    userId: string; // ID of the user receiving the notification
    title: string;
    message: string;
    type: NotificationType; // e.g., "quiz_result", "exam_result", "learning_milestone"
    read: boolean; // Whether the notification has been read
    createdAt: Timestamp;
  }
