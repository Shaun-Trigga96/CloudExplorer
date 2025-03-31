// scripts/create-schema-content-only.ts
// Renamed to reflect its new purpose
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs'; // Using Node's built-in file system module
import admin from 'firebase-admin'; // Use import syntax if your tsconfig allows esModuleInterop
import { FieldValue, Timestamp } from 'firebase-admin/firestore'; // Correct import for FieldValue/Timestamp
import { HfInference } from '@huggingface/inference';

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
  question: string;
  answers: { letter: string; answer: string; uniqueKey: string }[];
  correctAnswer: string;
  explanation: string;
}

interface Quiz {
  quizId: string; // Persistent ID
  moduleId: string;
  title: string;
  questions: Question[];
  passingScore: number;
  createdAt?: Timestamp | FieldValue;
  updatedAt?: Timestamp | FieldValue;
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
  // Removed 'content' field if description + associatedModules provide context
}

// --- Load Environment Variables ---
dotenv.config({ path: path.resolve(__dirname, '../..', '.env') });
console.log('ENV loaded:', process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? 'FB Path Found' : 'FB Path Missing!', process.env.HUGGINGFACE_API_KEY ? 'HF Key Found' : 'HF Key Missing!');

// --- Utility Functions (Copy/Paste or Require from script utils) ---
// Ensure these are available in your script's scope

async function executeWithRetry(fn: () => Promise<any>, maxRetries = 3, timeout = 20000, initialDelay = 1000): Promise<any> {
  console.log(`      >> Calling function with retry (max ${maxRetries}, timeout ${timeout}ms)...`);
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) => {
        const timer = setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
        timer.unref?.(); // Allow Node.js to exit if this is the only thing running
      });
      return await Promise.race([fn(), timeoutPromise]);
    } catch (error: any) {
      lastError = error;
      const isRetryable = error.message?.includes('RESOURCE_EXHAUSTED') || error.status === 429 || error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('Too Many Requests');
      if (isRetryable && attempt < maxRetries - 1) {
        const delay = initialDelay * (2 ** attempt);
        console.warn(`!! Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`!! Attempt ${attempt + 1} failed permanently: ${error.message}`);
        throw error;
      }
    }
  }
  throw lastError; // Throw last error if all retries failed
}

function parseQuizFromAIResponse(text: string): Question[] {
  console.log(`>> Parsing AI response (${(text || '').length} chars)...`);
  // *** PASTE your updated parseQuizFromAIResponse code here ***
  // Ensure it returns an array matching the Question interface
  if (!text) return [];
  const parsedQuestions = [{ id: 0, question: "Placeholder Q", answers: [{ letter: 'a', answer: 'Placeholder A', uniqueKey: 'q0-a' }], correctAnswer: 'a', explanation: 'Placeholder Expl.' }]; // Replace with real parser
  console.log(`      >> Parsed ${parsedQuestions.length} questions.`);
  return parsedQuestions;
}

async function getExamContent(examId: string, dbInstance: admin.firestore.Firestore): Promise<string> {
  console.log(`>> Fetching content context for examId: ${examId}`);
  // *** PASTE your updated getExamContent code here (ensure it uses dbInstance) ***
  // It should query 'exams' and potentially 'modules'/'sections' based on associatedModules
  const examDoc = await dbInstance.collection('exams').doc(examId).get();
  if (!examDoc.exists) return "Exam definition not found.";
  let content = examDoc.data()?.description || "";
  // Add logic to fetch associated module content if needed...
  console.log(`>> Context length: ${content.length} chars`);
  return content.trim() || "Default exam context.";
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

// --- Hugging Face Initialization ---
let hf: HfInference;
try {
  if (!process.env.HUGGINGFACE_API_KEY) throw new Error('HUGGINGFACE_API_KEY is required in .env file for seeding.');
  hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
  console.log('Hugging Face client initialized.');
} catch (error: any) {
  console.error('CRITICAL: Failed to initialize Hugging Face client:', error.message);
  process.exit(1);
}

// --- Content Definitions ---

// Define the structure for a section definition within the script
interface ScriptSectionDef {
  title: string;
  contentPath: string; // Path to the .md file relative to content directory
  order: number;
}

// Define the structure for a module definition within the script
// Omit 'sections' from the Module type, and add the script-specific sections definition
type ScriptModuleDef = Omit<Module, 'sections' | 'createdAt' | 'updatedAt' | 'quizIds' | 'contentType'> & {
  sections: ScriptSectionDef[];
};

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

// Define the structure for an exam definition within the script
// Exclude fields automatically set or generated later
type ScriptExamDef = Omit<Exam, 'questions' | 'questionsGeneratedAt' | 'createdAt' | 'updatedAt'> & {
  numberOfQuestions: number; // Add generation parameter
};

// Define the structure for a quiz definition within the script
// Exclude fields automatically set or generated later
type ScriptQuizDef = Omit<Quiz, 'questions' | 'createdAt' | 'updatedAt'> & {
  numberOfQuestions: number; // Add generation parameter
};


function defineExams(): ScriptExamDef[] {
  console.log('\n[CONTENT] Defining Exams Metadata & Generation Params...');
  return [
    {
      examId: 'cloud-digital-leader-exam',
      title: 'Google Cloud Digital Leader Practice Exam',
      description: 'Assesses foundational knowledge of cloud concepts and Google Cloud products, services, tools, features, benefits, and use cases.', // Updated Description
      duration: 90, // minutes
      prerequisites: ['cloud-fundamentals', 'compute-engine', 'cloud-storage', 'kubernetes-engine', 'cloud-functions'], // Suggested prerequisite
      // Modules relevant for fundamental understanding for AI context
      associatedModules: ['cloud-fundamentals', 'compute-engine', 'cloud-storage'],
      numberOfQuestions: 30 // Adjusted number of questions for practice CDL
    },
    {
      examId: 'cloud-architect-exam',
      title: 'Google Cloud Architect Practice Exam',
      description: 'Assesses ability to design, develop, and manage robust, secure, scalable, highly available, and dynamic solutions on Google Cloud.', // Updated Description
      duration: 120,
      // Suggested prerequisites based on broad scope
      prerequisites: ['cloud-fundamentals', 'compute-engine', 'cloud-storage', 'kubernetes-engine', 'cloud-functions'], // Add others like networking if available
      // Include all available core modules for broad architect context
      associatedModules: ['cloud-fundamentals', 'compute-engine', 'cloud-storage', 'cloud-functions', 'kubernetes-engine'],
      numberOfQuestions: 50
    },
    {
      examId: 'cloud-data-engineer', // NOTE: Requires relevant data modules to be defined for optimal generation
      title: 'Google Cloud Data Engineer Practice Exam',
      description: 'Assesses ability to design, build, operationalize, secure, and monitor data processing systems, focusing on data pipelines and machine learning models.', // Updated Description
      duration: 120,
      prerequisites: ['cloud-fundamentals', 'compute-engine', 'cloud-storage'], // Core prerequisites
      // Focus context on modules relevant to data storage, processing, serverless triggers
      associatedModules: ['cloud-fundamentals', 'compute-engine', 'cloud-storage', 'cloud-functions'],
      numberOfQuestions: 50
    },
    {
      examId: 'cloud-security-exam', // NOTE: Requires relevant security modules to be defined for optimal generation
      title: 'Google Cloud Security Practice Exam',
      description: 'Assesses ability to design and implement a secure infrastructure on Google Cloud Platform using Google Cloud security technologies.', // Updated Description
      duration: 120,
      prerequisites: ['cloud-fundamentals', 'compute-engine'], // Add networking, IAM modules if available
      // Focus context on infrastructure modules that need securing
      associatedModules: ['cloud-fundamentals', 'compute-engine', 'kubernetes-engine'],
      numberOfQuestions: 50
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
      numberOfQuestions: 5, // How many questions to generate
      passingScore: 60 // Required score percentage to pass
    },
    {
      quizId: 'compute-engine-quiz-1',
      moduleId: 'compute-engine',
      title: 'Compute Engine Basics Quiz',
      numberOfQuestions: 5,
      passingScore: 70
    },
    {
      quizId: 'cloud-storage-quiz-1',
      moduleId: 'cloud-storage',
      title: 'Cloud Storage Quiz',
      numberOfQuestions: 5,
      passingScore: 70
    },
    {
      quizId: 'cloud-functions-quiz-1',
      moduleId: 'cloud-functions',
      title: 'Cloud Functions Quiz',
      numberOfQuestions: 5,
      passingScore: 70
    },
    {
      quizId: 'kubernetes-engine-quiz-1',
      moduleId: 'kubernetes-engine',
      title: 'Kubernetes Engine Quiz',
      numberOfQuestions: 5,
      passingScore: 70
    },
    // Add entries for other modules that need quizzes...
    {
      quizId: 'data-transformation-quiz-1',
      moduleId: 'data-transformation',
      title: 'Data Transformation Quiz',
      numberOfQuestions: 5,
      passingScore: 70
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
    console.log(`  Processing Module: ${moduleId}`);

    const sectionsToUpload = (modDef.sections || []).map(secDef => {
      try {
        const mdContent = fs.readFileSync(path.join(contentBasePath, secDef.contentPath), 'utf8');
        return {
          id: `section-${String(secDef.order).padStart(3, '0')}`,
          title: secDef.title, content: mdContent, order: secDef.order, moduleId: moduleId,
        };
      } catch (e: any) {
        console.error(`    ! Error reading ${secDef.contentPath} for module ${moduleId}:`, e.message); return null;
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
    console.log(`  Processing Exam Metadata: ${examId}`);
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

async function generateAndSaveQuizQuestions(quizDefinitions: ReturnType<typeof defineQuizzes>) {
  console.log('\n[SEEDING] Generating and Saving Quiz Questions...');
  const quizCollection = db.collection('quizzes');
  const moduleCollection = db.collection('modules');

  for (const quizInfo of quizDefinitions) {
    const quizId = quizInfo.quizId;
    const moduleId = quizInfo.moduleId;
    const quizRef = quizCollection.doc(quizId);
    console.log(`Processing quiz: ${quizId} for module: ${moduleId}`);

    // Fetch module content context
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
      continue; // Skip this quiz
    }

    const quizTitle = quizInfo.title || `Quiz for ${moduleId}`;
    const numQuestions = quizInfo.numberOfQuestions || 5;
    const prompt = `Generate exactly ${numQuestions} quiz questions based on: """${moduleContentContext}"""... [rest of your standard quiz prompt]`;

    try {
      console.log(`    Generating ${numQuestions} questions for '${quizTitle}'...`);
      const result = await executeWithRetry(() => hf.textGeneration({
        model: process.env.HF_MODEL_QUIZ || 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: prompt, parameters: { max_new_tokens: 250 * numQuestions, temperature: 0.6 }
      }), 3, 30000); // Adjust timeout

      const questions = parseQuizFromAIResponse(result.generated_text);
      if (questions.length === 0) throw new Error('AI response parsing failed or returned no questions.');

      // Prepare full quiz data
      const quizData: Partial<Quiz> = {
        quizId: quizId, moduleId: moduleId, title: quizTitle,
        passingScore: quizInfo.passingScore || 70, questions: questions,
        updatedAt: serverTimestamp(),
      };
      // Use set with merge to create or overwrite the quiz with this ID
      await quizRef.set(quizData, { merge: true });
      console.log(`-> Saved/Updated generated quiz ${quizId}.`);
      // Update module with quizId link (idempotent using merge + arrayUnion if FieldValue imported)
      await moduleCollection.doc(moduleId).set({ quizIds: FieldValue.arrayUnion(quizId) }, { merge: true });

    } catch (error: any) {
      console.error(`!! Error generating/saving quiz '${quizId}':`, error.message);
    }
    // Optional delay
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 sec delay
  }
}

async function generateAndSaveExamQuestions(examDefinitions: ReturnType<typeof defineExams>) {
  console.log('\n[SEEDING] Generating and Saving Exam Questions...');
  const examCollection = db.collection('exams');

  for (const examInfo of examDefinitions) {
    const examId = examInfo.examId;
    console.log(`  Processing exam: ${examId}`);
    const examRef = examCollection.doc(examId);

    // Get content context using helper
    let examContentContext = '';
    try {
      const examMetaDoc = await examRef.get();
      if (!examMetaDoc.exists) throw new Error(`Exam metadata for ${examId} not found.`);
      examContentContext = await getExamContent(examId, db); // Pass db instance
      if (!examContentContext || examContentContext.length < 50) {
        console.warn(`  !! Insufficient content context for exam ${examId}. Generation might be less accurate.`);
      }
    } catch (fetchError: any) {
      console.error(`!! Error fetching context for exam '${examId}':`, fetchError.message);
      continue; // Skip this exam
    }


    const examTitle = examInfo.title || 'Exam';
    const numQuestions = examInfo.numberOfQuestions || 25;
    const prompt = `Generate exactly ${numQuestions} challenging exam questions for "${examTitle}" based on: """${examContentContext}"""... [rest of your standard exam prompt]`;

    try {
      console.log(`Generating ${numQuestions} questions for '${examTitle}'...`);
      const result = await executeWithRetry(() => hf.textGeneration({
        model: process.env.HF_MODEL_EXAM || 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: prompt, parameters: { max_new_tokens: 350 * numQuestions, temperature: 0.5 }
      }), 3, 45000); // Longer timeout

      const questions = parseQuizFromAIResponse(result.generated_text);
      if (questions.length === 0) throw new Error('AI response parsing failed or returned no questions.');

      // Update existing exam document with questions
      await examRef.update({ // Use update for existing doc
        questions: questions,
        questionsGeneratedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log(`    -> Saved/Updated generated questions for exam ${examId}.`);

    } catch (error: any) {
      console.error(`  !! Error generating/saving questions for exam '${examId}':`, error.message);
    }
    // Optional delay
    await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 sec delay
  }
}

// --- Main Execution Function ---
async function runSeeding() {
  console.log('\n--- Starting Firestore Content Seeding Script ---');
  // WARNING: Do not uncomment cleanup unless you intend to wipe these collections!
  // console.warn("!!! WARNING: Firestore cleanup is enabled. This will wipe data. !!!");
  // await cleanupFirestoreSafe(); // Use a modified, safer cleanup if absolutely needed

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

// --- (Optional) Cleanup Function - MODIFIED AND COMMENTED OUT ---
/*
async function cleanupFirestoreSafe(): Promise<void> {
    // WARNING: This function deletes data. Use with extreme caution.
    // Consider adding prompts or command-line flags to prevent accidental runs.
    const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    const collectionsToClean = ['modules', 'quizzes', 'exams']; // ONLY content collections

    console.warn(`\n!!! WARNING !!!`);
    console.warn(`This will DELETE ALL data in the following Firestore collections:`);
    console.warn(`  ${collectionsToClean.join(', ')}`);
    console.warn(`For project: ${process.env.GCLOUD_PROJECT || admin.app().options.projectId}`); // Show project ID

    const answer = await new Promise(resolve => readline.question(`Type 'YESDELETE' to confirm: `, resolve));
    readline.close();

    if (answer !== 'YESDELETE') {
        console.log('Cleanup aborted.');
        return;
    }

    console.log('Starting Firestore content cleanup...');
    try {
        for (const collection of collectionsToClean) {
            console.log(`  Cleaning up ${collection}...`);
            const snapshot = await db.collection(collection).limit(500).get(); // Limit initial query
            if (snapshot.empty) {
                console.log(`  Collection ${collection} is already empty or has few items.`);
                continue; // Check next collection or implement recursive delete if needed
            }
             // Simple batch delete (limited by snapshot size - use recursive delete for >500)
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            console.log(`  Deleted ${snapshot.size} documents from ${collection} (more may exist if >500).`);
            // TODO: Implement proper recursive delete for large collections if needed
        }
        console.log('Firestore content cleanup finished (check for remaining docs if large).');
    } catch (error) {
        console.error('Error during Firestore content cleanup:', error);
        throw error;
    }
}
*/


// --- Script Execution ---
runSeeding()
  .then(() => console.log('Script finished.'))
  .catch((err: Error) => {
    console.error('Unhandled error in script:', err);
    process.exit(1);
  });