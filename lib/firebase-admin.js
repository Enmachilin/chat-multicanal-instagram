import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Initialize Firebase Admin SDK for server-side operations.
 */
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Handle Firebase Private Key formatting
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // If it starts with a quote, it might be a JSON string from Vercel/CLI
    if (privateKey.startsWith('"')) {
      try {
        privateKey = JSON.parse(privateKey);
      } catch (e) {
        // Fallback to original
      }
    }
    // Ensure actual newlines are preserved
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
