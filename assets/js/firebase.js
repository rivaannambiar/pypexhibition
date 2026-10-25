import { firebaseConfig } from './firebase-config.js';
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js';

// Zero-billing architecture: Firebase Authentication + Realtime Database only.
// No Firestore, Cloud Storage, Cloud Functions, or server runtime is used.
const configured = Boolean(
  firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith('PASTE_') &&
  firebaseConfig.projectId && !firebaseConfig.projectId.startsWith('YOUR_') &&
  firebaseConfig.databaseURL && !firebaseConfig.databaseURL.includes('YOUR_PROJECT_ID')
);
export const firebaseConfigured = configured;
export const app = configured ? (getApps()[0] || initializeApp(firebaseConfig)) : null;
export const auth = app ? getAuth(app) : null;
export const rtdb = app ? getDatabase(app) : null;
export const db = rtdb; // Legacy variable name used by the small RTDB adapter.
