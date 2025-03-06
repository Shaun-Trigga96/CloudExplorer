import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { createGoogleDoc } from './src/services/GoogleDocsService';

dotenv.config();

async function loadServiceAccount() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not defined in .env');
  }

  try {
    const absolutePath = resolve(__dirname, '..', serviceAccountPath);
    console.log('Loading service account from:', absolutePath);
    const serviceAccountJson = await readFile(absolutePath, 'utf8');
    return JSON.parse(serviceAccountJson);
  } catch (error) {
    console.error('Error reading service account file:', error);
    throw error;
  }
}

async function initializeFirebase(): Promise<admin.firestore.Firestore> {
  const serviceAccount = await loadServiceAccount();
  console.log('Service account loaded:', !!serviceAccount);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  const db = admin.firestore();
  console.log('Firestore initialized:', !!db);
  return db;
}

const createTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

async function createSchema(db: admin.firestore.Firestore) {
  try {
    const userId = 'Mbcy1W9YEynQujbWQFqbW5d0Ij2';

    // 1. Create/Update User (Force Overwrite)
    console.log(`Overwriting user: ${userId}`);
    await db.collection('users').doc(userId).set({
      uid: userId,
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
    }, { merge: false }); // Overwrite entire document

    // 2. User Progress (Force Overwrite)
    const progressData = [
      {
        id: 'prog1',
        data: {
          userId,
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
          userId,
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
      console.log(`Overwriting progress entry: ${prog.id}`);
      await db.collection('users').doc(userId).collection('progress').doc(prog.id).set(prog.data, { merge: false });
    }

    const computeEngineNotes = `
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

    // 3. Modules with Sections (Force Overwrite)
    const modules = [
      {
        module: {
          moduleId: 'compute-engine',
          title: 'Compute Engine',
          description: 'Learn about virtual machines in Google Cloud',
          duration: 60,
          quizzes: ['compute-engine-quiz1'],
          createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-02-23T15:00:00Z')),
          updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-02-23T15:00:00Z')),
        },
        sections: [
          {
            title: 'Introduction to Compute Engine',
            content: 'Content from Google Docs API: Introduction to virtual machines...',
            order: 1,
          },
          {
            title: 'Virtual Machine Types',
            content: 'Content from Google Docs API: Predefined and custom VM types...',
            order: 2,
          },
        ],
      },
      {
        module: {
          moduleId: 'cloud-storage',
          title: 'Cloud Storage',
          description: 'Master object storage in the cloud',
          duration: 60,
          quizzes: ['cloud-storage-quiz1'],
          createdAt: createTimestamp(),
          updatedAt: createTimestamp(),
        },
        sections: [
          {
            title: 'Overview of Cloud Storage',
            content: 'Content from Google Docs API: Introduction to object storage...',
            order: 1,
          },
          {
            title: 'Object Storage Concepts',
            content: 'Content from Google Docs API: Buckets and objects...',
            order: 2,
          },
        ],
      },
      {
        module: {
          moduleId: 'cloud-functions',
          title: 'Cloud Functions',
          description: 'Build serverless applications',
          duration: 60,
          quizzes: ['cloud-functions-quiz1'],
          createdAt: createTimestamp(),
          updatedAt: createTimestamp(),
        },
        sections: [
          {
            title: 'Introduction to Serverless Computing',
            content: 'Content from Google Docs API: Serverless basics...',
            order: 1,
          },
          {
            title: 'Building Serverless Applications',
            content: 'Content from Google Docs API: Event-driven functions...',
            order: 2,
          },
        ],
      },
      {
        module: {
          moduleId: 'kubernetes-engine',
          title: 'Google Kubernetes Engine',
          description: 'Container orchestration with GKE',
          duration: 60,
          quizzes: ['kubernetes-engine-quiz1'],
          createdAt: createTimestamp(),
          updatedAt: createTimestamp(),
        },
        sections: [
          {
            title: 'Introduction to Kubernetes',
            content: 'Content from Google Docs API: Kubernetes basics...',
            order: 1,
          },
          {
            title: 'Container Orchestration with GKE',
            content: 'Content from Google Docs API: GKE features...',
            order: 2,
          },
        ],
      },
    ];

    for (const { module, sections } of modules) {
      console.log(`Overwriting module: ${module.moduleId}`);
      await db.collection('modules').doc(module.moduleId).set(module, { merge: false }); // Overwrite module
      const googleDocUrl = await createGoogleDoc(`${module.title} Notes`, computeEngineNotes);
      for (const section of sections) {
        console.log(`Overwriting section: ${section.title} for ${module.moduleId}`);
        await db
          .collection('modules')
          .doc(module.moduleId)
          .collection('sections')
          .doc(`section${section.order}`)
          .set({ ...section, content: googleDocUrl }, { merge: false });
      }
    }

    // 4. Quizzes (Force Overwrite)
    const quizzes = [
      {
        quizId: 'compute-engine-quiz1',
        moduleId: 'compute-engine',
        title: 'Compute Engine Quiz',
        passingScore: 80,
        questions: [
          {
            questionId: 'q1',
            questionText: 'What is Compute Engine?',
            options: ['VM service', 'Storage service', 'Database service'],
            correctAnswer: 'VM service',
            explanation: 'Compute Engine provides virtual machines in Google Cloud.',
            order: 1,
          },
          {
            questionId: 'q2',
            questionText: 'What are VM types in Compute Engine?',
            options: ['Predefined, Custom', 'Small, Large', 'Basic, Advanced'],
            correctAnswer: 'Predefined, Custom',
            explanation: 'Compute Engine offers predefined and custom VM types.',
            order: 2,
          },
        ],
        createdAt: createTimestamp(),
        updatedAt: createTimestamp(),
      },
      {
        quizId: 'cloud-storage-quiz1',
        moduleId: 'cloud-storage',
        title: 'Cloud Storage Quiz',
        passingScore: 80,
        questions: [
          {
            questionId: 'q1',
            questionText: 'What is Cloud Storage used for?',
            options: ['Object storage', 'VM management', 'Database hosting'],
            correctAnswer: 'Object storage',
            explanation: 'Cloud Storage is used for object storage in Google Cloud.',
            order: 1,
          },
        ],
        createdAt: createTimestamp(),
        updatedAt: createTimestamp(),
      },
      {
        quizId: 'cloud-functions-quiz1',
        moduleId: 'cloud-functions',
        title: 'Cloud Functions Quiz',
        passingScore: 80,
        questions: [
          {
            questionId: 'q1',
            questionText: 'What is a Cloud Function?',
            options: ['Serverless function', 'VM instance', 'Storage bucket'],
            correctAnswer: 'Serverless function',
            explanation: 'Cloud Functions are serverless functions in Google Cloud.',
            order: 1,
          },
        ],
        createdAt: createTimestamp(),
        updatedAt: createTimestamp(),
      },
      {
        quizId: 'kubernetes-engine-quiz1',
        moduleId: 'kubernetes-engine',
        title: 'Google Kubernetes Engine Quiz',
        passingScore: 80,
        questions: [
          {
            questionId: 'q1',
            questionText: 'What is GKE used for?',
            options: ['Container orchestration', 'Object storage', 'Serverless computing'],
            correctAnswer: 'Container orchestration',
            explanation: 'GKE manages container orchestration in Google Cloud.',
            order: 1,
          },
        ],
        createdAt: createTimestamp(),
        updatedAt: createTimestamp(),
      },
    ];

    for (const quiz of quizzes) {
      console.log(`Overwriting quiz: ${quiz.quizId}`);
      await db.collection('quizzes').doc(quiz.quizId).set({
        quizId: quiz.quizId,
        moduleId: quiz.moduleId,
        title: quiz.title,
        passingScore: quiz.passingScore,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt,
      }, { merge: false });
      for (const question of quiz.questions) {
        console.log(`Overwriting question: ${question.questionId} for ${quiz.quizId}`);
        await db
          .collection('quizzes')
          .doc(quiz.quizId)
          .collection('questions')
          .doc(question.questionId)
          .set(question, { merge: false });
      }
    }

    // 5. Exams (Force Overwrite)
    console.log('Overwriting exam: cloud-digital-leader-exam');
    await db.collection('exams').doc('cloud-digital-leader-exam').set({
      examId: 'cloud-digital-leader-exam',
      moduleId: ['compute-engine', 'cloud-storage', 'cloud-functions', 'kubernetes-engine'],
      title: 'Cloud Digital Leader Exam',
      passingScore: 70,
      questions: [
        {
          questionId: 'q1',
          questionText: 'What is a key benefit of GCP?',
          options: ['Scalability', 'On-premises only', 'No AI integration'],
          correctAnswer: 'Scalability',
          explanation: 'GCP offers scalability as a key benefit.',
          order: 1,
        },
      ],
      createdAt: new Date('2025-02-23T15:00:00Z'),
      updatedAt: new Date('2025-03-05T12:00:00Z'), // Updated timestamp for today
    }, { merge: false });

    // 6. Notifications
    const notifications = [
      {
        notificationId: 'notification1',
        userId,
        title: 'Quiz Completed',
        message: 'You passed Compute Engine Quiz!',
        type: 'quiz_result',
        read: false,
        createdAt: new Date('2025-02-24T14:53:22Z'),
      },
      {
        notificationId: 'notification2',
        userId,
        title: 'Module Completed',
        message: 'You completed the Compute Engine module!',
        type: 'learning_milestone',
        read: false,
        createdAt: new Date('2025-02-24T15:00:00Z'),
      },
    ];

    for (const notif of notifications) {
        await db.collection('notifications').doc(notif.notificationId).set(notif);
    }

    // 7. AI Content
    const aiContents = [
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
        await db.collection('aiContent').doc(aiContent.contentId).set(aiContent);
    }

    console.log('Firestore schema updated successfully with Google Docs integration!');
  } catch (error) {
    console.error('Error creating/updating schema:', error);
    throw error;
  }
}

async function main() {
  try {
    const db = await initializeFirebase();
    if (!db) {
      throw new Error('Firestore initialization returned undefined');
    }
    await createSchema(db);
    console.log('Script completed successfully');
  } catch (error) {
    console.error('Main function error:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Schema creation failed:', err);
    process.exit(1);
  });
