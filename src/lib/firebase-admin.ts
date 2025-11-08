import * as admin from 'firebase-admin';

const getServiceAccount = () => {
  // Check if the service account credentials are available at runtime
  if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        'Firebase Admin SDK credentials are not set. Server-side Firebase features will not work.'
      );
    }
    // Return undefined or a partial object to let the credential creation fail clearly
    return undefined;
  }

  return {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // The private key is often stored with escaped newlines, so we replace them.
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  } as admin.ServiceAccount;
};


/**
 * A utility function to get the initialized Firebase Admin SDK instance.
 *
 * This function initializes the app only if it hasn't been initialized yet,
 * preventing "already exists" errors during Next.js hot-reloads in development.
 * This is "lazy initialization" - it only happens when the function is first called.
 *
 * @returns The Firebase Admin SDK instance.
 */
export const getFirebaseAdmin = () => {
  if (!admin.apps.length) {
    try {
      const serviceAccount = getServiceAccount();
      if (serviceAccount) {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          console.log('Firebase Admin SDK initialized successfully.');
      } else {
        // This will be caught by the try-catch block
        throw new Error('Firebase Admin service account credentials are not available in environment variables.');
      }
    } catch (error: any) {
      console.error('Firebase admin initialization error:', error.message);
      // Depending on the desired behavior, you might want to re-throw the error
      // or handle it gracefully. For now, we log it, but server actions will likely fail.
    }
  }
  return admin;
};
