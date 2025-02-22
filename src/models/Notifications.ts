export interface Notifications {
    notificationId: string, // Unique ID for the notification
    userId: string, // ID of the user receiving the notification
    title: string,
    message: string,
    type: string, // e.g., "quiz_result", "exam_result", "learning_milestone"
    read: boolean, // Whether the notification has been read
    createdAt: Date,
}
