// scripts/create-schema-content-only.ts
// Renamed to reflect its new purpose
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs'; // Using Node's built-in file system module
import admin from 'firebase-admin'; // Use import syntax if your tsconfig allows esModuleInterop
import { FieldValue, Timestamp } from 'firebase-admin/firestore'; // Correct import for FieldValue/Timestamp
import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai'; // Import result type if needed

// --- Type Definitions (Simplified or Import from main types) ---
// Ensure these types match the structure you expect in Firestore
interface Section {
  id?: string; // ID will be generated or based on order
  title: string;
  content: string; // Will hold Markdown content
  order: number;
  moduleId?: string; // Link back
  contentPath?: string; // Used temporarily for reading file
}

interface Module {
  moduleId: string;
  title: string;
  description: string;
  duration: number | null;
  prerequisites: string[];
  contentType?: 'markdown' | 'google_doc'; // Add this field
  quizIds?: string[]; // Link to quizzes
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  sections?: Section[]; // Used during definition, not always stored directly on module doc
}

interface Question { // Assuming structure from AI parser
  id: number;
  explanation: string[];
  answers: Array<{ letter: string; answer: string; uniqueKey?: string }>;
  question: string;
  options: string[];
  correctAnswer: string;
}

interface Quiz {
  quizId: string; // Persistent ID
  moduleId: string;
  title: string;
  questions: Question[];
  passingScore: number;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  description: string;
}

interface Exam {
  examId: string; // Persistent ID
  title: string;
  description: string;
  duration: number | null;
  prerequisites: string[];
  associatedModules?: string[]; // For AI context generation
  questions?: Question[]; // Store generated questions here
  questionsGeneratedAt?: Timestamp | FieldValue;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
  passingRate: number;
}

interface ScriptSectionDef {
  title: string;
  contentPath: string;
  order: number;
}

type ScriptModuleDef = Omit<Module, 'sections' | 'createdAt' | 'updatedAt' | 'quizIds' | 'contentType'> & {
  sections: ScriptSectionDef[];
};

type ScriptExamDef = Omit<Exam, 'questions' | 'questionsGeneratedAt' | 'createdAt' | 'updatedAt'> & {
  numberOfQuestions: number;
};

type ScriptQuizDef = Omit<Quiz, 'questions' | 'createdAt' | 'updatedAt'> & {
  numberOfQuestions: number;
};
// --- Load Environment Variables ---
dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });
console.log('ENV loaded:', process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? 'FB Path Found' : 'FB Path Missing!',
  process.env.INFERENCE_API_KEY ? 'HF Key Found' : 'HF Key Missing!');

// --- Utility Functions (Copy/Paste or Require from script utils) ---
async function executeWithRetry(fn: () => Promise<any>, maxRetries = 3, timeout = 30000, initialDelay = 1000): Promise<any> { // Increased default timeout
  console.log(`        >> Calling function with retry (max ${maxRetries}, timeout ${timeout}ms)...`);
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
          const timeoutPromise = new Promise((_, reject) => {
              const timer = setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
              timer.unref?.();
          });
          // Important: Added await here, executeWithRetry should await the function call
          return await Promise.race([fn(), timeoutPromise]);
      } catch (error: any) {
          lastError = error;
           // Slightly broader check for retryable conditions from Gemini or network issues
           const isRetryable = error.message?.includes('RESOURCE_EXHAUSTED') ||
                               error.status === 429 || // Rate limit
                               error.status === 500 || // Internal server error
                               error.status === 503 || // Service unavailable
                               error.name === 'AbortError' ||
                               error.message?.includes('timeout') ||
                               error.message?.includes('Too Many Requests') ||
                               error.message?.includes('fetch failed'); // Network error

          if (isRetryable && attempt < maxRetries - 1) {
              const delay = initialDelay * (2 ** attempt);
              console.warn(`!! Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
          } else {
              console.error(`!! Attempt ${attempt + 1} failed permanently: ${error.message}`);
              throw error; // Re-throw the error if not retryable or max retries reached
          }
      }
  }
  console.error("Retry loop finished unexpectedly without success or throwing."); // Should not happen
  throw lastError ?? new Error("Unknown error after retries."); // Throw last known error or a generic one
}


// --- Corrected Parser Implementation ---
function parseQuizFromAIResponse(text: string): Question[] {
  console.log(`>> Parsing AI response (${(text || '').length} chars)...`);
  if (!text || typeof text !== 'string') {
      console.warn('AI response text is empty or invalid. Returning empty questions array.');
      return [];
  }
  const questions: Question[] = [];
  const lines = text.trim().split(/\r?\n/);

  let currentQuestionInternal: Partial<Question> | null = null; // Use Partial for building
  let processingStage: 'question' | 'options' | 'answer' | 'explanation' = 'question';

  for (const [index, originalLine] of lines.entries()) {
      let line = originalLine.trim();
      if (!line) continue;

      try {
          const newQuestionMatch = line.match(/^(?:question|Q)\s*\d*[:.)]?\s*(.*)/i) || line.match(/^(\d+)[:.)]\s+(.*)/);
          if (newQuestionMatch) {
              // Push previous valid question
              if (currentQuestionInternal && currentQuestionInternal.question && currentQuestionInternal.answers && currentQuestionInternal.answers.length > 0 && currentQuestionInternal.correctAnswer) {
                  if (!currentQuestionInternal.explanation) {
                    currentQuestionInternal.explanation = [`The correct answer is ${currentQuestionInternal.correctAnswer.toUpperCase()}.`];
                  }
                  // Ensure it matches the Question interface before pushing
                  questions.push({
                    id: currentQuestionInternal.id ?? questions.length, // Use parsed ID or fallback
                    question: currentQuestionInternal.question,
                    answers: currentQuestionInternal.answers,
                    correctAnswer: currentQuestionInternal.correctAnswer,
                    explanation: currentQuestionInternal.explanation,
                    options: []
                  });
              }
              // Start new question
              currentQuestionInternal = {
                  id: questions.length, // Default ID
                  question: (newQuestionMatch[1] || newQuestionMatch[2]).trim(),
                  answers: [], // Initialize as empty array
                  correctAnswer: '',
                  explanation: [], // Initialize explanation as an empty array
              };
              processingStage = 'options';
              continue;
          }

          if (!currentQuestionInternal) continue; // Skip if no question context

          const explanationMatch = line.match(/^(?:explanation|rationale|reason)[:\s]*(.*)/i);
          if (explanationMatch) {
              currentQuestionInternal.explanation = [(explanationMatch[1] || '').trim()];
              processingStage = 'explanation';
              continue;
          }
          if (processingStage === 'explanation') {
              currentQuestionInternal.explanation = currentQuestionInternal.explanation || [];
              currentQuestionInternal.explanation.push(line); // Safely append
              continue;
          }

          const correctMatch = line.match(/^(?:correct\s+answer|answer)[:\s]*(.+)/i);
          if (correctMatch) {
              let correctAnswerText = correctMatch[1].trim();
              let parsedCorrectAnswer = '';
              // ... (Parsing logic for a, b, c, d, true, false) ...
               if (correctAnswerText.match(/^[a-d]$/i)) {
                   parsedCorrectAnswer = correctAnswerText.toLowerCase();
               } else if (correctAnswerText.match(/^[a-d][)\.]/i)) {
                   parsedCorrectAnswer = correctAnswerText.charAt(0).toLowerCase();
               } else if (correctAnswerText.toLowerCase() === 'true' || correctAnswerText.toLowerCase() === 'false') {
                    parsedCorrectAnswer = correctAnswerText.toLowerCase();
                    // Ensure answers array exists before checking length
                    if (currentQuestionInternal.answers?.length === 0) {
                          // Check if T/F already added
                         if(!currentQuestionInternal.answers.find(a => a.letter === 'true')){
                             currentQuestionInternal.answers.push({ letter: 'true', answer: 'True' });
                         }
                         if(!currentQuestionInternal.answers.find(a => a.letter === 'false')){
                              currentQuestionInternal.answers.push({ letter: 'false', answer: 'False'});
                         }
                    }
               } else {
                    const embeddedLetter = correctAnswerText.match(/(?:option|answer)?\s*['"(]?([a-d])['")\.]?/i);
                    if (embeddedLetter) {
                        parsedCorrectAnswer = embeddedLetter[1].toLowerCase();
                    } else {
                        console.warn(`Could not parse correct answer format: "${correctAnswerText}" for question ID ${currentQuestionInternal.id}`);
                    }
               }

              currentQuestionInternal.correctAnswer = parsedCorrectAnswer;
              processingStage = 'explanation';
              continue;
          }

          const optionMatch = line.match(/^([a-d])[:.)]\s+(.*)/i);
          if (optionMatch && processingStage === 'options') {
              const letter = optionMatch[1].toLowerCase();
              const answerText = optionMatch[2].trim();
              if (answerText) {
                  // Ensure answers array is initialized
                  if (!currentQuestionInternal.answers) {
                      currentQuestionInternal.answers = [];
                  }
                  currentQuestionInternal.answers.push({
                      letter: letter,
                      answer: answerText,
                      uniqueKey: `q${currentQuestionInternal.id}-${letter}` // Add unique key back
                  });
              }
              continue;
          }

      } catch (parseError: any) {
          console.error(`Error parsing line ${index + 1}: "${line}"`, parseError);
          currentQuestionInternal = null;
          processingStage = 'question'; // Reset stage on error
          continue; // Skip to next line on error
      }
  }

  // Add the last valid question
  if (currentQuestionInternal && currentQuestionInternal.question && currentQuestionInternal.answers && currentQuestionInternal.answers.length > 0 && currentQuestionInternal.correctAnswer) {
      if (!currentQuestionInternal.explanation) {
          currentQuestionInternal.explanation = [`The correct answer is ${currentQuestionInternal.correctAnswer.toUpperCase()}.`];
      }
       questions.push({
         id: currentQuestionInternal.id ?? questions.length,
         question: currentQuestionInternal.question,
         answers: currentQuestionInternal.answers,
         correctAnswer: currentQuestionInternal.correctAnswer,
         explanation: currentQuestionInternal.explanation,
         options: []
       });
  }

  console.log(`        >> Parsed ${questions.length} questions.`);
  return questions;
}


// --- Corrected getExamContent (Simplified Context) ---
async function getExamContent(examId: string, dbInstance: admin.firestore.Firestore): Promise<string> {
  console.log(`>> Fetching content context for examId: ${examId}`);
  let content: string = '';
  const associatedModuleSummaries: string[] = [];

  try {
      const examDocRef = dbInstance.collection('exams').doc(examId);
      const examDoc = await examDocRef.get();
      let associatedModuleIds: string[] = [];

      if (examDoc.exists) {
          const examData = examDoc.data();
          content += (examData?.title || 'Exam Topic') + '. ' + (examData?.description || '') + ' ';
          if (examData?.associatedModules && Array.isArray(examData.associatedModules)) {
              associatedModuleIds = examData.associatedModules;
          }
      } else {
          console.warn(`Exam document ${examId} not found when fetching content.`);
          content += 'General exam topics. ';
      }

      if (associatedModuleIds.length > 0) {
          console.log(`Fetching summaries from associated modules: ${associatedModuleIds.join(', ')}`);
          const modulePromises = associatedModuleIds.map(modId => dbInstance.collection('modules').doc(modId).get());
          const moduleDocs = await Promise.all(modulePromises);

          moduleDocs.forEach(modDoc => {
              if (modDoc.exists) {
                  const modData = modDoc.data();
                  const summary = `Module: ${modData?.title || 'Untitled Module'}. Description: ${modData?.description || 'No description.'}`;
                  associatedModuleSummaries.push(summary);
              } else {
                   console.warn(`Associated module ${modDoc.id} not found.`);
              }
          });
      }

      if (associatedModuleSummaries.length > 0) {
          content += '\nRelevant Module Summaries:\n' + associatedModuleSummaries.join('\n');
      }

       if (content.trim() === '' || associatedModuleSummaries.length === 0) {
          console.warn('No specific content or module summaries found. Using default placeholder.');
          content = 'General knowledge related to the expected exam topic.';
       }

       content = content.replace(/\s+/g, ' ').trim();
       console.log(`>> Reduced context length: ${content.length} chars`);

  } catch(error: any) {
       console.error(`Error fetching content for exam ${examId}:`, error);
       content = `Error retrieving exam content context: ${error.message}`;
  }
  return content;
}


const serverTimestamp = () => FieldValue.serverTimestamp();

// --- Firebase Admin Initialization ---
let db: admin.firestore.Firestore;
try {
  // 2. Calculate project root relative to compiled script location
  const projectRoot = path.resolve(__dirname, '../..');
  
  // 3. Get path string from the (now correctly loaded) environment variable
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is defined in .env file but was not loaded into process.env'); // More specific error
  }
  
  // 4. Resolve the final absolute path using the project root and the relative path from .env
  const absoluteCredentialsPath = path.resolve(projectRoot, serviceAccountPath);
  
  console.log(`Loading Firebase credentials from: ${absoluteCredentialsPath}`); // Check this log!
  const serviceAccount = require(absoluteCredentialsPath); // This should now work
  

  if (admin.apps.length === 0) { // Initialize only if default app doesn't exist
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK Initialized for Seeding.');
  } else {
    console.log('Firebase Admin SDK already initialized.');
    admin.app(); // Get default app if already initialized
  }
  db = admin.firestore();

} catch (error: any) {
  console.error('CRITICAL: Failed to initialize Firebase Admin SDK for seeding:', error.message);
  process.exit(1);
}


// --- Initialize Google AI Client for Seeding Script ---
if (!process.env.GEMINI_API_KEY) { // Update check
  console.error('CRITICAL: GEMINI_API_KEY environment variable is not set. Seeding script AI generation will fail.');
  process.exit(1);
}
// Initialize Google client
const googleAiClientSeeding = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log('Google AI client initialized for seeding.');


// Updated function to define modules with descriptions and ordered sections
function defineModules(): ScriptModuleDef[] {
  console.log('\n[CONTENT] Defining Modules...');
  // Ensure this path correctly points to your .md files relative to the script location
  const contentBasePath = path.resolve(__dirname, 'content');
  console.log(`    > Reading .md files from base path: ${contentBasePath}`);

  return [
    {
      moduleId: 'cloud-fundamentals',
      title: 'GCP Cloud Fundamentals',
      description: 'Understand core cloud computing concepts (IaaS, PaaS, SaaS), benefits, and key Google Cloud services and infrastructure.', // Added Description
      duration: 60, // Example duration in minutes
      prerequisites: [], // No prerequisites for the first module
      sections: [
        { title: 'Introduction to Cloud Computing', contentPath: 'fundamentalCloudConceptsNotes.md', order: 1 },
        { title: 'Cloud Computing Models (IaaS, PaaS, SaaS)', contentPath: 'cloudComputingModelsNotes.md', order: 2 } // Fixed Order
      ]
    },
    {
      moduleId: 'compute-engine',
      title: 'Compute Engine',
      description: 'Explore Google Cloud\'s scalable virtual machine (VM) service, instance types, pricing models, and basic management.', // Added Description
      duration: 60,
      prerequisites: ['cloud-fundamentals'], // Example prerequisite
      sections: [
        { title: 'Introduction to Compute Engine', contentPath: 'computeEngine.md', order: 1 },
        { title: 'Understanding Virtual Machine Types', contentPath: 'virtualMachineNotes.md', order: 2 } // Fixed Order
      ]
    },
    {
      moduleId: 'cloud-storage',
      title: 'Cloud Storage',
      description: 'Learn about Google Cloud\'s unified, scalable, and durable object storage service, including storage classes and use cases.', // Added Description
      duration: 45,
      prerequisites: ['cloud-fundamentals'], // Example prerequisite
      sections: [
        { title: 'Overview of Cloud Storage', contentPath: 'cloudStorage.md', order: 1 },
        { title: 'Object Storage Concepts & Classes', contentPath: 'storageConceptsNotes.md', order: 2 } // Fixed Order
      ]
    },
    {
      moduleId: 'cloud-functions',
      title: 'Cloud Functions',
      description: 'Build and deploy event-driven serverless microservices that automatically scale with Google Cloud Functions.', // Added Description
      duration: 60,
      prerequisites: ['cloud-fundamentals'], // Example prerequisite
      sections: [
        { title: 'Introduction to Serverless Computing', contentPath: 'cloudFunctions.md', order: 1 },
        { title: 'Developing & Deploying Cloud Functions', contentPath: 'buildingServerlessFunctionsNotes.md', order: 2 } // Fixed Order
      ]
    },
    {
      moduleId: 'kubernetes-engine',
      title: 'Kubernetes Engine (GKE)',
      description: 'Deploy, manage, and scale containerized applications using Google Kubernetes Engine, Google Cloud\'s managed Kubernetes service.', // Added Description
      duration: 75, // Example duration
      prerequisites: ['cloud-fundamentals', 'compute-engine'], // Example prerequisites
      sections: [
        { title: 'Introduction to Kubernetes & Containers', contentPath: 'kubernetes.md', order: 1 },
        { title: 'Container Orchestration with GKE', contentPath: 'containerOrchestrationNotes.md', order: 2 } // Fixed Order
      ]
    },
    // Add definitions for any other modules you have .md files for...
    {
      moduleId: 'data-transformation',
      title: 'Data Transformation',
      description: 'Understanding the value of data is essential for leveraging its full potential.',
      duration: 90,
      prerequisites: ['cloud-fundamentals'],
      sections: [
        { title: 'Value of Data', contentPath: 'valueOfDataNotes.md', order: 1 },
        { title: 'Data Management Solutions', contentPath: 'dataManagementSolutions.md', order: 2 },
        { title: 'Make Data Useful and Accessible', contentPath: 'makeDataUseful.md', order: 3 }

      ]
    },
  ];
}


function defineExams(): ScriptExamDef[] {
  console.log('\n[CONTENT] Defining Exams Metadata & Generation Params...');
  return [
    {
      examId: 'cloud-digital-leader-exam',
      title: 'Google Cloud Digital Leader Practice Exam',
      description: 'Assesses foundational knowledge of cloud concepts and Google Cloud products, services, tools, features, benefits, and use cases.', // Updated Description
      duration: 90, // minutes
      prerequisites: ['cloud-fundamentals', 'compute-engine', 'cloud-storage', 'kubernetes-engine', 'cloud-functions', 'data-transformation'], // Suggested prerequisite
      // Modules relevant for fundamental understanding for AI context
      associatedModules:['cloud-fundamentals', 'compute-engine', 'cloud-storage', 'kubernetes-engine', 'cloud-functions', 'data-transformation'],
      numberOfQuestions: 30, // Adjusted number of questions for practice CDL
      passingRate: 70 // Adjusted passing rate for CDL
    },
    {
      examId: 'cloud-architect-exam',
      title: 'Google Cloud Architect Practice Exam',
      description: 'Assesses ability to design, develop, and manage robust, secure, scalable, highly available, and dynamic solutions on Google Cloud.', // Updated Description
      duration: 120,
      // Suggested prerequisites based on broad scope
      prerequisites: ['cloud-fundamentals', 'compute-engine', 'cloud-storage', 'kubernetes-engine', 'cloud-functions', 'data-transformation'], // Add others like networking if available
      // Include all available core modules for broad architect context
      associatedModules: ['cloud-fundamentals', 'compute-engine', 'cloud-storage', 'kubernetes-engine', 'cloud-functions', 'data-transformation'],
      numberOfQuestions: 30,
      passingRate: 70 // Adjusted passing rate for CDL
    },
    {
      examId: 'cloud-data-engineer', // NOTE: Requires relevant data modules to be defined for optimal generation
      title: 'Google Cloud Data Engineer Practice Exam',
      description: 'Assesses ability to design, build, operationalize, secure, and monitor data processing systems, focusing on data pipelines and machine learning models.', // Updated Description
      duration: 120,
      prerequisites: ['cloud-fundamentals', 'compute-engine', 'cloud-storage', 'kubernetes-engine', 'cloud-functions', 'data-transformation'], // Core prerequisites
      // Focus context on modules relevant to data storage, processing, serverless triggers
      associatedModules: ['cloud-fundamentals', 'compute-engine', 'cloud-storage', 'kubernetes-engine', 'cloud-functions', 'data-transformation'],
      numberOfQuestions: 30,
      passingRate: 70 // Adjusted passing rate for CDL
    },
    {
      examId: 'cloud-security-exam', // NOTE: Requires relevant security modules to be defined for optimal generation
      title: 'Google Cloud Security Practice Exam',
      description: 'Assesses ability to design and implement a secure infrastructure on Google Cloud Platform using Google Cloud security technologies.', // Updated Description
      duration: 120,
      prerequisites: ['cloud-fundamentals', 'compute-engine', 'cloud-storage', 'kubernetes-engine', 'cloud-functions', 'data-transformation'], // Add networking, IAM modules if available
      // Focus context on infrastructure modules that need securing
      associatedModules: ['cloud-fundamentals', 'compute-engine', 'cloud-storage', 'kubernetes-engine', 'cloud-functions', 'data-transformation'],
      numberOfQuestions: 30,
      passingRate: 70 // Adjusted passing rate for CDL
    },
    // Add other exam definitions here...
  ];
}

function defineQuizzes(): ScriptQuizDef[] {
  console.log('\n[CONTENT] Defining Quizzes (for AI Generation)...');
  // This function defines which quizzes should be generated by AI, linked to modules.
  // The actual questions are generated and stored later in the script.
  return [
    {
      quizId: 'cloud-fundamentals-quiz-1', // Persistent ID for the quiz
      moduleId: 'cloud-fundamentals', // Link to the module
      title: 'Cloud Fundamentals Quiz', // Title for the quiz
      numberOfQuestions: 10, // How many questions to generate
      passingScore: 70, // Required score percentage to pass,
      description: 'Test your knowledge of core cloud computing concepts and Google Cloud fundamentals.' // Added Description
    },
    {
      quizId: 'compute-engine-quiz-1',
      moduleId: 'compute-engine',
      title: 'Compute Engine Basics Quiz',
      numberOfQuestions: 10,
      passingScore: 70,
      description: 'Test your understanding of Google Cloud Compute Engine basics.' // Added Description
    },
    {
      quizId: 'cloud-storage-quiz-1',
      moduleId: 'cloud-storage',
      title: 'Cloud Storage Quiz',
      numberOfQuestions: 10,
      passingScore: 70,
      description: 'Test your knowledge of Google Cloud Storage concepts and use cases.' // Added Description
    },
    {
      quizId: 'cloud-functions-quiz-1',
      moduleId: 'cloud-functions',
      title: 'Cloud Functions Quiz',
      numberOfQuestions: 10,
      passingScore: 70,
      description: 'Test your understanding of Google Cloud Functions and serverless computing.' // Added Description
    },
    {
      quizId: 'kubernetes-engine-quiz-1',
      moduleId: 'kubernetes-engine',
      title: 'Kubernetes Engine Quiz',
      numberOfQuestions: 10,
      passingScore: 70,
      description: 'Test your knowledge of Google Kubernetes Engine and container orchestration.' // Added Description
    },
    // Add entries for other modules that need quizzes...
    {
      quizId: 'data-transformation-quiz-1',
      moduleId: 'data-transformation',
      title: 'Data Transformation Quiz',
      numberOfQuestions: 10,
      passingScore: 70,
      description: 'Test your understanding of data transformation and management concepts.' // Added Description
    }
  ];
}

// --- REMEMBER ---
// 1. The 'associatedModules' field in defineExams is crucial for providing relevant context to the AI when generating exam questions. Ensure these IDs match your defined 'moduleId's. The quality of generated questions depends heavily on the relevance and content of these associated modules.
// 2. The 'quizId' in defineQuizzes must be unique and persistent. Re-running the script will target the document with this ID for updates.
// 3. Ensure the 'Exam' and 'Quiz' types used elsewhere match the properties being defined here.
// 4. Make sure the rest of the seeding script uses these functions correctly to seed metadata and trigger AI generation + saving.

// --- Seeding Logic Functions ---

async function seedModules(moduleDefinitions: ReturnType<typeof defineModules>) {
  console.log('\n[SEEDING] Seeding Modules and Sections...');
  const moduleCollection = db.collection('modules');
  const contentBasePath = path.resolve(__dirname, 'content');

  for (const modDef of moduleDefinitions) {
    const moduleId = modDef.moduleId;
    const moduleRef = moduleCollection.doc(moduleId);
    console.log(`Processing Module: ${moduleId}`);

    const sectionsToUpload = (modDef.sections || []).map(secDef => {
      try {
        const mdContent = fs.readFileSync(path.join(contentBasePath, secDef.contentPath), 'utf8');
        return {
          id: `section-${String(secDef.order).padStart(3, '0')}`,
          title: secDef.title, content: mdContent, order: secDef.order, moduleId: moduleId,
        };
      } catch (e: any) {
        console.error(`! Error reading ${secDef.contentPath} for module ${moduleId}:`, e.message); return null;
      }
    }).filter(s => s !== null); // Just filter out nulls
    const moduleDocData: Partial<Module> = { // Use Partial as some fields are optional or handled by merge
      moduleId: moduleId, title: modDef.title, description: modDef.description,
      duration: modDef.duration || null, prerequisites: modDef.prerequisites || [],
      contentType: 'markdown', updatedAt: serverTimestamp(),
    };

    try {
      const batch = db.batch();
      // Set/Merge the main module document (preserves createdAt)
      batch.set(moduleRef, moduleDocData, { merge: true });
      // Overwrite sections
      sectionsToUpload.forEach(sectionDocData => {
        let sectionRef: FirebaseFirestore.DocumentReference | undefined;
        if (sectionDocData) {
          sectionRef = moduleRef.collection('sections').doc(sectionDocData.id!); // Use non-null assertion for id
        } else {
          console.error('Error: sectionDocData is null.');
        }
        if (sectionRef) {
          batch.set(sectionRef, sectionDocData);
        }
      });
      await batch.commit();
      console.log(`-> Module '${moduleId}' metadata updated/set with ${sectionsToUpload.length} sections.`);
    } catch (error: any) {
      console.error(`!! Error processing module '${moduleId}':`, error.message);
    }
  }
}

async function seedExamMetadata(examDefinitions: ReturnType<typeof defineExams>) {
  console.log('\n[SEEDING] Seeding/Updating Exam Metadata...');
  const examCollection = db.collection('exams');

  for (const examDef of examDefinitions) {
    const examId = examDef.examId;
    const examRef = examCollection.doc(examId);
    console.log(`Processing Exam Metadata: ${examId}`);
    const examDocData: Partial<Exam> = {
      examId: examId, title: examDef.title, description: examDef.description,
      duration: examDef.duration || null, prerequisites: examDef.prerequisites || [],
      associatedModules: examDef.associatedModules || [], updatedAt: serverTimestamp(),
    };
    try {
      await examRef.set(examDocData, { merge: true });
      console.log(`-> Exam metadata for '${examId}' updated/set.`);
    } catch (error: any) {
      console.error(`!! Error setting metadata for exam '${examId}':`, error.message);
    }
  }
}

// Updated generateAndSaveQuizQuestions with Gemini API call
async function generateAndSaveQuizQuestions(quizDefinitions: ReturnType<typeof defineQuizzes>) {
    console.log('\n[SEEDING] Generating and Saving Quiz Questions...');
    const quizCollection = db.collection('quizzes');
    const moduleCollection = db.collection('modules');

    for (const quizInfo of quizDefinitions) {
        const quizId = quizInfo.quizId;
        const moduleId = quizInfo.moduleId;
        const quizRef = quizCollection.doc(quizId);
        console.log(`Processing quiz: ${quizId} for module: ${moduleId}`);

        let moduleContentContext = '';
        try {
             const moduleDoc = await moduleCollection.doc(moduleId).get();
             if (!moduleDoc.exists) throw new Error(`Module ${moduleId} not found.`);
             const moduleData = moduleDoc.data() as Module;
             moduleContentContext = moduleData.description || '';
             const sectionsSnapshot = await moduleCollection.doc(moduleId).collection('sections').orderBy('order').get();
             sectionsSnapshot.forEach(doc => { moduleContentContext += ` ${doc.data().content || ''}`; });
             moduleContentContext = moduleContentContext.trim();
             if (!moduleContentContext) throw new Error(`No content context found for module ${moduleId}.`);
        } catch (fetchError: any) {
             console.error(`!! Error fetching context for quiz '${quizId}':`, fetchError.message);
             continue;
        }

        const quizTitle = quizInfo.title || `Quiz for ${moduleId}`;
        const numQuestions = quizInfo.numberOfQuestions || 5; // Use default from definition
        const prompt = `Generate exactly ${numQuestions} quiz questions (multiple choice or true/false) based strictly on the following content: """${moduleContentContext}"""

        Format the output precisely as follows for each question:

        Question: [The question text]
        a) [Option a text]
        b) [Option b text]
        c) [Option c text]
        d) [Option d text]
        Correct answer: [Correct option letter, e.g., a]
        Explanation: [Brief explanation why the answer is correct, referencing the content if possible]

        OR for True/False:

        Question: [The question text]
        Correct answer: [True or False]
        Explanation: [Brief explanation why the answer is True or False, referencing the content if possible]

        RULES:
        - Return *only* the formatted questions, answers, and explanations.
        - Do not include introductory text, summaries, numbering beyond the question itself (like "1."), or closing remarks.
        - Ensure explanations are concise and accurate based *only* on the provided content context.
        - Ensure all ${numQuestions} questions are generated.
        - Adhere strictly to the a) b) c) d) format for multiple choice options.
        - Adhere strictly to the "Correct answer: " prefix for the answer line.
        - Adhere strictly to the "Explanation: " prefix for the explanation line.`;


        try {
            console.log(`       Generating ${numQuestions} questions for '${quizTitle}' using Google Gemini API...`);
            const modelName = process.env.QUIZ_MODEL_GEMINI || "gemini-1.5-flash-latest"; // Using Flash for quizzes
            console.log(`       Using model: ${modelName}`);
            const model = googleAiClientSeeding.getGenerativeModel({ model: modelName });

            const result: GenerateContentResult = await executeWithRetry(
              () => model.generateContent(
                  prompt,
                  // Optional: Add generationConfig if needed
                  // { temperature: 0.6 }
              ),
              3, 30000 // 30 second timeout
            );

            console.log(`       >> RAW API Response for Quiz ${quizId}:`, JSON.stringify(result, null, 2)); // Keep logging raw response

            const response = result.response;
            // Add extra safety check for response existence
            if (!response) {
                 throw new Error('Gemini API did not return a response object.');
            }
            const generatedText = response.text();
            if (!generatedText) throw new Error('Gemini API response content is empty.');

            console.log(`>> Text content received (${generatedText.length} chars). Parsing...`);
            const questions = parseQuizFromAIResponse(generatedText); // Use corrected parser

            if (questions.length === 0) {
                console.warn(`Parsing failed for ${quizId}. Text was:\n---\n${generatedText}\n---`);
                throw new Error('AI response parsing failed or returned no questions.');
            }

            const quizData: Partial<Quiz> = {
                quizId: quizId, moduleId: moduleId, title: quizTitle,
                description: quizInfo.description, passingScore: quizInfo.passingScore || 70,
                questions: questions, updatedAt: serverTimestamp(),
            };

            const batch = db.batch();
            batch.set(quizRef, quizData, { merge: true });
            batch.set(moduleCollection.doc(moduleId), { quizIds: FieldValue.arrayUnion(quizId) }, { merge: true });
            await batch.commit();

            console.log(`-> Saved/Updated generated quiz ${quizId} with ${questions.length} questions.`);

        } catch (error: any) {
            console.error(`!! Error generating/saving quiz '${quizId}':`, error.message);
             if (error.message.includes('GoogleGenerativeAI Error')) {
                 console.error(" -> Google API Error Details:", JSON.stringify(error, null, 2)); // Log full error
             }
        }
        await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay slightly
    }
}


// Updated generateAndSaveExamQuestions with Gemini API call
async function generateAndSaveExamQuestions(examDefinitions: ReturnType<typeof defineExams>) {
  console.log('\n[SEEDING] Generating and Saving Exam Questions...');
  const examCollection = db.collection('exams');

  for (const examInfo of examDefinitions) {
      const examId = examInfo.examId;
      console.log(`   Processing exam: ${examId}`);
      const examRef = examCollection.doc(examId);

      let examContentContext = '';
      try {
          const examMetaDoc = await examRef.get();
          if (!examMetaDoc.exists) throw new Error(`Exam metadata for ${examId} not found.`);
          // Use the UPDATED getExamContent which uses only titles/descriptions
          examContentContext = await getExamContent(examId, db);
          if (!examContentContext || examContentContext.includes('Error retrieving')) {
               throw new Error(`Failed to get valid content context for exam ${examId}`);
          }
           if (examContentContext.length < 50) { // Basic check even on reduced context
              console.warn(`   !! Potentially insufficient content context for exam ${examId} (${examContentContext.length} chars). Generation might be less accurate.`);
          }
      } catch (fetchError: any) {
          console.error(`!! Error fetching context for exam '${examId}':`, fetchError.message);
          continue;
      }

      const examTitle = examInfo.title || 'Exam';
      const numQuestions = examInfo.numberOfQuestions || 25; // Use definition's count
      const prompt = `Generate exactly ${numQuestions} challenging, scenario-based exam questions suitable for a "${examTitle}" certification practice exam. Base the questions strictly on the following provided context summaries: """${examContentContext}"""

      Format the output precisely as follows for each question:

      Question: [The question text, often presenting a scenario]
      a) [Option a text]
      b) [Option b text]
      c) [Option c text]
      d) [Option d text]
      Correct answer: [Correct option letter, e.g., a]
      Explanation: [Brief but clear explanation why the answer is correct, referencing concepts if possible]

      RULES:
      - Return *only* the formatted questions, answers, and explanations.
      - Do not include introductory text, summaries, numbering beyond the question itself, or closing remarks.
      - Ensure explanations are concise and accurate based *only* on the provided context.
      - Ensure all ${numQuestions} questions are generated.
      - Adhere strictly to the a) b) c) d) format for multiple choice options.
      - Adhere strictly to the "Correct answer: " prefix for the answer line.
      - Adhere strictly to the "Explanation: " prefix for the explanation line.`;


      try {
          console.log(`Generating ${numQuestions} questions for '${examTitle}' using Google Gemini API...`);
           // Using Gemini 1.5 Pro for potentially more complex exam questions
          const modelName = process.env.EXAM_MODEL_GEMINI || "gemini-1.5-pro-latest";
          console.log(`Using model: ${modelName}`);
          const model = googleAiClientSeeding.getGenerativeModel({ model: modelName });

          // Add generationConfig for exams if needed (e.g., temperature)
          // const generationConfig = { temperature: 0.5 };

          const result: GenerateContentResult = await executeWithRetry(
            () => model.generateContent(
                prompt,
                // generationConfig // Pass config if defined
            ),
            3, 60000 // 60 second timeout for exams
          );

          console.log(`>> RAW API Response for Exam ${examId}:`, JSON.stringify(result, null, 2));

          const response = result.response;
           if (!response) {
               throw new Error('Gemini API did not return a response object.');
          }
          const generatedText = response.text();
          if (!generatedText) throw new Error('Gemini API response content is empty.');

          console.log(`>> Text content received (${generatedText.length} chars). Parsing...`);
          const questions = parseQuizFromAIResponse(generatedText); // Use corrected parser

          if (questions.length === 0) {
               console.warn(`Parsing failed for ${examId}. Text was:\n---\n${generatedText}\n---`);
              throw new Error('AI response parsing failed or returned no questions.');
          }

          await examRef.update({
              questions: questions,
              questionsGeneratedAt: serverTimestamp(),
              updatedAt: serverTimestamp()
          });
          console.log(`-> Saved/Updated generated questions for exam ${examId} (${questions.length} questions).`);

      } catch (error: any) {
          console.error(`!! Error generating/saving questions for exam '${examId}':`, error.message);
           if (error.message.includes('GoogleGenerativeAI Error')) {
               console.error(" -> Google API Error Details:", JSON.stringify(error, null, 2));
           }
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // Increased delay slightly
  }
}


// --- Main Execution Function ---
async function runSeeding() {
  console.log('\n--- Starting Firestore Content Seeding Script ---');
  try {
    const modules = defineModules();
    const exams = defineExams();
    const quizzes = defineQuizzes();

    await seedModules(modules);
    await seedExamMetadata(exams);
    await generateAndSaveQuizQuestions(quizzes);
    await generateAndSaveExamQuestions(exams); // Pass exams array for context

    console.log('\n--- Firestore Content Seeding Script Completed Successfully ---');

  } catch (error) {
    console.error('\n--- Firestore Content Seeding Script Failed ---');
    console.error('Error:', error);
    process.exit(1);
  }
}


// --- Script Execution ---
runSeeding()
  .then(() => console.log('Script finished.'))
  .catch((err: Error) => {
    console.error('Unhandled error in script:', err);
    process.exit(1);
  });
