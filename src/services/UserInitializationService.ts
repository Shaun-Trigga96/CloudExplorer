// //import { firestoreService } from './/../../scripts/schema/FirestoreService';

// class UserInitializationService {
//   async initializeUserLearningPath(userId: string): Promise<void> {
//     try {
//       const service = await firestoreService;
      
//       // Fetch all available modules
//       const modulesSnapshot = await service.getCollection('modules').get();

//       // Prepare user's initial learning progress
//       const learningProgress = {
//         completedModules: {},
//         completedQuizzes: {},
//         completedExams: {},
//         score: 0,
//       };

//       // Prepare available modules metadata
//       const availableModules = modulesSnapshot.docs.map(doc => ({
//         moduleId: doc.id,
//         ...doc.data()
//       }));

//       // Create user document with initial learning progress
//       const userRef = service.getCollection('users').doc(userId);
//       await userRef.set({
//         learningProgress,
//         availableModules,
//         initializedAt: service.createTimestamp(),
//       }, { merge: true });

//       console.log(`Initialized learning path for user ${userId}`);
//     } catch (error) {
//       console.error('Error initializing user learning path:', error);
//       throw error;
//     }
//   }

//   async assignInitialQuizzes(userId: string): Promise<void> {
//     try {
//       const service = await firestoreService;
      
//       // Fetch all available quizzes
//       const quizzesSnapshot = await service.getCollection('quizzes').get();

//       // Batch create quiz assignments
//       const batch = service.getDb().batch();
//       const userRef = service.getCollection('users').doc(userId);
//       const quizAssignmentsRef = userRef.collection('quizAssignments');

//       quizzesSnapshot.docs.forEach(doc => {
//         const quizId = doc.id;
//         const quizData = doc.data();
        
//         const assignmentRef = quizAssignmentsRef.doc(quizId);
//         batch.set(assignmentRef, {
//           quizId,
//           moduleId: quizData.moduleId,
//           status: 'not_started',
//           assignedAt: service.createTimestamp()
//         });
//       });

//       await batch.commit();
//       console.log(`Assigned initial quizzes for user ${userId}`);
//     } catch (error) {
//       console.error('Error assigning initial quizzes:', error);
//       throw error;
//     }
//   }

//   async createInitialNotifications(userId: string): Promise<void> {
//     try {
//       const service = await firestoreService;
      
//       // Batch create notifications
//       const batch = service.getDb().batch();
//       const notificationsRef = service.getCollection('notifications');

//       const notifications = [
//         {
//           userId,
//           title: 'Welcome to Cloud Explorer!',
//           message: 'Start your cloud learning journey today.',
//           type: 'welcome',
//           read: false,
//           createdAt: service.createTimestamp()
//         },
//         {
//           userId,
//           title: 'Get Started',
//           message: 'Check out our first module: Cloud Fundamentals',
//           type: 'learning_recommendation',
//           read: false,
//           createdAt: service.createTimestamp()
//         }
//       ];

//       notifications.forEach(notification => {
//         const docRef = notificationsRef.doc();
//         batch.set(docRef, notification);
//       });

//       await batch.commit();
//       console.log(`Created initial notifications for user ${userId}`);
//     } catch (error) {
//       console.error('Error creating initial notifications:', error);
//       throw error;
//     }
//   }
// }

// export const userInitializationService = new UserInitializationService();