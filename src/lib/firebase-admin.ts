import * as admin from 'firebase-admin';

// Check if the service account credentials are available
if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      'Firebase Admin SDK credentials are not set. Server-side Firebase features will not work.'
    );
  } else {
    // In development, it's helpful to have a more explicit error.
    // In production (like Vercel), these might be set directly in the environment.
    console.log('Firebase Admin SDK credentials not found in environment variables.');
  }
}

const serviceAccount: admin.ServiceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // The private key is often stored with escaped newlines, so we replace them.
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

/**
 * A utility function to get the initialized Firebase Admin SDK instance.
 *
 * This function initializes the app only if it hasn't been initialized yet,
 * preventing "already exists" errors during Next.js hot-reloads in development.
 *
 * @returns The Firebase Admin SDK instance.
 */
export const getFirebaseAdmin = () => {
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error: any) {
      console.error('Firebase admin initialization error:', error.stack);
      // Re-throw or handle as needed. For now, just logging.
    }
  }
  return admin;
};
