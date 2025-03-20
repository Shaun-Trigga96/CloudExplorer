// scripts/create-schema.ts
import * as dotenv from 'dotenv';
import * as path from 'path';
import { userService } from './schema/UserService';
import { moduleService } from './schema/ModuleService';
import { examService } from './schema/ExamService';
import { notificationService } from './schema/NotificationService';
import { aiContentService } from './schema/AIContentService';
import { Module, Section, Exam, User } from '../src/types/types';
import { Timestamp } from 'firebase-admin/firestore';
import { firestoreService } from './schema/FirestoreService';
import { AIContent, Notification, ProgressData } from './types';
import { quizService } from './schema/QuizService';

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Load module content from separate files
import { readFileSync } from 'fs';
const computeEngineNotes: string = readFileSync(
  path.resolve(__dirname, 'content', 'computeEngine.md'),
  'utf8'
);
const cloudStorageNotes: string = readFileSync(
  path.resolve(__dirname, 'content', 'cloudStorage.md'),
  'utf8'
);
const cloudFunctionsNotes: string = readFileSync(
  path.resolve(__dirname, 'content', 'cloudFunctions.md'),
  'utf8'
);
const kubernetesNotes: string = readFileSync(
  path.resolve(__dirname, 'content', 'kubernetes.md'),
  'utf8'
);

// New Imports for distinct section content
const virtualMachineNotes: string = readFileSync(
  path.resolve(__dirname, 'content', 'virtualMachineNotes.md'),
  'utf8'
);
const storageConceptsNotes: string = readFileSync(
  path.resolve(__dirname, 'content', 'storageConceptsNotes.md'),
  'utf8'
);
const buildingServerlessFunctionsNotes: string = readFileSync(
  path.resolve(__dirname, 'content', 'buildingServerlessFunctionsNotes.md'),
  'utf8'
);
const containerOrchestrationNotes: string = readFileSync(
  path.resolve(__dirname, 'content', 'containerOrchestrationNotes.md'),
  'utf8'
);

/**
 * Cleans up all collections in Firestore before loading new schema
 */
async function cleanupFirestore(): Promise<void> {
  try {
    const service = await firestoreService;
    const collections = [
      'modules',
      'users',
      'quizzes',
      'exams',
      'notifications',
      'aiContent',
      'progressData',
    ];

    console.log('Starting Firestore cleanup...');

    for (const collection of collections) {
      console.log(`Cleaning up ${collection}...`);
      const snapshot = await service.getCollection(collection).get();

      if (snapshot.empty) {
        console.log(`Collection ${collection} is already empty.`);
        continue;
      }

      // Delete in batches to prevent overloading
      const batchSize = 500;
      const batches = [];
      let batch = service.getBatch();
      let operationCount = 0;

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
        operationCount++;

        if (operationCount >= batchSize) {
          batches.push(batch.commit());
          batch = service.getBatch();
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(batch.commit());
      }

      await Promise.all(batches);
      console.log(`Deleted ${snapshot.size} documents from ${collection}`);
    }

    console.log('Firestore cleanup completed successfully.');
  } catch (error) {
    console.error('Error during Firestore cleanup:', error);
    throw error;
  }
}

/**
 * Creates a full sample schema with test data
 */
async function createSchema(): Promise<void> {
  try {
    await cleanupFirestore();

    console.log('Creating sample users...');
    // User
    const user: User = {
      uid: 'Mbcy1W9YEynQujbWQFqbW5d0Ij2',
      email: 'thabisomatsaba96@gmail.com',
      displayName: 'Thabiso Matsaba',
      photoURL: 'https://lh3.googleusercontent.com/a/ACg8ocJhbM695m1bCoCEFYBB...',
      createdAt: new Date('2025-02-23T15:03:09Z'),
      lastLogin: new Date('2025-03-04T10:00:00Z'),
      learningProgress: {
        completedModules: ['compute-engine'],
        completedQuizzes: ['compute-engine-quiz1'],
        completedExams: ['cloud-digital-leader-exam'],
        score: 90,
      },
      settings: { notificationsEnabled: true, darkMode: false },
    };
    await userService.createOrUpdateUser(user);
    console.log('User created:', user.uid);

    console.log('Creating progress data...');
    // Progress
    const progressData: ProgressData[] = [
      {
        id: 'prog1',
        data: {
          userId: user.uid,
          quizId: 'compute-engine-quiz1',
          examId: null,
          score: 90,
          totalQuestions: 2,
          correctAnswers: 2,
          completedAt: new Date('2025-02-24T10:00:00Z'),
        },
      },
      {
        id: 'prog2',
        data: {
          userId: user.uid,
          quizId: 'cloud-storage-quiz1',
          examId: null,
          score: 85,
          totalQuestions: 1,
          correctAnswers: 1,
          completedAt: new Date('2025-02-25T14:00:00Z'),
        },
      },
    ];

    for (const prog of progressData) {
      await userService.createProgress(prog.id, prog.data);
    }
    console.log('Progress data created:', progressData.length, 'records');

    console.log('Creating modules...');
    // Modules
    const modules: {
      moduleId: string;
      title: string;
      description: string;
      duration: number;
      quizzes: string[];
      sections: Section[]
    }[] = [
      {
        moduleId: 'compute-engine',
        title: 'Compute Engine',
        description: 'Learn about virtual machines in Google Cloud',
        duration: 60,
        quizzes: ['compute-engine-quiz1'],
        sections: [
          { title: 'Introduction to Compute Engine', content: computeEngineNotes, order: 1 },
          { title: 'Virtual Machine Types', content: virtualMachineNotes, order: 2 },
        ],
      },
      {
        moduleId: 'cloud-storage',
        title: 'Cloud Storage',
        description: 'Master object storage in the cloud',
        duration: 60,
        quizzes: ['cloud-storage-quiz1'],
        sections: [
          { title: 'Overview of Cloud Storage', content: cloudStorageNotes, order: 1 },
          { title: 'Object Storage Concepts', content: storageConceptsNotes, order: 2 },
        ],
      },
      {
        moduleId: 'cloud-functions',
        title: 'Cloud Functions',
        description: 'Build serverless applications',
        duration: 60,
        quizzes: ['cloud-function-quiz1'],
        sections: [
          { order: 1, title: 'Introduction to Serverless Computing', content: cloudFunctionsNotes },
          { order: 2, title: 'Building Serverless Applications', content: buildingServerlessFunctionsNotes },
        ],
      },
      {
        moduleId: 'kubernetes-engine',
        title: 'Kubernetes Engine',
        description: 'Container orchestration with GKE',
        duration: 60,
        quizzes: ['cloud-kubernetes-quiz1'],
        sections: [
          { order: 1, title: 'Introduction to Kubernetes', content: kubernetesNotes },
          { order: 2, title: 'Container Orchestration with GKE', content: containerOrchestrationNotes },
        ],
      },
    ];

    for (const mod of modules) {
      const module: Module = {
        moduleId: mod.moduleId,
        title: mod.title,
        description: mod.description,
        duration: mod.duration,
        quizzes: mod.quizzes,
        prerequisites: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        content: '',
        sections: mod.sections,
      };
      await moduleService.createModule(module, mod.sections); // this was correct
      console.log('Module created:', module.moduleId);
      // Get a reference to the Firestore service
      const service = await firestoreService;
      //Save the module into the firestore `modules` collection
      await service.getCollection('modules').doc(mod.moduleId).set(module);
      console.log('Module added to firestore:', module.moduleId); // check your logs
    }

    console.log('Creating quizzes...');
    // Quizzes
    const quizzes = [
      {
        quizId: 'compute-engine-quiz1',
        moduleId: 'compute-engine',
        title: 'Compute Engine Basics',
        questions: [
          {
            question: 'What is Compute Engine?',
            options: ['Storage Service', 'Virtual Machines', 'Big Data Analysis'],
            correctAnswer: 'Virtual Machines',
          },
          {
            question: 'Which of the following is a Compute Engine machine type?',
            options: ['BigQuery', 'E2', 'Cloud SQL'],
            correctAnswer: 'E2',
          },
        ],
        createdAt: new Date('2025-02-24T15:00:00Z'),
        passingScore: 60,
        updatedAt: new Date('2025-02-24T14:53:22Z'),
      },
      {
        quizId: 'cloud-storage-quiz1',
        moduleId: 'cloud-storage',
        title: 'Cloud Storage Fundamentals',
        questions: [
          {
            question: 'What type of storage does Cloud Storage provide?',
            options: ['Block Storage', 'File Storage', 'Object Storage'],
            correctAnswer: 'Object Storage',
          },
        ],
        createdAt: new Date('2025-02-25T10:00:00Z'),
        passingScore: 70,
        updatedAt: new Date('2025-02-25T10:00:00Z'),
      },
      {
        quizId: 'cloud-function-quiz1',
        moduleId: 'cloud-functions',
        title: 'Cloud Functions Basics',
        questions: [
          {
            question: 'Cloud Functions is what type of computing model?',
            options: ['Serverless', 'Container-based', 'Virtual machine-based'],
            correctAnswer: 'Serverless',
          },
        ],
        createdAt: new Date('2025-02-26T10:00:00Z'),
        passingScore: 70,
        updatedAt: new Date('2025-02-26T10:00:00Z'),
      },
      {
        quizId: 'cloud-kubernetes-quiz1',
        moduleId: 'kubernetes-engine',
        title: 'Kubernetes Essentials',
        questions: [
          {
            question: 'What is the smallest deployable unit in Kubernetes?',
            options: ['Container', 'Pod', 'Node'],
            correctAnswer: 'Pod',
          },
        ],
        createdAt: new Date('2025-02-27T10:00:00Z'),
        passingScore: 70,
        updatedAt: new Date('2025-02-27T10:00:00Z'),
      },
    ];

    for (const quiz of quizzes) {
      await quizService.createQuiz(quiz);
      console.log('Quiz created:', quiz.quizId);
    }

    console.log('Creating exams...');
    // Exams
    const exams: Exam[] = [
      {
        examId: 'cloud-digital-leader-exam',
        title: 'Google Cloud Digital Leader Exam',
        description: 'Test your knowledge of Google Cloud fundamentals',
        content: 'Exam questions and answers...',
        duration: 120,
        prerequisites: ['compute-engine', 'cloud-storage'],
        createdAt: new Date('2025-02-24T14:53:22Z'),
        updatedAt: new Date('2025-02-24T15:00:00Z'),
      },
      {
        examId: 'cloud-architect-exam',
        title: 'Google Cloud Architect Exam',
        description: 'Advanced exam for cloud architecture specialists',
        content: 'Comprehensive architecture questions...',
        duration: 180,
        prerequisites: ['compute-engine', 'cloud-storage', 'kubernetes-engine', 'cloud-functions'],
        createdAt: new Date('2025-02-28T12:00:00Z'),
        updatedAt: new Date('2025-02-28T12:00:00Z'),
      },
    ];

    for (const exam of exams) {
      await examService.createExam(exam);
      console.log('Exam created:', exam.examId);
    }

    console.log('Creating notifications...');
    // Notifications
    const notifications: Notification[] = [
      {
        notificationId: 'notification1',
        userId: user.uid,
        title: 'Quiz Completed',
        message: 'You passed Compute Engine Quiz!',
        type: 'quiz_result',
        read: false,
        createdAt: new Date('2025-02-24T14:53:22Z'),
      },
      {
        notificationId: 'notification2',
        userId: user.uid,
        title: 'Module Completed',
        message: 'You completed the Compute Engine module!',
        type: 'learning_milestone',
        read: false,
        createdAt: new Date('2025-02-24T15:00:00Z'),
      },
      {
        notificationId: 'notification3',
        userId: user.uid,
        title: 'New Content Available',
        message: 'Check out the new Kubernetes Engine module!',
        type: 'new_content',
        read: false,
        createdAt: new Date('2025-02-28T09:00:00Z'),
      },
    ];

    for (const notif of notifications) {
      await notificationService.createNotification(notif);
      console.log('Notification created:', notif.notificationId);
    }

    console.log('Creating AI content...');
    // AI Content
    const aiContents: AIContent[] = [
      {
        contentId: 'content1',
        type: 'quiz_question',
        source: 'GPT-3',
        content: 'What is Compute Engine?',
        metadata: { moduleId: 'compute-engine', quizId: 'compute-engine-quiz1' },
        createdAt: new Date('2025-02-24T14:57:41Z'),
      },
      {
        contentId: 'content2',
        type: 'explanation',
        source: 'GPT-3',
        content: 'Compute Engine provides virtual machines in Google Cloud.',
        metadata: { moduleId: 'compute-engine', quizId: 'compute-engine-quiz1' },
        createdAt: new Date('2025-02-24T14:58:00Z'),
      },
      {
        contentId: 'content3',
        type: 'study_note',
        source: 'GPT-4',
        content: 'Remember that Compute Engine VMs can be preemptible for cost savings.',
        metadata: { moduleId: 'compute-engine', quizId: 'compute-engine-quiz1' },
        createdAt: new Date('2025-02-25T10:30:00Z'),
      },
    ];

    for (const aiContent of aiContents) {
      await aiContentService.createAIContent(aiContent);
      console.log('AI Content created:', aiContent.contentId);
    }

    console.log('Firestore schema updated successfully with Google Docs integration!');
  } catch (error) {
    console.error('Schema creation failed:', error);
    throw error;
  }
}

createSchema()
  .then(() => console.log('Script completed successfully'))
  .catch((err: Error) => {
    console.error('Final error:', err);
    process.exit(1);
  });
