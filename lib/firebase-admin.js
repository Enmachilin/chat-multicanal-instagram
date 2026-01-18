import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Initialize Firebase Admin SDK for server-side operations.
 */
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Get private key
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Handle different formats
    if (privateKey.startsWith('"')) {
      try {
        privateKey = JSON.parse(privateKey);
      } catch (e) {
        // Continue with original
      }
    }
    // Replace escaped newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  };

  try {
    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase init error:', error.message);
    throw error;
  }
}

// Initialize the app
const app = initializeFirebaseAdmin();

// Export Firestore instance
export const db = getFirestore(app);

export default app;
