import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Initialize Firebase Admin SDK for server-side operations.
 */
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  let privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [];
    if (!projectId) missing.push('FIREBASE_PROJECT_ID');
    if (!clientEmail) missing.push('FIREBASE_CLIENT_EMAIL');
    if (!privateKey) missing.push('FIREBASE_PRIVATE_KEY');
    console.error('❌ Missing Firebase environment variables:', missing.join(', '));
  }

  if (privateKey) {
    // 1. Unescape if it's a double-escaped string (common in .env)
    privateKey = privateKey.replace(/\\n/g, '\n');

    // 2. Remove surrounding quotes if they exist
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.substring(1, privateKey.length - 1);
    }

    // 3. Ensure BEGIN/END markers exist and have proper newlines
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.error('❌ FIREBASE_PRIVATE_KEY does not appear to be a valid private key');
    }
  }

  const serviceAccount = {
    projectId,
    clientEmail,
    privateKey,
  };

  try {
    return initializeApp({
      credential: cert(serviceAccount),
    });
  } catch (error) {
    console.error('❌ Firebase init failed:', error.message);
    // Don't throw, just return null so we can catch it in the handler
    return null;
  }
}

// Initialize the app
const app = initializeFirebaseAdmin();

// Export Firestore instance (nullable if app failed)
export const db = app ? getFirestore(app) : null;

export default app;
