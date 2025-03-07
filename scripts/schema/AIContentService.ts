// scripts/schema/AIContentService.ts
import { firestoreService } from './FirestoreService';

class AIContentService {
  async createAIContent(aiContent: any): Promise<void> {
    const service = await firestoreService;
    const { contentId } = aiContent;
    await service.getCollection('aiContent').doc(contentId).set(aiContent);
  }
}

export const aiContentService = new AIContentService();