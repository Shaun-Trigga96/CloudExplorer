import { Timestamp } from 'firebase-admin/firestore';
import { AIContentMetadata } from './AIContentMetadata';
import { AIContentType } from './AIContentType';

export interface AIContent {
    contentId: string; // Unique ID for the content
    type: AIContentType; // e.g., "quiz_question", "explanation"
    source: string; // e.g., "GPT-3", "Hugging Face"
    content: string; // The actual content (question, explanation, etc.)
    metadata: AIContentMetadata;
    createdAt: Timestamp;
  }
