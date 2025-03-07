// scripts/schema/ModuleService.ts
import axios from 'axios';
import { firestoreService } from './FirestoreService';
import { Module, Section } from '../../src/types/types';

const BASE_URL: string = process.env.BASE_URL || 'http://localhost:5000';
console.log(`ModuleService using BASE_URL: ${BASE_URL}`);

class ModuleService {
  async createModule(module: Module, sections: Section[]): Promise<void> {
    const service = await firestoreService;
    try {
      const { moduleId, title, content } = module;
      console.log(`Overwriting module: ${moduleId}`);

      // Create or update Google Doc
      console.log(`Attempting to create Google Doc at ${BASE_URL}/create-doc`);
      const response = await axios.post(`${BASE_URL}/create-doc`, {
        title: `${title} Notes`,
        content: content || 'Default content',
        moduleId,
      }).catch(error => {
        console.error('Error creating Google Doc:', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        } else if (error.request) {
          console.error('No response received:', error.request);
        }
        throw error;
      });
      const { docUrl } = response.data;
      console.log(`Google Doc created: ${docUrl}`);

      // Update module document
      await service.getCollection('modules').doc(moduleId).set({
        ...module,
        content: docUrl,
        createdAt: module.createdAt || service.createTimestamp(),
        updatedAt: service.createTimestamp(),
      }, { merge: true });

      // Update or create sections subcollection
      if (sections && sections.length > 0) {
        const batch = service.getDb().batch();
        sections.forEach(section => {
          const sectionRef = service.getCollection('modules')
            .doc(moduleId)
            .collection('sections')
            .doc(`section${section.order}`);
          batch.set(sectionRef, section, { merge: true });
        });
        await batch.commit();
        console.log(`Updated ${sections.length} sections for module: ${moduleId}`);
      }
    } catch (error) {
      console.error(`Error in createModule for ${module.moduleId}:`, error);
      throw error;
    }
  }
}

export const moduleService = new ModuleService();