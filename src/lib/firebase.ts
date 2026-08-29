import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  signInAnonymously,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Remove global tasks scope. Only basic profile/email is requested by default.

// Initialize Firestore
export const firestoreDatabaseId = (firebaseConfigJson as any).firestoreDatabaseId || "(default)";
export const db: Firestore = getFirestore(app, firestoreDatabaseId);

let cachedTasksToken: string | null = null;

// Listen for auth state
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedTasksToken = null;
  }
});

export async function loginWithGoogle(): Promise<{user: User}> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return { user: result.user };
}

export async function connectGoogleTasks(): Promise<{accessToken: string}> {
  if (!auth.currentUser) throw new Error("Must be logged in to connect tasks");
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/tasks');
  
  // Use login_hint to prevent "select account" when they are already logged in
  if (auth.currentUser.email) {
    provider.setCustomParameters({ login_hint: auth.currentUser.email });
  }

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential && credential.accessToken) {
    cachedTasksToken = credential.accessToken;
    // We should probably save that the user has tasks enabled
  }
  return { accessToken: cachedTasksToken || '' };
}

export async function disconnectGoogleTasks(): Promise<void> {
  cachedTasksToken = null;
}

export async function getAccessToken(): Promise<string | null> {
  if (cachedTasksToken) return cachedTasksToken;
  
  // Do not automatically trigger a popup here if we don't have the token.
  // The UI should handle "Connect Google Tasks".
  return null;
}

export async function loginAsGuest(): Promise<User> {
  const result = await signInAnonymously(auth);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
}
