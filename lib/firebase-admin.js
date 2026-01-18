import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Initialize Firebase Admin SDK for server-side operations.
 * Uses environment variables for configuration.
 */
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Get private key and handle different formats
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // If it starts with a quote, try to parse as JSON string
    if (privateKey.startsWith('"')) {
      try {
        privateKey = JSON.parse(privateKey);
      } catch (e) {
        // Not valid JSON, continue with original
      }
    }
    // Replace escaped newlines with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  };

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

// Initialize the app
const app = initializeFirebaseAdmin();

// Export Firestore instance
export const db = getFirestore(app);

export default app;
