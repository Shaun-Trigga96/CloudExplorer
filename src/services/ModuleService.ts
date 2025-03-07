import axios from 'axios';
import { Module, ModuleWithContent } from '../types/types';
import { FirestoreClient, firestoreClient } from './FirestoreClient';

const BASE_URL = 'http://localhost:5000'; // Adjust for production

export class ModuleService {
  private firestore: FirestoreClient;

  constructor(firestore: FirestoreClient = firestoreClient) {
    this.firestore = firestore;
  }

  async createModule(title: string, description: string, content: string): Promise<{ id: string; googleDocUrl: string }> {
    try {
      const response = await axios.post(`${BASE_URL}/create-doc`, { title, content, description });
      const { documentId, docUrl } = response.data;


      return { id: documentId, googleDocUrl: docUrl };
    } catch (error) {
      console.error('Error creating module:', error);
      throw error;
    }
  }

  async getModules(): Promise<Module[]> {
    try {
      const response = await axios.get(`${BASE_URL}/list-modules`);
      return response.data.map((item: any) => ({
        moduleId: item.id,
        ...item,
      } as Module));
    } catch (error) {
      console.error('Error fetching modules:', error);
      throw error;
    }
  }

  async getModuleDetails(moduleId: string): Promise<ModuleWithContent | null> {
    try {
      const doc = await this.firestore.getCollection('modules').doc(moduleId).get();
      if (!doc.exists) {return null;}

      const moduleData = { moduleId: doc.id, ...doc.data() } as Module;
      const docId = moduleData.content.split('/d/')[1]?.split('/edit')[0];
      if (!docId) {throw new Error('Invalid Google Doc URL');}

      const response = await axios.get(`${BASE_URL}/get-doc-content/${docId}`);
      const rawContent = response.data;

      return { ...moduleData, rawContent };
    } catch (error) {
      console.error('Error fetching module details:', error);
      throw error;
    }
  }

  async getAllModules(): Promise<Module[]> {
    return this.getModules(); // Use the same endpoint for consistency
  }

  async getModuleById(moduleId: string): Promise<Module | null> {
    try {
      const modules = await this.getModules();
      const module = modules.find(m => m.moduleId === moduleId) || null;
      if (!module) {return null;}

      // Optionally fetch detailed content if needed
      const detailedModule = await this.getModuleDetails(moduleId);
      return detailedModule || module;
    } catch (error) {
      console.error('Error fetching module by ID:', error);
      throw error;
    }
  }

  async updateModuleProgress(userId: string, moduleId: string, progress: number): Promise<boolean> {
    try {
      await this.firestore.getCollection('users').doc(userId).update({
        [`learningProgress.modules.${moduleId}`]: {
          progress,
          lastAccessed: this.firestore.getTimestamp(),
        },
      });
      return true;
    } catch (error) {
      console.error('Error updating module progress:', error);
      throw error;
    }
  }
}

export const moduleService = new ModuleService();