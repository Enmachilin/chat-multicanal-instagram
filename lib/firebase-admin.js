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

  // Log para debug (remover después)
  console.log('Firebase Config Debug:');
  console.log('- Project ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('- Client Email:', process.env.FIREBASE_CLIENT_EMAIL);
  console.log('- Private Key exists:', !!privateKey);
  console.log('- Private Key length:', privateKey?.length);
  console.log('- Private Key starts with:', privateKey?.substring(0, 30));

  if (privateKey) {
    // Handle different formats
    if (privateKey.startsWith('"')) {
      try {
        privateKey = JSON.parse(privateKey);
      } catch (e) {
        console.log('- JSON parse failed, using as-is');
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
