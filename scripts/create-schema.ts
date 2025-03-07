// scripts/create-schema.ts
import * as dotenv from 'dotenv';
import { userService } from './schema/UserService';
import { moduleService } from './schema/ModuleService';
import { examService } from './schema/ExamService';
import { notificationService } from './schema/NotificationService';
import { aiContentService } from './schema/AIContentService';
import { Module, Section, Exam, User } from '../src/types/types';
import { Timestamp } from 'firebase-admin/firestore';
import { firestoreService } from './schema/FirestoreService';

dotenv.config();

const computeEngineNotes: string = `
# Compute Engine Overview

## Introduction to Compute Engine
Compute Engine is Google Cloud Platform's Infrastructure-as-a-Service (IaaS) offering that allows you to create and manage virtual machines (VMs) in the cloud. It provides scalable, high-performance computing resources tailored to your needs.

- **Key Features**:
  - Customizable VMs with configurable CPU, memory, and storage.
  - Global load balancing for high availability.
  - Autoscaling to handle varying workloads.
  - Preemptible VMs for cost savings on fault-tolerant tasks.

- **Use Cases**:
  - Running web applications.
  - Hosting databases.
  - Batch processing and data analysis.

## Virtual Machine Types
Compute Engine offers a variety of VM types to suit different workloads:

- **Predefined Machine Types**:
  - General-purpose (e.g., E2, N2, N1): Balanced CPU and memory for most workloads.
  - Compute-optimized (e.g., C2): High-performance CPUs for compute-intensive tasks.
  - Memory-optimized (e.g., M2): Large memory for in-memory databases.

- **Custom Machine Types**:
  - Define exact vCPUs and memory (e.g., 2 vCPUs, 8 GB RAM) for precise resource allocation.

- **Preemptible VMs**:
  - Short-lived, low-cost instances that can be terminated with 30 seconds notice.

## Key Concepts
- **Zones and Regions**: VMs run in specific zones (e.g., us-central1-a) within regions (e.g., us-central1) for low latency and redundancy.
- **Disks**: Persistent disks (HDD, SSD) or local SSDs for storage.
- **Images**: Prebuilt or custom OS images (e.g., Ubuntu, Windows) to launch VMs.

## Getting Started
1. Create a VM instance via the GCP Console, CLI, or API.
2. Configure machine type, disk, and network settings.
3. Connect via SSH (Linux) or RDP (Windows).
4. Deploy your application.

For more details, visit: https://cloud.google.com/compute/docs
`;

interface ProgressData {
  id: string;
  data: {
    userId: string;
    quizId: string | null;
    examId: string | null;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    completedAt: Date;
  };
}

interface Notification {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
}

interface AIContent {
  contentId: string;
  type: string;
  source: string;
  content: string;
  metadata: { moduleId: string; quizId: string };
  createdAt: Date;
}

async function cleanupModules(): Promise<void> {
  const service = await firestoreService;
  const snapshot = await service.getCollection('modules').get();
  const batch = service.getBatch();
  snapshot.forEach((doc: { ref: any; }) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log('Cleaned up existing modules');
}

async function createSchema(): Promise<void> {
  try {
    await cleanupModules();
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
      await userService.createProgress(prog.id, prog.data); // Pass id and data separately
    }

    // Modules
    const modules: { moduleId: string; title: string; description: string; duration: number; quizzes: string[]; sections: Section[] }[] = [
      {
        moduleId: 'compute-engine',
        title: 'Compute Engine',
        description: 'Learn about virtual machines in Google Cloud',
        duration: 60,
        quizzes: ['compute-engine-quiz1'],
        sections: [
          { title: 'Introduction to Compute Engine', content: computeEngineNotes, order: 1 },
          { title: 'Virtual Machine Types', content: computeEngineNotes, order: 2 },
        ],
      },
      {
        moduleId: 'cloud-storage',
        title: 'Cloud Storage',
        description: 'Master object storage in the cloud',
        duration: 60,
        quizzes: ['cloud-storage-quiz1'],
        sections: [
          { title: 'Overview of Cloud Storage', content: 'Content for overview...', order: 1 },
          { title: 'Object Storage Concepts', content: 'Content for concepts...', order: 2 },
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
        sections: mod.sections, // Ensure sections are part of the module object
      };
      await moduleService.createModule(module, mod.sections);
    }

    // Exams
    const exams: Exam[] = [
      {
        examId: 'cloud-digital-leader-exam',
        title: 'Google Cloud Digital Leader Exam',
        description: 'Test your knowledge of Google Cloud fundamentals',
        content: 'Exam questions and answers...',
        duration: 120,
        prerequisites: ['compute-engine', 'cloud-storage'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    for (const exam of exams) {
      await examService.createExam(exam);
    }

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
    ];
    for (const notif of notifications) {
      await notificationService.createNotification(notif);
    }

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
    ];
    for (const aiContent of aiContents) {
      await aiContentService.createAIContent(aiContent);
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
