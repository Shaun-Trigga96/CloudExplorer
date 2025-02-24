const admin = require('firebase-admin');
require('dotenv').config(); // Load environment variables from .env

// Get the service account path from .env
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not defined in .env');
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Function to check if a document exists
async function documentExists(collectionPath, docId) {
  const doc = await db.collection(collectionPath).doc(docId).get();
  return doc.exists;
}

// Function to create timestamps
const createTimestamp = () => admin.firestore.FieldValue.serverTimestamp();

async function createSchema() {
  try {
    const userId = 'Mbcy1W9YEynQujbWQFqbW5d0Ij2';

    // Check if user exists, update or create
    if (!(await documentExists('users', userId))) {
      await db.collection('users').doc(userId).set({
        createdAt: createTimestamp(),
        displayName: 'Thabiso Matsaba',
        email: 'thabisomatsaba96@gmail.com',
        learningProgress: {
          quizzes: 0,
          modules: 0,
        },
        photoURL: 'https://lh3.googleusercontent.com/a/ACg8ocJhbM695m1bCoCEFYBB...',
        settings: {
          darkMode: false,
          notificationsEnabled: true,
        },
      });
    } else {
      await db.collection('users').doc(userId).set(
        {
          learningProgress: {
            quizzes: 0,
            modules: 0,
          },
        },
        { merge: true } // Merge to preserve existing fields
      );
    }

    // Check if progress exists, update or create
    if (!(await documentExists(`users/${userId}/progress`, 'prog1'))) {
      await db.collection('users').doc(userId).collection('progress').doc('prog1').set({
        quizId: 'compute-engine-quiz1',
        examId: 'cloud-digital-leader-exam',
        score: 90,
        totalQuestions: 5,
        correctAnswers: 4,
        completedAt: createTimestamp(),
        progressId: 'prog1',
      });
    }

    // Create modules collection with sections subcollections
    const modules = [
      {
        moduleId: 'compute-engine',
        title: 'Compute Engine',
        description: 'Learn about virtual machines in Google Cloud',
        duration: 60,
        quizzes: ['compute-engine-quiz1'],
        createdAt: createTimestamp(),
        updatedAt: createTimestamp(),
      },
      {
        moduleId: 'cloud-storage',
        title: 'Cloud Storage',
        description: 'Master object storage in the cloud',
        duration: 60,
        quizzes: ['cloud-storage-quiz1'],
        createdAt: createTimestamp(),
        updatedAt: createTimestamp(),
      },
      {
        moduleId: 'cloud-functions',
        title: 'Cloud Functions',
        description: 'Build serverless applications',
        duration: 60,
        quizzes: ['cloud-functions-quiz1'],
        createdAt: createTimestamp(),
        updatedAt: createTimestamp(),
      },
      {
        moduleId: 'kubernetes-engine',
        title: 'Google Kubernetes Engine',
        description: 'Container orchestration with GKE',
        duration: 60,
        quizzes: ['kubernetes-engine-quiz1'],
        createdAt: createTimestamp(),
        updatedAt: createTimestamp(),
      },
    ];

    for (const module of modules) {
      if (!(await documentExists('modules', module.moduleId))) {
        await db.collection('modules').doc(module.moduleId).set(module);

        const sections = [
          {
            title: `${module.title} Overview`,
            content: `Content from Google Docs API for ${module.title} overview.`,
            order: 1,
          },
          {
            title: `${module.title} Concepts`,
            content: `Content from Google Docs API for ${module.title} concepts.`,
            order: 2,
          },
        ];

        for (const section of sections) {
          await db.collection('modules').doc(module.moduleId).collection('sections').add(section);
        }
      }
    }

    // Create quizzes collection
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
      if (!(await documentExists('quizzes', quiz.quizId))) {
        await db.collection('quizzes').doc(quiz.quizId).set(quiz);
      }
    }

    // Create exams collection
    if (!(await documentExists('exams', 'cloud-digital-leader-exam'))) {
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
        createdAt: createTimestamp(),
        updatedAt: createTimestamp(),
      });
    }

    // Create notifications collection
    if (!(await documentExists('notifications', 'notification1'))) {
      await db.collection('notifications').doc('notification1').set({
        createdAt: createTimestamp(),
        message: 'You passed GCP Basics Quiz!',
        notificationId: 'notification1',
        read: false,
        title: 'Quiz Completed',
        type: 'quiz_result',
        userId: userId,
      });
    }

    // Create aiContent collection
    if (!(await documentExists('aiContent', 'content1'))) {
      await db.collection('aiContent').doc('content1').set({
        contentId: 'content1',
        createdAt: createTimestamp(),
        metadata: {
          examId: 'cloud-digital-leader-exam',
          quizId: 'compute-engine-quiz1',
          moduleId: 'compute-engine',
        },
        source: 'GPT-3',
        type: ['quiz_question', 'explanation', 'module_content'],
      });
    }

    console.log('Firestore schema updated successfully!');
  } catch (error) {
    console.error('Error creating/updating schema:', error);
  }
}

createSchema();