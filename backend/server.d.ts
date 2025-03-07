// backend/server.d.ts
import { Auth } from 'googleapis';

export declare function authenticateGoogleDocs(): Promise<Auth.JWT>;
