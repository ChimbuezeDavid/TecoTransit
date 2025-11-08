
import * as admin from 'firebase-admin';

// Check if there's already an initialized app
const getAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  // Check that all required environment variables are present before initializing
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.warn(
      'Firebase Admin SDK credentials are not fully set in environment variables. Server-side Firebase features will be unavailable.'
    );
    return null; // Return null if configuration is incomplete
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
    // Do not re-throw, allow the app to run without admin features if initialization fails.
    return null;
  }
};


export const getFirebaseAdmin = (): typeof admin | undefined => {
  const app = getAdminApp();
  if (!app) {
    return undefined;
  }
  return admin;
};
