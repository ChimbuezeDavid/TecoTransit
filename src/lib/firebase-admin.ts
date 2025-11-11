
import * as admin from 'firebase-admin';

// This function now handles both getting the existing app and initializing a new one if needed.
// It's designed to be "lazy" - it only initializes when first called.
export const getFirebaseAdmin = (): typeof admin | undefined => {
  // If the app is already initialized, return it.
  if (admin.apps.length > 0) {
    return admin;
  }

  // If not initialized, prepare credentials.
  const serviceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  // Check that all required environment variables are present before attempting to initialize.
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.warn(
      'Firebase Admin SDK credentials are not fully set in environment variables. Server-side Firebase features will be unavailable.'
    );
    // Return undefined instead of crashing the server.
    return undefined;
  }

  // Initialize the app and return the admin instance.
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    return admin;
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
    // Return undefined if initialization fails.
    return undefined;
  }
};
