
import * as admin from 'firebase-admin';

const getServiceAccount = () => {
  if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn(
      'Firebase Admin SDK credentials are not set in environment variables. Server-side Firebase features will not be available.'
    );
    return undefined;
  }

  return {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  } as admin.ServiceAccount;
};

let adminInstance: typeof admin | undefined;

export const getFirebaseAdmin = (): typeof admin | undefined => {
  if (adminInstance) {
    return adminInstance;
  }

  if (admin.apps.length > 0) {
    adminInstance = admin;
    return adminInstance;
  }
  
  try {
    const serviceAccount = getServiceAccount();
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized successfully.');
      adminInstance = admin;
      return adminInstance;
    } else {
      // If service account is not available, we don't initialize and dependent features will be disabled.
      return undefined;
    }
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error.message);
    // Do not throw, allow the app to run without admin features.
    return undefined;
  }
};
