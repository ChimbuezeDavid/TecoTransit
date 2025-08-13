import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDprY5MSpQNjwaCe2RQrj0SOXqVV4R5_y4",
  authDomain: "routewise-t6cdq.firebaseapp.com",
  projectId: "routewise-t6cdq",
  storageBucket: "routewise-t6cdq.firebasestorage.app",
  messagingSenderId: "865183549077",
  appId: "1:865183549077:web:856d0c5d5c0d119098fd9c",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
